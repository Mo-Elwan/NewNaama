/**
 * صفحة دليل الخدمات الإلكترونية (مطابقة لـ naama.sa/services) مع مدخل بارز لرحلة المستفيد.
 * بطاقات الخدمات تفتح صفحة التفاصيل (الشروط والمستندات والخدمات المرتبطة)،
 * ومنها ينتقل المستفيد إلى التقديم أو التحقق من الأهلية.
 */
(function () {
  "use strict";

  const PAGE_SIZE = 10;
  const MAX_PAGE_LINKS = 5;
  const URGENT_DAYS = 14;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const RENEWAL_OPERATION = "تجديد";
  // تراخيص مستفيد افتراضي للعرض فقط؛ في المنصة الفعلية تأتي من حساب المستفيد بعد تسجيل الدخول.
  const PROACTIVE_SAMPLES = [
    { serviceId: "0cba1840-b7bf-4160-89f1-59cf3ff97974", licenseNo: "BK-1447-20381", daysLeft: 9 },
    { serviceId: "0c21f3d2-6dc7-4db7-b815-ba9bdc30800a", licenseNo: "FS-1446-77215", daysLeft: 27 },
    { serviceId: "87239420-5e31-4564-8162-6b1a84e9d4b8", licenseNo: "PL-1445-10954", daysLeft: 48, stage: "operational" },
  ];

  const list = document.getElementById("guide-list");
  const data = window.NAAMA_DATA;
  if (!data || !data.taxonomy || !Array.isArray(data.services)) {
    list.textContent = "تعذر تحميل بيانات الخدمات (data.js). شغّل build_journeys.py لإنشائها.";
    return;
  }

  const { createElement, iconCircle, icon, journeyUrl, serviceUrl, JOURNEY_PAGE } = window.NaamaDom;
  const { tokenize, trackQuery, renderPopularChips } = window.NaamaSearch;
  const services = data.services.filter((s) => s.published);
  const searchIndex = window.NaamaSearch.createIndex(services);
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
    proactive: document.getElementById("proactive-list"),
    lifeEvents: document.getElementById("life-events-list"),
    lifeEventTypes: document.getElementById("life-event-types"),
    suggestions: document.getElementById("search-suggestions"),
  };
  const state = { query: "", page: 1, selected: Object.fromEntries(FILTER_GROUPS.map((g) => [g.key, new Set()])) };

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

  function visibleServices() {
    const hits = window.NaamaSearch.search(searchIndex, state.query).filter((hit) => matchesFilters(hit.service));
    if (!tokenize(state.query).length) {
      const direction = el.sort.value === "za" ? -1 : 1;
      return hits.map((hit) => hit.service).sort((a, b) => direction * a.name.localeCompare(b.name, "ar"));
    }
    return hits.map((hit) => hit.service);
  }

  function applyQuery(query) {
    state.query = query.trim();
    el.search.value = query;
    state.page = 1;
    render();
  }

  function emptyResults() {
    const box = createElement("div", "empty");
    const searching = tokenize(state.query).length > 0;
    box.append(createElement("p", null, searching
      ? `لم نجد خدمات تطابق «${state.query}». جرّب كلمة أخرى أو اختر من الأكثر بحثًا.`
      : "لا توجد خدمات مطابقة. جرّب كلمات أخرى أو امسح التصفية."));
    if (searching) {
      const hints = createElement("div", "search-suggestions");
      renderPopularChips(hints, applyQuery);
      box.append(hints);
    }
    return box;
  }

  function renderSuggestions() {
    if (!el.suggestions) return;
    const searching = tokenize(state.query).length > 0;
    el.suggestions.hidden = searching;
    if (!searching) renderPopularChips(el.suggestions, applyQuery);
  }

  // ---------- البطاقات ----------

  // ---------- أحداث الحياة والأعمال ----------

  function lifeEventChip(event, stepsLabel) {
    const link = createElement("a", "life-event-chip");
    link.href = `events.html#/${event.type}/${event.id}`;
    link.append(icon(event.type), createElement("span", "title", event.title),
      createElement("span", "count", stepsLabel(event.steps.length)));
    return link;
  }

  /** المستفيد يختار نوعه أولًا، ثم تظهر أحداث هذا النوع فقط. */
  function renderLifeEvents() {
    if (!window.NaamaLifeEvents) {
      console.warn("لم يُحمَّل life-events.js؛ سيُخفى قسم أحداث الحياة والأعمال.");
      el.lifeEvents.closest("section").hidden = true;
      return;
    }
    const { eventsForType, stepsLabel, eventsLabel } = window.NaamaLifeEvents;
    const types = Object.keys(data.taxonomy).filter((typeKey) => eventsForType(typeKey).length);
    el.lifeEvents.closest("section").hidden = !types.length;
    const showType = (typeKey) => {
      el.lifeEventTypes.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === typeKey)));
      el.lifeEvents.replaceChildren(...eventsForType(typeKey).map((event) => lifeEventChip(event, stepsLabel)));
    };
    el.lifeEventTypes.replaceChildren(...types.map((typeKey) => {
      const button = createElement("button", "type-tab");
      button.type = "button";
      button.dataset.type = typeKey;
      button.append(icon(typeKey), createElement("span", null, data.taxonomy[typeKey].label),
        createElement("span", "count", eventsLabel(eventsForType(typeKey).length)));
      button.addEventListener("click", () => showType(typeKey));
      return button;
    }));
    if (types.length) showType(types[0]);
  }

  // ---------- الخدمات الاستباقية ----------

  function renewalAction(service, stage) {
    return service.actions.find((a) => a.operation === RENEWAL_OPERATION && (!stage || a.stage === stage));
  }

  /** صيغة العدد العربية: يوم واحد، يومين، 3-10 أيام، 11 فأكثر يومًا. */
  function daysText(days) {
    if (days === 1) return "يوم واحد";
    if (days === 2) return "يومين";
    return days <= 10 ? `${days} أيام` : `${days} يومًا`;
  }

  function formatDate(date) {
    return date.toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { year: "numeric", month: "long", day: "numeric" });
  }

  function proactiveCard(service, action, sample) {
    const isUrgent = sample.daysLeft <= URGENT_DAYS;
    const card = createElement("article", "proactive-card" + (isUrgent ? " urgent" : ""));
    const head = createElement("div", "proactive-card-head");
    head.append(icon("bell", "proactive-icon"), createElement("span", "badge " + (isUrgent ? "badge-danger" : "badge-warning"),
      isUrgent ? "عاجل" : "قريبًا"));
    const expiry = new Date(Date.now() + sample.daysLeft * DAY_MS);
    card.append(
      head,
      createElement("h3", null, action.name),
      createElement("p", "proactive-text", `تنتهي رخصتك خلال ${daysText(sample.daysLeft)}، في ${formatDate(expiry)}.`),
      createElement("span", "proactive-meta", `رقم الرخصة: ${sample.licenseNo}`),
    );
    const button = createElement("a", "btn btn-primary", "جدّد الآن ←");
    button.href = serviceUrl(service, action);
    card.append(button);
    return card;
  }

  function renderProactive() {
    const servicesById = new Map(services.map((s) => [s.id, s]));
    const cards = PROACTIVE_SAMPLES.map((sample) => {
      const service = servicesById.get(sample.serviceId);
      const action = service && renewalAction(service, sample.stage);
      if (!action) {
        console.warn(`الخدمة الاستباقية غير موجودة أو بلا إجراء تجديد: ${sample.serviceId}`);
        return null;
      }
      return proactiveCard(service, action, sample);
    }).filter(Boolean);
    el.proactive.closest("section").hidden = !cards.length;
    el.proactive.replaceChildren(...cards);
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

    const button = createElement("a", "btn btn-primary guide-card-button", "تفاصيل الخدمة ←");
    button.href = serviceUrl(service);
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
    list.replaceChildren(...(pageItems.length ? pageItems.map(guideCard) : [emptyResults()]));
    renderPagination(pageCount);
    renderSuggestions();
    if (tokenize(state.query).length) trackQuery(state.query, results.length);
  }

  function clearFilters() {
    Object.values(state.selected).forEach((set) => set.clear());
    el.filters.querySelectorAll("input[type=checkbox]").forEach((box) => { box.checked = false; });
    state.page = 1;
    render();
  }

  state.query = new URLSearchParams(location.search).get("q") || "";
  el.search.value = state.query;
  el.search.addEventListener("input", () => applyQuery(el.search.value));
  el.sort.addEventListener("change", render);
  el.clear.addEventListener("click", clearFilters);
  renderJourneyTypes();
  renderLifeEvents();
  renderProactive();
  renderFilters();
  render();
})();
