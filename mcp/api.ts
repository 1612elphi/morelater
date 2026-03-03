/** HTTP client wrapper for the MoreLater Next.js API. */
export class MoreLaterAPI {
  constructor(private baseUrl: string) {}

  private async request(path: string, init?: RequestInit) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json();
  }

  // -- Chips --

  listChips(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    unscheduled?: boolean;
  }) {
    const sp = new URLSearchParams();
    if (params?.startDate) sp.set("startDate", params.startDate);
    if (params?.endDate) sp.set("endDate", params.endDate);
    if (params?.status) sp.set("status", params.status);
    if (params?.unscheduled) sp.set("unscheduled", "true");
    const qs = sp.toString();
    return this.request(`/api/chips${qs ? `?${qs}` : ""}`);
  }

  getChip(id: string) {
    return this.request(`/api/chips/${id}`);
  }

  createChip(data: Record<string, unknown>) {
    return this.request("/api/chips", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateChip(id: string, data: Record<string, unknown>) {
    return this.request(`/api/chips/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteChip(id: string) {
    return this.request(`/api/chips/${id}`, { method: "DELETE" });
  }

  // -- Colours --

  listColours() {
    return this.request("/api/colours");
  }

  // -- Day Tags --

  listDayTags(params?: { startDate?: string; endDate?: string }) {
    const sp = new URLSearchParams();
    if (params?.startDate) sp.set("startDate", params.startDate);
    if (params?.endDate) sp.set("endDate", params.endDate);
    const qs = sp.toString();
    return this.request(`/api/day-tags${qs ? `?${qs}` : ""}`);
  }

  createDayTag(date: string, tagTypeId: string) {
    return this.request("/api/day-tags", {
      method: "POST",
      body: JSON.stringify({ date, tagTypeId }),
    });
  }

  deleteDayTag(id: string) {
    return this.request(`/api/day-tags/${id}`, { method: "DELETE" });
  }

  // -- Day Tag Types --

  listDayTagTypes() {
    return this.request("/api/day-tag-types");
  }
}
