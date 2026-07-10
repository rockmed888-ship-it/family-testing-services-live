(function () {
  const ADMIN_KEY = "fts_admin_auth";
  const ADMIN_PASSWORD = window.__FTS_ADMIN_PASSWORD__ || "";

  window.FTSAdmin = {
    login(password) {
      if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem(ADMIN_KEY, "1");
        return true;
      }
      return false;
    },
    logout() {
      sessionStorage.removeItem(ADMIN_KEY);
      window.location.href = "index.html";
    },
    isAuthed() {
      return sessionStorage.getItem(ADMIN_KEY) === "1";
    },
    requireAuth(redirect) {
      if (!this.isAuthed()) {
        window.location.href = redirect || "index.html";
        return false;
      }
      return true;
    },
    getPassword() {
      return ADMIN_PASSWORD;
    },
    authHeaders() {
      return { "x-admin-password": ADMIN_PASSWORD };
    }
  };
})();
