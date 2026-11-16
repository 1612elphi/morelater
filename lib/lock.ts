import type { Database } from "better-sqlite3";
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

// Port of Godfile's lock (godfile/server/lock.ts), itself a port of Pytho's
// (server/semiotics.go, server/oauth.go). Config is env only:
// MORELATER_PASSWORD, MORELATER_KEYS, MORELATER_PUBLIC_URL.
export const KEYS = ["☿", "♄", "⚶", "⚷", "⚸", "⛢", "☊", "☋", "☍", "⌬", "⍟", "⏃", "⏚", "⟁", "⟟", "⌘", "⍜", "⎔"];

const COOKIE = "morelater_session";
const SESSION_S = 30 * 86400;
const ACCESS_S = 3600;
const REFRESH_S = 90 * 86400;
const CLIENT_UNUSED_S = 90 * 86400;
const CODE_MS = 60_000;
const REQUEST_MS = 600_000;
const MAX_CLIENTS = 200;
const MAX_PENDING = 100;
const MAX_BODY = 64 << 10;

// The calendar feed is subscribed to by clients that cannot log in.
const OPEN_API = ["/api/session", "/api/calendar.ics"];

const sha = (s: string) => createHash("sha256").update(s).digest();
const same = (a: string, b: string) => timingSafeEqual(sha(a), sha(b));
const secureToken = () => randomBytes(32).toString("base64url");
const nowS = () => Math.floor(Date.now() / 1000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });

// sorted, deduplicated, concatenated
export function canonicalKeys(keys: unknown): string | null {
  if (!Array.isArray(keys) || !keys.every((k) => KEYS.includes(k))) return null;
  return [...new Set(keys as string[])].sort().join("");
}

const loopback = (u: URL) => u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);

const parse = (raw: string) => {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
};

export function validRedirect(raw: string): boolean {
  const u = parse(raw);
  return !!u && raw.length <= 2000 && u.host !== "" && !u.username && !u.password && !raw.includes("#") && (u.protocol === "https:" || loopback(u));
}

// rfc 8252 §7.3: any port on loopback
export function redirectMatches(registered: string[], raw: string): boolean {
  const u = parse(raw);
  if (!u) return false;
  return registered.some((reg) => {
    if (reg === raw) return true;
    const g = parse(reg);
    return !!g && loopback(g) && loopback(u) && g.hostname === u.hostname && g.pathname === u.pathname && g.search === u.search && !u.username && !u.password && !raw.includes("#");
  });
}

function withQuery(raw: string, params: Record<string, string>): string {
  const u = new URL(raw);
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  return u.toString();
}

const oauthError = (status: number, error: string, description: string) => json({ error, error_description: description }, status);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

function errorPage(msg: string): Response {
  const esc = msg.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return new Response(`<!doctype html><meta charset=utf-8><title>More Later</title><p>${esc}</p>\n`, {
    status: 400,
    headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'" },
  });
}

type AuthRequest = {
  clientId: string;
  clientName: string;
  redirect: string;
  state: string;
  challenge: string;
  expires: number;
};

// ponytail: in memory, a restart drops pending approvals and codes
function take(m: Map<string, AuthRequest>, id: string): AuthRequest | null {
  const v = m.get(id);
  m.delete(id);
  return v && Date.now() <= v.expires ? v : null;
}

function sweep(m: Map<string, AuthRequest>) {
  const t = Date.now();
  for (const [k, v] of m) if (t > v.expires) m.delete(k);
}

type Env = Record<string, string | undefined>;

