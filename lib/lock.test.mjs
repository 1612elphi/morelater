// node --test lib/lock.test.mjs   (node >= 22.18 strips the types from lock.ts)
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import Database from "better-sqlite3";
import { createLock } from "./lock.ts";

const ORIGIN = "http://ml.test";
const ENV = { MORELATER_PASSWORD: "hunter2", MORELATER_KEYS: "⌘☿" };
const mk = (env = ENV, db = new Database(":memory:")) => createLock(db, env, 0);
const req = (path, init = {}) =>
  new Request(ORIGIN + path, { ...init, headers: { host: "ml.test", ...init.headers } });
// what proxy.ts does
const call = async (lock, r) => lock.gate(r) ?? (await lock.route(r));
const post = (path, body, headers = {}) =>
  req(path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const form = (body) =>
  req("/oauth/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body).toString() });

async function login(lock) {
  const res = await call(lock, post("/api/session", { password: "hunter2", keys: ["☿", "⌘"] }));
  assert.equal(res.status, 200);
  return res.headers.get("set-cookie").split(";")[0];
}

test("no password: everything passes", () => {
  const lock = mk({});
  assert.equal(lock.gate(req("/api/chips")), null);
  assert.equal(lock.unlocked(req("/")), true);
});

test("a public url without a password refuses to start", () => {
  assert.throws(() => mk({ MORELATER_PUBLIC_URL: "https://x.test" }));
});

test("locked: api and mcp answer 401, calendar feed and session stay open", () => {
  const lock = mk();
  assert.equal(lock.gate(req("/api/chips")).status, 401);
  assert.equal(lock.gate(req("/api/chips/x", { method: "DELETE" })).status, 401);
  const mcp = lock.gate(req("/mcp", { method: "POST" }));
  assert.equal(mcp.status, 401);
  assert.match(mcp.headers.get("www-authenticate"), /resource_metadata="http:\/\/ml\.test\/\.well-known\/oauth-protected-resource"/);
  assert.equal(lock.gate(req("/api/calendar.ics")), null);
  assert.equal(lock.gate(req("/api/session")), null);
  assert.equal(lock.gate(req("/api/calendar.icsx")).status, 401);
  assert.equal(lock.unlocked(req("/")), false);
});

test("login needs the password and exactly the right keys, in any order", async () => {
  const lock = mk();
  for (const body of [
    { password: "hunter2", keys: ["☿"] },
    { password: "hunter2", keys: ["☿", "⌘", "♄"] },
    { password: "wrong", keys: ["☿", "⌘"] },
    { password: "hunter2", keys: "☿⌘" },
    {},
  ])
    assert.equal((await call(lock, post("/api/session", body))).status, 401);
  const cookie = await login(lock);
  assert.equal(lock.gate(req("/api/chips", { headers: { cookie } })), null);
  assert.equal(lock.unlocked(req("/", { headers: { cookie } })), true);
  assert.equal(lock.gate(req("/api/chips", { headers: { cookie: "morelater_session=nope" } })).status, 401);
});

test("cross-site writes are refused even with a session", async () => {
  const lock = mk();
  const cookie = await login(lock);
  assert.equal(lock.gate(post("/api/chips", {}, { cookie, origin: "https://evil.test" })).status, 403);
  assert.equal(lock.gate(post("/api/chips", {}, { cookie, "sec-fetch-site": "cross-site" })).status, 403);
  assert.equal(lock.gate(post("/api/chips", {}, { cookie, origin: ORIGIN })), null);
});

test("changing the keys revokes sessions", async () => {
  const db = new Database(":memory:");
  const cookie = await login(mk(ENV, db));
  assert.equal(mk(ENV, db).unlocked(req("/", { headers: { cookie } })), true);
  assert.equal(mk({ ...ENV, MORELATER_KEYS: "⌘" }, db).unlocked(req("/", { headers: { cookie } })), false);
});

test("oauth: register, approve, token, refresh rotation, reuse revokes", async () => {
  const lock = mk();
  const redirect = "https://client.test/cb";
  const reg = await call(lock, post("/oauth/register", { client_name: "Test", redirect_uris: [redirect] }));
  assert.equal(reg.status, 201);
  const { client_id } = await reg.json();
  assert.equal((await call(lock, post("/oauth/register", { redirect_uris: ["http://evil.test/cb"] }))).status, 400);

  const verifier = "v".repeat(50);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorize = (extra = {}) =>
    call(lock, req("/oauth/authorize?" + new URLSearchParams({
      client_id, redirect_uri: redirect, response_type: "code", state: "s",
      code_challenge: challenge, code_challenge_method: "S256", ...extra,
    })));
  assert.equal((await authorize({ redirect_uri: "https://other.test/cb" })).status, 400);
  const res = await authorize();
  assert.equal(res.status, 302);
  const request = new URL(res.headers.get("location"), ORIGIN).searchParams.get("request");

  // approval needs a browser session
  assert.equal((await call(lock, post("/api/oauth/approve", { request }))).status, 401);
  const cookie = await login(lock);
  const info = await call(lock, req(`/api/oauth/requests/${request}`, { headers: { cookie } }));
  assert.deepEqual(await info.json(), { client: "Test", redirect: "client.test" });
  const approved = await call(lock, post("/api/oauth/approve", { request }, { cookie }));
  const back = new URL((await approved.json()).redirect);
  assert.equal(back.origin + back.pathname, redirect);
  assert.equal(back.searchParams.get("state"), "s");
  const code = back.searchParams.get("code");

  const grant = { grant_type: "authorization_code", client_id, redirect_uri: redirect, code };
  assert.equal((await call(lock, form({ ...grant, code_verifier: "wrong" }))).status, 400);
  // the failed attempt burned the code
  assert.equal((await call(lock, form({ ...grant, code_verifier: verifier }))).status, 400);

  const res2 = await authorize();
  const request2 = new URL(res2.headers.get("location"), ORIGIN).searchParams.get("request");
  const code2 = new URL((await (await call(lock, post("/api/oauth/approve", { request: request2 }, { cookie }))).json()).redirect).searchParams.get("code");
  const tok = await (await call(lock, form({ ...grant, code: code2, code_verifier: verifier }))).json();
  assert.ok(tok.access_token && tok.refresh_token);

  const bearer = (t) => ({ authorization: `Bearer ${t}` });
  assert.equal(lock.gate(req("/mcp", { method: "POST", headers: bearer(tok.access_token) })), null);
  assert.equal(lock.gate(req("/api/chips", { headers: bearer(tok.access_token) })), null);
  assert.equal(lock.gate(req("/api/chips", { headers: bearer(tok.refresh_token) })).status, 401);
  // a token cannot approve further clients
  assert.equal((await call(lock, post("/api/oauth/approve", { request: "x" }, bearer(tok.access_token)))).status, 403);

  const refresh = { grant_type: "refresh_token", client_id, refresh_token: tok.refresh_token };
  const tok2 = await (await call(lock, form(refresh))).json();
  assert.equal(lock.gate(req("/api/chips", { headers: bearer(tok2.access_token) })), null);
  // replaying the old refresh token revokes the whole grant
  assert.equal((await call(lock, form(refresh))).status, 400);
  assert.equal(lock.gate(req("/api/chips", { headers: bearer(tok2.access_token) })).status, 401);
});
