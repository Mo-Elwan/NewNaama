/**
 * صفحة دليل الخدمات الإلكترونية (مطابقة لـ naama.sa/services) مع مدخل بارز لرحلة المستفيد.
 * بطاقات الخدمات تفتح رحلة المستفيد على الخدمة نفسها، حيث زرّا البدء والتحقق من الأهلية،
 * حتى يبقى منطق الأهلية في مكان واحد.
 */
(function () {
  "use strict";

  const PAGE_SIZE = 10;
  const MAX_PAGE_LINKS = 5;
  const JOURNEY_PAGE = "journey.html";

  const list = document.getElementById("guide-list");
  const data = window.NAAMA_DATA;
  if (!data || !data.taxonomy || !Array.isArray(data.services)) {
    list.textContent = "تعذر تحميل بيانات الخدمات (data.js). شغّل build_journeys.py لإنشائها.";
    return;
  }

  const { createElement, iconCircle, icon, normalizeArabic: normalize } = window.NaamaDom;
  const services = data.services.filter((s) => s.published);
  const typesOf = (service) => new Set(service.paths.map((path) => path.split("/")[0]));
  const FILTER_GROUPS = [
    { key: "type", title: "فئات المستفيدين", valuesOf: typesOf, labelOf: (key) => data.taxonomy[key].label },
    { key: "sector", title: "القطاعات", valuesOf: (s) => new Set(s.sector ? [s.sector] : []) },
    { key: "category", title: "تصنيف الخدمات", valuesOf: (s) => new Set(s.category ? [s.category] : []) },
  ];

  const el = {
    search: document.getElementById("guide-search"),
    sort: document.getElementById("sort-select"),
    count: document.getElementById("results-count"),
    filters: document.getElementById("filter-groups"),
    clear: document.getElementById("clear-filters"),
    pagination: document.getElementById("pagination"),
    journeyTypes: document.getElementById("journey-types"),
  };
  const state = { query: "", page: 1, selected: Object.fromEntries(FILTER_GROUPS.map((g) => [g.key, new Set()])) };
  const textIndex = new Map(services.map((s) => [s.id, normalize([s.name, s.desc, s.category].join(" "))]));

  // ---------- الرحلة ----------

  function countByType() {
    const counts = new Map();
    for (const service of services) {
      for (const type of typesOf(service)) counts.set(type, (counts.get(type) || 0) + 1);
    }
    return counts;
  }

  function renderJourneyTypes() {
    const counts = countByType();
    for (const [typeKey, type] of Object.entries(data.taxonomy)) {
      const link = createElement("a", "journey-type");
      link.href = `${JOURNEY_PAGE}#/${typeKey}`;
      link.append(icon(typeKey), createElement("span", "title", type.label),
        createElement("span", "count", `${counts.get(typeKey) || 0} خدمة`));
      el.journeyTypes.append(link);
    }
  }

  // ---------- التصفية ----------

  function countValues(group) {
    const counts = new Map();
    for (const service of services) {
      for (const value of group.valuesOf(service)) counts.set(value, (counts.get(value) || 0) + 1);
    }
    return counts;
  }

  function filterOption(group, value, count) {
    const label = createElement("label", "filter-option");
    const checkbox = createElement("input");
    checkbox.type = "checkbox";
    checkbox.addEventListener("change", () => {
      const selected = state.selected[group.key];
      if (checkbox.checked) selected.add(value); else selected.delete(value);
      state.page = 1;
      render();
    });
    const text = group.labelOf ? group.labelOf(value) : value;
    label.append(checkbox, createElement("span", "filter-label", text), createElement("span", "filter-count", `(${count})`));
    return label;
  }

  function renderFilters() {
    for (const group of FILTER_GROUPS) {
      const entries = [...countValues(group)].sort((a, b) => b[1] - a[1]);
      const fieldset = createElement("fieldset", "filter-group");
      fieldset.append(createElement("legend", null, group.title));
      const options = createElement("div", "filter-options");
      for (const [value, count] of entries) options.append(filterOption(group, value, count));
      fieldset.append(options);
      el.filters.append(fieldset);
    }
  }

  /** داخل المجموعة الواحدة يكفي تطابق أي اختيار، وبين المجموعات يجب تطابقها كلها. */
  function matchesFilters(service) {
    return FILTER_GROUPS.every((group) => {
      const selected = state.selected[group.key];
      if (!selected.size) return true;
      const values = group.valuesOf(service);
      return [...selected].some((value) => values.has(value));
    });
  }

  function matchesQuery(service, terms) {
    const text = textIndex.get(service.id);
    return terms.every((term) => text.includes(term));
  }

  function visibleServices() {
    const terms = normalize(state.query).split(/\s+/).filter(Boolean);
    const direction = el.sort.value === "za" ? -1 : 1;
    return services
      .filter((s) => matchesFilters(s) && matchesQuery(s, terms))
      .sort((a, b) => direction * a.name.localeCompare(b.name, "ar"));
  }

  // ---------- البطاقات ----------

  /** يفتح رحلة المستفيد على أول مسار للخدمة مع البحث باسمها لتظهر وحدها. */
  function journeyUrl(service) {
    const path = service.paths[0] ? `#/${service.paths[0]}` : "#/";
    return `${JOURNEY_PAGE}?q=${encodeURIComponent(service.name)}${path}`;
  }

  function guideCard(service) {
    const card = createElement("article", "guide-card");
    const head = createElement("div", "guide-card-head");
    head.append(iconCircle("service"), createElement("h3", null, service.name));
    card.append(head);
    if (service.desc) {
      const desc = createElement("p", "desc", service.desc);
      desc.title = service.desc;
      card.append(desc);
    }
    const meta = createElement("div", "service-meta");
    for (const label of [service.sector, service.category]) if (label) meta.append(createElement("span", "badge", label));
    if (service.actions.length) meta.append(createElement("span", "badge badge-success", `${service.actions.length} خدمة فرعية`));
    card.append(meta);

    const button = createElement("a", "btn btn-primary guide-card-button", service.actions.length ? "اختر الخدمة" : "تفاصيل الخدمة ←");
    button.href = journeyUrl(service);
    card.append(button);
    return card;
  }

  // ---------- ترقيم الصفحات ----------

  function pageButton(label, page, { current = false, disabled = false } = {}) {
    const button = createElement("button", "page-button" + (current ? " current" : ""), label);
    button.type = "button";
    button.disabled = disabled;
    if (current) button.setAttribute("aria-current", "page");
    button.addEventListener("click", () => {
      state.page = page;
      render();
      list.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return button;
  }

  function renderPagination(pageCount) {
    el.pagination.replaceChildren();
    if (pageCount <= 1) return;
    const first = Math.max(1, Math.min(state.page - Math.floor(MAX_PAGE_LINKS / 2), pageCount - MAX_PAGE_LINKS + 1));
    const last = Math.min(pageCount, first + MAX_PAGE_LINKS - 1);
    el.pagination.append(pageButton("السابق", state.page - 1, { disabled: state.page === 1 }));
    for (let page = first; page <= last; page++) {
      el.pagination.append(pageButton(String(page), page, { current: page === state.page }));
    }
    el.pagination.append(pageButton("التالي", state.page + 1, { disabled: state.page === pageCount }));
  }

  // ---------- العرض ----------

  function renderCount(results) {
    const subCount = results.reduce((sum, s) => sum + s.actions.length, 0);
    el.count.replaceChildren(
      createElement("span", "badge badge-success", `(${results.length}) خدمة رئيسية`),
      createElement("span", "badge", `(${subCount}) خدمة فرعية`),
    );
  }

  function render() {
    const results = visibleServices();
    const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    state.page = Math.min(state.page, pageCount);
    renderCount(results);
    el.clear.hidden = !Object.values(state.selected).some((set) => set.size);
    const pageItems = results.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    list.replaceChildren(...(pageItems.length
      ? pageItems.map(guideCard)
      : [createElement("div", "empty", "لا توجد خدمات مطابقة. جرّب كلمات أخرى أو امسح التصفية.")]));
    renderPagination(pageCount);
  }

  function clearFilters() {
    Object.values(state.selected).forEach((set) => set.clear());
    el.filters.querySelectorAll("input[type=checkbox]").forEach((box) => { box.checked = false; });
    state.page = 1;
    render();
  }

  state.query = new URLSearchParams(location.search).get("q") || "";
  el.search.value = state.query;
  el.search.addEventListener("input", () => {
    state.query = el.search.value.trim();
    state.page = 1;
    render();
  });
  el.sort.addEventListener("change", render);
  el.clear.addEventListener("click", clearFilters);
  renderJourneyTypes();
  renderFilters();
  render();
})();
