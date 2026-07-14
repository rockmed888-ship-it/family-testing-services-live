(function () {
  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      const error = new Error(payload.error || "Request failed.");
      error.status = response.status;
      error.details = payload.details || [];
      throw error;
    }
    return payload;
  }

  window.FTSAdmin = {
    async login(password) {
      return request("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password })
      });
    },

    async logout() {
      try {
        await request("/api/admin/logout", { method: "POST", body: "{}" });
      } finally {
        window.location.href = "/admin/index.html";
      }
    },

    async isAuthed() {
      try {
        await request("/api/admin/session");
        return true;
      } catch {
        return false;
      }
    },

    async requireAuth(redirect = "/admin/index.html") {
      const authenticated = await this.isAuthed();
      if (!authenticated) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    request
  };
})();
