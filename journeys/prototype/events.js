/**
 * صفحة أحداث الحياة والأعمال، بثلاث خطوات في عنوان الصفحة:
 * #/ اختيار نوع المستفيد، #/نوع قائمة أحداثه، #/نوع/حدث الخط الزمني لخطوات الحدث.
 * يُحفظ تقدم المستفيد في المتصفح فقط، لأن النموذج لا يملك حسابات مستخدمين.
 */
(function () {
  "use strict";

  const content = document.getElementById("content");
  const data = window.NAAMA_DATA;
  if (!data || !Array.isArray(data.services) || !window.NaamaLifeEvents || !window.NaamaEligibility) {
    content.textContent = "تعذر تحميل بيانات الخدمات (data.js). شغّل build_journeys.py لإنشائها.";
    return;
  }

  const { createElement, iconCircle, journeyUrl, serviceUrl, safeUrl } = window.NaamaDom;
  const { LIFE_EVENTS, resolveLifeEvent, eventsForType, progress, feeTotals, stepsLabel, eventsLabel } = window.NaamaLifeEvents;
  const { describeFee, formatAmount } = window.NaamaEligibility;
  const STORAGE_PREFIX = "naama.lifeEvent.";
  const GUIDE_CRUMB = { label: "دليل الخدمات الإلكترونية", href: "index.html" };
  const EVENTS_CRUMB = { label: "أحداث الحياة والأعمال", href: "#/" };
  const el = {
    breadcrumb: document.getElementById("breadcrumb"),
    title: document.getElementById("page-title"),
    hint: document.getElementById("page-hint"),
  };

  // ---------- حفظ التقدم ----------

  /** التخزين قد يكون معطّلًا (تصفح خاص) أو محتواه تالفًا، وفي الحالتين نبدأ من الصفر. */
  function loadDone(eventId) {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + eventId) || "[]");
      return Array.isArray(saved) ? saved.filter(Number.isInteger) : [];
    } catch (error) {
      console.warn("تعذر قراءة تقدم الرحلة المحفوظ:", error);
      return [];
    }
  }

  function saveDone(eventId, doneIndexes) {
    try {
      localStorage.setItem(STORAGE_PREFIX + eventId, JSON.stringify(doneIndexes));
    } catch (error) {
      console.warn("تعذر حفظ تقدم الرحلة:", error);
    }
  }

  // ---------- عناصر مشتركة ----------

  function typeLabel(typeKey) {
    return (data.taxonomy[typeKey] || {}).label || "";
  }

  function setHeader(title, hint, crumbs) {
    document.title = `نما | ${title}`;
    el.title.textContent = title;
    el.hint.textContent = hint;
    el.breadcrumb.replaceChildren();
    crumbs.forEach((crumb, index) => {
      if (index) el.breadcrumb.append(createElement("span", "sep", "›"));
      const link = createElement("a", null, crumb.label);
      link.href = crumb.href;
      el.breadcrumb.append(link);
    });
  }

  function linkCard({ href, icon, crumb, title, text, badge }) {
    const card = createElement("a", "choice-card event-card");
    card.href = href;
    card.append(iconCircle(icon));
    if (crumb) card.append(createElement("span", "crumb", crumb));
    card.append(createElement("span", "title", title));
    if (text) card.append(createElement("span", "event-summary", text));
    card.append(createElement("span", "badge badge-success", badge));
    return card;
  }

  function backLink(label, href) {
    const link = createElement("a", "btn btn-light", label);
    link.href = href;
    return link;
  }

  // ---------- الخطوة 1: نوع المستفيد ----------

  function renderTypes() {
    setHeader("من أنت؟", "اختر نوع المستفيد لنعرض لك الأحداث والأهداف التي تناسبك.", [GUIDE_CRUMB, EVENTS_CRUMB]);
    const grid = createElement("div", "card-grid grid-5");
    for (const [typeKey, type] of Object.entries(data.taxonomy)) {
      const events = eventsForType(typeKey);
      if (!events.length) continue;
      grid.append(linkCard({ href: `#/${typeKey}`, icon: typeKey, title: type.label, badge: eventsLabel(events.length) }));
    }
    content.replaceChildren(grid);
  }

  // ---------- الخطوة 2: أحداث النوع ----------

  function renderEventsOfType(typeKey) {
    const label = typeLabel(typeKey);
    setHeader(`ماذا تريد أن تنجز؟`, `${label}: اختر هدفك، وسنعرض لك الخدمات التي تحتاجها بالترتيب.`,
      [GUIDE_CRUMB, EVENTS_CRUMB, { label, href: `#/${typeKey}` }]);
    const grid = createElement("div", "card-grid events-grid");
    for (const event of eventsForType(typeKey)) {
      const { requiredDone, requiredTotal } = progress(event, loadDone(event.id));
      grid.append(linkCard({
        href: `#/${typeKey}/${event.id}`, icon: typeKey, title: event.title, text: event.summary,
        crumb: requiredDone ? `أنجزت ${requiredDone} من ${requiredTotal}` : "",
        badge: stepsLabel(event.steps.length),
      }));
    }
    content.replaceChildren(grid, backLink("تغيير نوع المستفيد", "#/"));
  }

  // ---------- الخطوة 3: الخط الزمني ----------

  function summaryStats(event, resolved) {
    const optionalCount = event.steps.filter((s) => s.optional).length;
    const { fixedTotal, freeCount, unknownCount } = feeTotals(resolved);
    const stats = createElement("div", "event-stats");
    const stat = (value, label) => {
      const box = createElement("div", "event-stat");
      box.append(createElement("strong", null, value), createElement("span", null, label));
      stats.append(box);
    };
    stat(String(event.steps.length - optionalCount), "خطوات إلزامية");
    stat(String(optionalCount), "خطوات اختيارية حسب حالتك");
    // Only show fee facts the guide actually contains; zeros would read as "free" or "no cost".
    if (fixedTotal) stat(formatAmount(fixedTotal), "رسوم ثابتة معروفة");
    if (freeCount) stat(String(freeCount), "خطوات مجانية");
    if (unknownCount) stat(String(unknownCount), "خطوات تُحدد رسومها لاحقًا");
    return stats;
  }

  function progressBar(event, done) {
    const { requiredDone, requiredTotal, complete } = progress(event, done);
    const wrapper = createElement("div", "event-progress");
    const bar = createElement("div", "progress-track");
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", String(requiredTotal));
    bar.setAttribute("aria-valuenow", String(requiredDone));
    const fill = createElement("span", "progress-fill");
    fill.style.width = `${requiredTotal ? (requiredDone / requiredTotal) * 100 : 0}%`;
    bar.append(fill);
    wrapper.append(createElement("span", null, `الخطوات الإلزامية المنجزة: ${requiredDone} من ${requiredTotal}`), bar);
    if (complete) {
      wrapper.append(createElement("div", "result-box success", "أحسنت! أكملت جميع الخطوات الإلزامية لهذه الرحلة."));
    }
    return wrapper;
  }

  /** بيانات الخدمة التي تساعد المستفيد على الاستعداد للخطوة قبل أن يبدأها. */
  function stepDetails(service, action) {
    const details = createElement("div", "step-details");
    const conditions = service.eligibility.length + (action ? action.eligibility.length : 0);
    const hasDirectLink = Boolean(safeUrl(action ? action.url : service.url));
    const detail = (label, value) => {
      const row = createElement("div", "step-detail");
      row.append(createElement("span", "step-detail-label", label), createElement("span", null, value));
      details.append(row);
    };
    detail("الخدمة", action ? action.name : service.name);
    detail("الرسوم", describeFee(service.fee));
    detail("شروط الأهلية", `${conditions} ${conditions === 1 ? "شرط" : "شروط"}، تحقق منها قبل التقديم`);
    detail("التقديم", hasDirectLink ? "إلكتروني عبر رابط الخدمة" : "عبر منصة نما");
    return details;
  }

  function stepItem(event, resolved, done) {
    const { step, index, service, action } = resolved;
    const isDone = done.includes(index);
    const item = createElement("li", "timeline-step" + (isDone ? " done" : "") + (step.optional ? " optional" : ""));
    item.append(createElement("span", "timeline-marker", isDone ? "✓" : String(index + 1)));

    const body = createElement("div", "timeline-body");
    const head = createElement("div", "timeline-head");
    head.append(createElement("h3", null, step.title));
    if (step.optional) head.append(createElement("span", "badge", "اختيارية"));
    if (service.category) head.append(createElement("span", "badge", service.category));
    body.append(head, createElement("p", "desc", step.why), stepDetails(service, action));

    const actions = createElement("div", "service-buttons");
    const start = createElement("a", "btn btn-primary", "ابدأ هذه الخطوة ←");
    start.href = journeyUrl(service, action, event.type);
    const details = createElement("a", "btn btn-outline", "تفاصيل الخدمة");
    details.href = serviceUrl(service, action);
    const toggle = createElement("label", "step-toggle");
    const checkbox = createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isDone;
    checkbox.addEventListener("change", () => {
      saveDone(event.id, checkbox.checked ? [...done, index] : done.filter((i) => i !== index));
      render();
    });
    toggle.append(checkbox, createElement("span", null, "أنجزت هذه الخطوة"));
    actions.append(start, details, toggle);
    body.append(actions);
    item.append(body);
    return item;
  }

  function renderEvent(event) {
    const { steps, errors } = resolveLifeEvent(event, data.services);
    if (errors.length) console.error(`خطوات غير مربوطة بخدمات في "${event.title}":`, errors);
    const done = loadDone(event.id);
    const label = typeLabel(event.type);
    setHeader(event.title, `${label} · ${event.summary}`, [
      GUIDE_CRUMB, EVENTS_CRUMB, { label, href: `#/${event.type}` }, { label: event.title, href: `#/${event.type}/${event.id}` },
    ]);
    const timeline = createElement("ol", "timeline");
    steps.forEach((resolved) => timeline.append(stepItem(event, resolved, done)));
    content.replaceChildren(summaryStats(event, steps), progressBar(event, done), timeline,
      backLink(`أحداث أخرى لـ ${label}`, `#/${event.type}`));
  }

  // ---------- التوجيه ----------

  function render() {
    const [first, second] = decodeURIComponent(location.hash.replace(/^#\/?/, "")).split("/");
    const event = LIFE_EVENTS.find((e) => e.id === (second || first));
    if (event) renderEvent(event);
    else if (eventsForType(first).length) renderEventsOfType(first);
    else renderTypes();
  }

  window.addEventListener("hashchange", () => {
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  render();
})();