export function createLock(db: Database, env: Env = process.env, failDelayMs = 1000) {
  const password = env.MORELATER_PASSWORD || null;
  const keys = canonicalKeys([...(env.MORELATER_KEYS ?? "")]);
  if (keys === null) throw new Error(`MORELATER_KEYS may only contain ${KEYS.join(" ")}`);
  const publicUrl = env.MORELATER_PUBLIC_URL?.replace(/\/+$/, "") || null;
  // A public URL means the tunnel points here: never serve it unlocked.
  if (publicUrl && !password) throw new Error("MORELATER_PUBLIC_URL is set but MORELATER_PASSWORD is not: refusing to run unlocked");

  const run = (sql: string, ...args: unknown[]) => db.prepare(sql).run(...args);
  const get = <T>(sql: string, ...args: unknown[]) => db.prepare(sql).get(...args) as T | undefined;

  run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value BLOB NOT NULL)");
  run("INSERT OR IGNORE INTO settings (key, value) VALUES ('session_secret', ?)", randomBytes(32));
  const secret = get<{ value: Buffer }>("SELECT value FROM settings WHERE key = 'session_secret'")!.value;
  run("CREATE TABLE IF NOT EXISTS sessions (hash BLOB PRIMARY KEY, lock BLOB NOT NULL, expires_at INTEGER NOT NULL)");
  run(`CREATE TABLE IF NOT EXISTS oauth_clients (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    redirect_uris TEXT NOT NULL,
    created_at    INTEGER NOT NULL,
    used_at       INTEGER NOT NULL
  )`);
  run(`CREATE TABLE IF NOT EXISTS oauth_tokens (
    hash       BLOB PRIMARY KEY,
    client_id  TEXT NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    grant_id   BLOB NOT NULL,
    refresh    INTEGER NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0,
    lock       BLOB NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`);

  // Changing the password or keys changes the lock id, which revokes every session and token.
  const lock = password ? pbkdf2Sync(`${password}\0${keys}`, secret, 600_000, 32, "sha256") : Buffer.alloc(0);
  run("DELETE FROM sessions WHERE lock != ?", lock);
  run("DELETE FROM oauth_tokens WHERE lock != ?", lock);

  const pending = new Map<string, AuthRequest>();
  const codes = new Map<string, AuthRequest>();
  // held through the failure delay
  let attempting = false;

  const cookieValue = (req: Request) => /(?:^|;\s*)morelater_session=([^;]+)/.exec(req.headers.get("cookie") ?? "")?.[1] ?? null;
  const https = (req: Request) => req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:";
  const base = (req: Request) => publicUrl ?? `${https(req) ? "https" : "http"}://${req.headers.get("host") ?? new URL(req.url).host}`;
  const exists = (sql: string, ...args: unknown[]) => get(sql, ...args) !== undefined;

  const hasSession = (req: Request) => {
    const id = cookieValue(req);
    return !!id && exists("SELECT 1 FROM sessions WHERE hash = ? AND lock = ? AND expires_at > ?", sha(id), lock, nowS());
  };

  const validAccess = (bearer: string) =>
    exists("SELECT 1 FROM oauth_tokens WHERE hash = ? AND refresh = 0 AND lock = ? AND expires_at > ?", sha(bearer), lock, nowS());

  const unlocked = (req: Request) => {
    if (!password || hasSession(req)) return true;
    const bearer = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "")?.[1];
    return !!bearer && validAccess(bearer);
  };

  // browser session, never bearer
  const browser = (req: Request) => !req.headers.get("authorization") && (!password || hasSession(req));

  const setCookie = (req: Request, value: string, maxAge: number) =>
    `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${https(req) ? "; Secure" : ""}`;

  const client = (id: string) => {
    const row = get<{ name: string; redirect_uris: string }>("SELECT name, redirect_uris FROM oauth_clients WHERE id = ?", id);
    return row ? { name: row.name, uris: JSON.parse(row.redirect_uris) as string[] } : null;
  };

  async function login(req: Request): Promise<Response> {
    const body = (await req.json().catch(() => ({}))) as { password?: unknown; keys?: unknown };
    if (attempting) return json({ error: "busy" }, 429);
    attempting = true;
    try {
      if (!password) return json(null);
      const given = canonicalKeys(body.keys);
      const ok = same(String(body.password ?? ""), password);
      if (given === null || !ok || !same(given, keys!)) {
        await sleep(failDelayMs);
        return json({ error: "no" }, 401);
      }
      const id = secureToken();
      const t = nowS();
      run("DELETE FROM sessions WHERE expires_at <= ?", t);
      run("INSERT INTO sessions (hash, lock, expires_at) VALUES (?, ?, ?)", sha(id), lock, t + SESSION_S);
      return json(null, 200, { "Set-Cookie": setCookie(req, id, SESSION_S) });
    } finally {
      attempting = false;
    }
  }

  async function register(req: Request): Promise<Response> {
    let body: { client_name?: unknown; redirect_uris?: unknown };
    try {
      const text = await req.text();
      if (text.length > MAX_BODY) throw new Error("too large");
      body = JSON.parse(text);
    } catch {
      return oauthError(400, "invalid_client_metadata", "bad json");
    }
    const uris = body?.redirect_uris;
    if (!Array.isArray(uris) || uris.length === 0 || uris.length > 10)
      return oauthError(400, "invalid_redirect_uri", "1 to 10 redirect_uris required");
    for (const u of uris)
      if (typeof u !== "string" || !validRedirect(u)) return oauthError(400, "invalid_redirect_uri", `https or http loopback only: ${u}`);
    const name = [...String(body.client_name ?? "").trim()].slice(0, 100).join("") || "Unnamed client";
    const t = nowS();
    const id = randomBytes(16).toString("hex");
    run("DELETE FROM oauth_clients WHERE used_at < ?", t - CLIENT_UNUSED_S);
    // evict never-approved clients first
    run(
      "DELETE FROM oauth_clients WHERE id IN (SELECT id FROM oauth_clients c WHERE NOT EXISTS (SELECT 1 FROM oauth_tokens t WHERE t.client_id = c.id) ORDER BY created_at LIMIT max(0, (SELECT COUNT(*) FROM oauth_clients) - ?))",
      MAX_CLIENTS - 1,
    );
    const res = run(
      "INSERT INTO oauth_clients (id, name, redirect_uris, created_at, used_at) SELECT ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM oauth_clients) < ?",
      id, name, JSON.stringify(uris), t, t, MAX_CLIENTS,
    );
    if (res.changes === 0) return oauthError(503, "temporarily_unavailable", "too many clients");
    return json(
      {
        client_id: id,
        client_id_issued_at: t,
        client_name: name,
        redirect_uris: uris,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      },
      201,
      CORS,
    );
  }

  const resourceOk = (req: Request, res: string) => {
    const r = res.replace(/\/$/, "");
    return r === "" || r === `${base(req)}/mcp` || r === base(req);
  };

  function authorize(req: Request): Response {
    const q = new URL(req.url).searchParams;
    const clientId = q.get("client_id") ?? "";
    const redirect = q.get("redirect_uri") ?? "";
    const state = q.get("state") ?? "";
    const c = client(clientId);
    if (!c) return errorPage("unknown client_id");
    if (!redirectMatches(c.uris, redirect)) return errorPage("unregistered redirect_uri");
    const to = (Location: string) => new Response(null, { status: 302, headers: { Location } });
    const fail = (error: string, description: string) => to(withQuery(redirect, { error, error_description: description, state }));
    const challenge = q.get("code_challenge") ?? "";
    if (q.get("response_type") !== "code") return fail("unsupported_response_type", "code only");
    if (q.get("code_challenge_method") !== "S256" || challenge.length !== 43) return fail("invalid_request", "pkce S256 required");
    if (!resourceOk(req, q.get("resource") ?? "")) return fail("invalid_target", "unknown resource");
    sweep(pending);
    if (pending.size >= MAX_PENDING) return fail("temporarily_unavailable", "too many pending requests");
    const id = randomBytes(16).toString("hex");
    pending.set(id, { clientId, clientName: c.name, redirect, state, challenge, expires: Date.now() + REQUEST_MS });
    // absolute: Next rejects a relative Location from the proxy
    return to(`${base(req)}/connect?request=${id}`);
  }

  async function decide(req: Request, allow: boolean): Promise<Response> {
    const body = (await req.json().catch(() => ({}))) as { request?: unknown };
    if (!browser(req)) return json({ error: "session required" }, 403);
    const p = take(pending, String(body.request ?? ""));
    if (!p) return json({ error: "not found" }, 404);
    if (!allow) return json({ redirect: withQuery(p.redirect, { error: "access_denied", state: p.state }) });
    const code = randomBytes(16).toString("hex");
    sweep(codes);
    codes.set(code, { ...p, expires: Date.now() + CODE_MS });
    return json({ redirect: withQuery(p.redirect, { code, state: p.state }) });
  }

  async function token(req: Request): Promise<Response> {
    const text = await req.text();
    if (text.length > MAX_BODY) return oauthError(400, "invalid_request", "body too large");
    const f = new URLSearchParams(text);
    const clientId = f.get("client_id") ?? "";
    const invalid = (d: string) => oauthError(400, "invalid_grant", d);
    if (!client(clientId)) return oauthError(401, "invalid_client", "unknown client_id");
    let grant: Uint8Array;
    switch (f.get("grant_type")) {
      case "authorization_code": {
        const c = take(codes, f.get("code") ?? "");
        if (!c) return invalid("unknown or used code");
        if (c.clientId !== clientId || c.redirect !== f.get("redirect_uri")) return invalid("client or redirect_uri mismatch");
        if (!same(createHash("sha256").update(f.get("code_verifier") ?? "").digest("base64url"), c.challenge)) return invalid("pkce mismatch");
        if (!resourceOk(req, f.get("resource") ?? "")) return oauthError(400, "invalid_target", "unknown resource");
        grant = randomBytes(16);
        break;
      }
      case "refresh_token": {
        const h = sha(f.get("refresh_token") ?? "");
        const row = get<{ client_id: string; grant_id: Buffer; lock: Buffer; expires_at: number }>(
          "UPDATE oauth_tokens SET used = 1 WHERE hash = ? AND refresh = 1 AND used = 0 RETURNING client_id, grant_id, lock, expires_at",
          h,
        );
        if (!row) {
          // reuse revokes the grant
          run("DELETE FROM oauth_tokens WHERE grant_id = (SELECT grant_id FROM oauth_tokens WHERE hash = ? AND refresh = 1)", h);
          return invalid("unknown or used refresh_token");
        }
        if (row.client_id !== clientId || !row.lock.equals(lock) || row.expires_at <= nowS()) return invalid("refresh_token not valid");
        grant = row.grant_id;
        break;
      }
      default:
        return oauthError(400, "unsupported_grant_type", "authorization_code or refresh_token");
    }
    const access = secureToken();
    const refresh = secureToken();
    const t = nowS();
    run("DELETE FROM oauth_tokens WHERE expires_at <= ?", t);
    run(
      "INSERT INTO oauth_tokens (hash, client_id, grant_id, refresh, lock, created_at, expires_at) VALUES (?, ?, ?, 0, ?, ?, ?), (?, ?, ?, 1, ?, ?, ?)",
      sha(access), clientId, grant, lock, t, t + ACCESS_S, sha(refresh), clientId, grant, lock, t, t + REFRESH_S,
    );
    run("UPDATE oauth_clients SET used_at = ? WHERE id = ?", t, clientId);
    return json({ access_token: access, token_type: "Bearer", expires_in: ACCESS_S, refresh_token: refresh }, 200, CORS);
  }

  const resourceMeta = (req: Request) =>
    json({ resource: `${base(req)}/mcp`, authorization_servers: [base(req)], bearer_methods_supported: ["header"] }, 200, CORS);

  const serverMeta = (req: Request) => {
    const b = base(req);
    return json(
      {
        issuer: b,
        authorization_endpoint: `${b}/oauth/authorize`,
        token_endpoint: `${b}/oauth/token`,
        registration_endpoint: `${b}/oauth/register`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none"],
      },
      200,
      CORS,
    );
  };

  const PUBLIC: Record<string, [string, (req: Request) => Response | Promise<Response>]> = {
    "/.well-known/oauth-protected-resource": ["GET", resourceMeta],
    "/.well-known/oauth-protected-resource/mcp": ["GET", resourceMeta],
    "/.well-known/oauth-authorization-server": ["GET", serverMeta],
    "/oauth/register": ["POST", register],
    "/oauth/token": ["POST", token],
  };

  // Lock and OAuth endpoints; null for every other request.
  function route(req: Request): Response | Promise<Response> | null {
    const p = new URL(req.url).pathname;
    const m = req.method;
    const pub = PUBLIC[p];
    if (pub) {
      if (m === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": pub[0] } });
      return m === pub[0] ? pub[1](req) : json({ error: "method not allowed" }, 405);
    }
    if (p === "/oauth/authorize" && m === "GET") return authorize(req);
    if (p === "/api/session") {
      if (m === "GET") return json({ required: !!password, authenticated: unlocked(req), keys: KEYS });
      if (m === "POST") return login(req);
      if (m === "DELETE") {
        const id = cookieValue(req);
        if (id) run("DELETE FROM sessions WHERE hash = ?", sha(id));
        return new Response(null, { status: 204, headers: { "Set-Cookie": setCookie(req, "", 0) } });
      }
    }
    const r = /^\/api\/oauth\/requests\/([^/]+)$/.exec(p);
    if (r && m === "GET") {
      if (!browser(req)) return json({ error: "session required" }, 403);
      const pr = pending.get(r[1]);
      if (!pr || Date.now() > pr.expires) return json({ error: "not found" }, 404);
      return json({ client: pr.clientName, redirect: new URL(pr.redirect).host });
    }
    if (p === "/api/oauth/approve" && m === "POST") return decide(req, true);
    if (p === "/api/oauth/deny" && m === "POST") return decide(req, false);
    return null;
  }

  // Cross-site writes and locked /api or /mcp get a response; null passes.
  function gate(req: Request): Response | null {
    const url = new URL(req.url);
    const p = url.pathname;
    const unsafe = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    if (unsafe && p !== "/oauth/register" && p !== "/oauth/token") {
      const site = req.headers.get("sec-fetch-site");
      const origin = req.headers.get("origin");
      const host = req.headers.get("host") ?? url.host;
      if (site === "cross-site" || site === "same-site" || (origin && parse(origin)?.host !== host))
        return json({ error: "cross-site request" }, 403);
    }
    if ((p === "/mcp" || (p.startsWith("/api/") && !OPEN_API.includes(p))) && !unlocked(req)) {
      const bearer = !!req.headers.get("authorization");
      const headers: Record<string, string> = {};
      if (p === "/mcp" || bearer)
        headers["WWW-Authenticate"] =
          `Bearer resource_metadata="${base(req)}/.well-known/oauth-protected-resource"${bearer ? ', error="invalid_token"' : ""}`;
      return json({ error: "locked" }, 401, headers);
    }
    return null;
  }

  return { route, gate, unlocked, required: !!password };
}
