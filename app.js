(() => {
  const data = window.ENDOWMENTS || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);

  const formatAUM = (n) => {
    if (n == null) return "\u2014";
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    return `$${n.toLocaleString()}`;
  };

  const formatFees = (n) => {
    if (n == null) return "\u2014";
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
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

  const yesNo = (v) => (v === true ? "yes" : v === false ? "no" : "unknown");

  // ---------- RFPs tab ----------

  const rfpEls = {
    search: document.getElementById("rfp-search"),
    aum: document.getElementById("rfp-aum-filter"),
    status: document.getElementById("rfp-status-filter"),
    discretion: document.getElementById("rfp-discretion-filter"),
    tbody: document.getElementById("rfp-tbody"),
    count: document.getElementById("rfp-count"),
    empty: document.getElementById("rfp-empty-state"),
    headers: document.querySelectorAll("#rfp-table th.sortable"),
  };
  const rfpState = { sortKey: "aum", sortDir: "desc" };

  const rfpSortValue = (r, key) => {
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

  const renderRfps = () => {
    const query = rfpEls.search.value.trim().toLowerCase();
    const range = rfpEls.aum.value;
    const statusSel = rfpEls.status.value;
    const discretionSel = rfpEls.discretion.value;

    let rows = data.filter((r) => {
      const matchesSearch = !query || r.name.toLowerCase().includes(query);
      const matchesRange = inAumRange(r.aum, range);
      const matchesStatus = statusSel === "all" || statusOf(r.deadline) === statusSel;
      const matchesDiscretion =
        discretionSel === "all" || (r.discretion || "unknown") === discretionSel;
      return matchesSearch && matchesRange && matchesStatus && matchesDiscretion;
    });

    rows.sort((a, b) => {
      const { sortKey, sortDir } = rfpState;
      const av = rfpSortValue(a, sortKey);
      const bv = rfpSortValue(b, sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp;
      if (typeof av === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

    rfpEls.count.textContent = rows.length;
    rfpEls.tbody.innerHTML = "";
    rfpEls.empty.hidden = rows.length > 0;

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
        <td>${
          r.rfpUrl
            ? `<a class="rfp-link" href="${escapeHtml(r.rfpUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.rfpTitle || "View RFP")} \u2197</a>`
            : `<span class="rfp-missing">${escapeHtml(r.rfpTitle || "No link available")}</span>`
        }</td>
      `;
      rfpEls.tbody.appendChild(tr);
    }

    rfpEls.headers.forEach((h) => {
      h.classList.remove("sort-asc", "sort-desc");
      if (h.dataset.sort === rfpState.sortKey) {
        h.classList.add(rfpState.sortDir === "asc" ? "sort-asc" : "sort-desc");
      }
    });
  };

  rfpEls.headers.forEach((h) => {
    h.addEventListener("click", () => {
      const key = h.dataset.sort;
      if (rfpState.sortKey === key) {
        rfpState.sortDir = rfpState.sortDir === "asc" ? "desc" : "asc";
      } else {
        rfpState.sortKey = key;
        rfpState.sortDir = key === "aum" || key === "deadline" ? "desc" : "asc";
      }
      renderRfps();
    });
  });

  rfpEls.search.addEventListener("input", renderRfps);
  rfpEls.aum.addEventListener("change", renderRfps);
  rfpEls.status.addEventListener("change", renderRfps);
  rfpEls.discretion.addEventListener("change", renderRfps);

  // ---------- Organizations tab ----------

  const normalizeName = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[\u2014\u2013]/g, "-")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  // Merge ORGANIZATIONS (ProPublica-scraped) with orgs that only appear in the RFP dataset.
  // Also derive existingIM=true whenever an org has a matching RFP.
  const orgs = (() => {
    const map = new Map();
    const baseOrgs = window.ORGANIZATIONS || [];
    for (const o of baseOrgs) {
      map.set(normalizeName(o.name), { ...o });
    }
    for (const r of data) {
      const key = normalizeName(r.name);
      if (!map.has(key)) {
        map.set(key, {
          name: r.name,
          type: r.type,
          description: r.description,
          aum: r.aum,
          existingIM: true,
          imFees: r.imFees ?? null,
          imProviders: r.imProviders ?? null,
          propublicaUrl: null,
        });
      } else {
        const existing = map.get(key);
        // prefer the richer description from our RFP dataset if present
        if (r.description && r.description.length > (existing.description || "").length) {
          existing.description = r.description;
        }
        // an RFP implies existing IM relationship (or intent to establish one)
        existing.existingIM = true;
      }
    }
    return Array.from(map.values());
  })();

  const orgEls = {
    search: document.getElementById("org-search"),
    aum: document.getElementById("org-aum-filter"),
    existingIM: document.getElementById("org-existing-im-filter"),
    tbody: document.getElementById("org-tbody"),
    count: document.getElementById("org-count"),
    empty: document.getElementById("org-empty-state"),
    headers: document.querySelectorAll("#org-table th.sortable"),
  };
  const orgState = { sortKey: "aum", sortDir: "desc" };

  const orgSortValue = (o, key) => {
    if (key === "existingIM") {
      const order = { true: 0, false: 1, null: 2 };
      return order[String(o.existingIM)];
    }
    return o[key] == null ? null : o[key];
  };

  const renderOrgs = () => {
    const query = orgEls.search.value.trim().toLowerCase();
    const range = orgEls.aum.value;
    const existingSel = orgEls.existingIM.value;

    let rows = orgs.filter((o) => {
      const matchesSearch = !query || o.name.toLowerCase().includes(query);
      const matchesRange = inAumRange(o.aum, range);
      const matchesExisting = existingSel === "all" || yesNo(o.existingIM) === existingSel;
      return matchesSearch && matchesRange && matchesExisting;
    });

    rows.sort((a, b) => {
      const { sortKey, sortDir } = orgState;
      const av = orgSortValue(a, sortKey);
      const bv = orgSortValue(b, sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp;
      if (typeof av === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

    orgEls.count.textContent = rows.length;
    orgEls.tbody.innerHTML = "";
    orgEls.empty.hidden = rows.length > 0;

    for (const o of rows) {
      const existing = yesNo(o.existingIM);
      const providers = Array.isArray(o.imProviders) && o.imProviders.length > 0
        ? o.imProviders.map(escapeHtml).join(", ")
        : "\u2014";
      const nameCell = o.propublicaUrl
        ? `<a class="org-link" href="${escapeHtml(o.propublicaUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(o.name)} \u2197</a>`
        : escapeHtml(o.name);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="org-name">${nameCell}</td>
        <td><span class="type-badge ${typeSlug(o.type)}">${escapeHtml(o.type)}</span></td>
        <td class="description">${escapeHtml(o.description)}</td>
        <td class="aum">${formatAUM(o.aum)}</td>
        <td><span class="yesno-badge yesno-${existing}">${existing}</span></td>
        <td class="fees">${formatFees(o.imFees)}</td>
        <td class="providers">${providers}</td>
      `;
      orgEls.tbody.appendChild(tr);
    }

    orgEls.headers.forEach((h) => {
      h.classList.remove("sort-asc", "sort-desc");
      if (h.dataset.sort === orgState.sortKey) {
        h.classList.add(orgState.sortDir === "asc" ? "sort-asc" : "sort-desc");
      }
    });
  };

  orgEls.headers.forEach((h) => {
    h.addEventListener("click", () => {
      const key = h.dataset.sort;
      if (orgState.sortKey === key) {
        orgState.sortDir = orgState.sortDir === "asc" ? "desc" : "asc";
      } else {
        orgState.sortKey = key;
        orgState.sortDir = key === "aum" || key === "imFees" ? "desc" : "asc";
      }
      renderOrgs();
    });
  });

  orgEls.search.addEventListener("input", renderOrgs);
  orgEls.aum.addEventListener("change", renderOrgs);
  orgEls.existingIM.addEventListener("change", renderOrgs);

  // ---------- Tab switching ----------

  const tabBtns = document.querySelectorAll(".tab-btn");
  const panels = {
    rfps: document.getElementById("tab-rfps"),
    orgs: document.getElementById("tab-orgs"),
  };

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      tabBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });
      Object.entries(panels).forEach(([key, panel]) => {
        panel.hidden = key !== target;
      });
    });
  });

  renderRfps();
  renderOrgs();
})();
