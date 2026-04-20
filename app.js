(() => {
  const data = window.ENDOWMENTS || [];
  const searchInput = document.getElementById("search");
  const aumFilter = document.getElementById("aum-filter");
  const statusFilter = document.getElementById("status-filter");
  const discretionFilter = document.getElementById("discretion-filter");
  const tbody = document.getElementById("rfp-tbody");
  const countEl = document.getElementById("count");
  const emptyEl = document.getElementById("empty-state");
  const headers = document.querySelectorAll("th.sortable");

  const state = { sortKey: "aum", sortDir: "desc" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatAUM = (n) => {
    if (n == null) return "\u2014";
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    return `$${n.toLocaleString()}`;
  };

  const formatDeadline = (d) => {
    if (!d) return "\u2014";
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const statusOf = (d) => {
    if (!d) return "unknown";
    return new Date(d + "T00:00:00") >= today ? "active" : "past";
  };

  const typeSlug = (t) =>
    "type-" + String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const inAumRange = (aum, range) => {
    if (range === "all") return true;
    if (range === "unknown") return aum == null;
    if (aum == null) return false;
    const [min, max] = range.split("-").map(Number);
    return aum >= min * 1e6 && aum < max * 1e6;
  };

  const sortValue = (r, key) => {
    if (key === "deadline") {
      return r.deadline ? new Date(r.deadline + "T00:00:00").getTime() : null;
    }
    if (key === "status") {
      const order = { active: 0, unknown: 1, past: 2 };
      return order[statusOf(r.deadline)];
    }
    if (key === "discretion") {
      const order = { discretionary: 0, "non-discretionary": 1, both: 2, unknown: 3 };
      return order[r.discretion || "unknown"];
    }
    return r[key] == null ? null : r[key];
  };

  const render = () => {
    const query = searchInput.value.trim().toLowerCase();
    const range = aumFilter.value;
    const statusSel = statusFilter.value;
    const discretionSel = discretionFilter.value;

    let rows = data.filter((r) => {
      const matchesSearch = !query || r.name.toLowerCase().includes(query);
      const matchesRange = inAumRange(r.aum, range);
      const matchesStatus = statusSel === "all" || statusOf(r.deadline) === statusSel;
      const matchesDiscretion = discretionSel === "all" || (r.discretion || "unknown") === discretionSel;
      return matchesSearch && matchesRange && matchesStatus && matchesDiscretion;
    });

    rows.sort((a, b) => {
      const { sortKey, sortDir } = state;
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp;
      if (typeof av === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

    countEl.textContent = rows.length;
    tbody.innerHTML = "";
    emptyEl.hidden = rows.length > 0;

    for (const r of rows) {
      const status = statusOf(r.deadline);
      const discretion = r.discretion || "unknown";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="org-name">${escapeHtml(r.name)}</td>
        <td><span class="type-badge ${typeSlug(r.type)}">${escapeHtml(r.type)}</span></td>
        <td class="description">${escapeHtml(r.description)}</td>
        <td class="aum">${formatAUM(r.aum)}</td>
        <td><span class="discretion-badge discretion-${discretion}">${escapeHtml(discretion)}</span></td>
        <td class="deadline">${formatDeadline(r.deadline)}</td>
        <td><span class="status-badge status-${status}">${status}</span></td>
        <td>${r.rfpUrl
          ? `<a class="rfp-link" href="${escapeHtml(r.rfpUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.rfpTitle || "View RFP")} \u2197</a>`
          : `<span class="rfp-missing">${escapeHtml(r.rfpTitle || "No link available")}</span>`
        }</td>
      `;
      tbody.appendChild(tr);
    }

    headers.forEach((h) => {
      h.classList.remove("sort-asc", "sort-desc");
      if (h.dataset.sort === state.sortKey) {
        h.classList.add(state.sortDir === "asc" ? "sort-asc" : "sort-desc");
      }
    });
  };

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);

  headers.forEach((h) => {
    h.addEventListener("click", () => {
      const key = h.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = key === "aum" || key === "deadline" ? "desc" : "asc";
      }
      render();
    });
  });

  searchInput.addEventListener("input", render);
  aumFilter.addEventListener("change", render);
  statusFilter.addEventListener("change", render);
  discretionFilter.addEventListener("change", render);

  render();
})();
