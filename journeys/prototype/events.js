/**
 * صفحة أحداث الحياة والأعمال: قائمة الأحداث (#/) وخط زمني لخطوات حدث محدد (#/معرّف-الحدث).
 * يُحفظ تقدم المستفيد في المتصفح فقط، لأن النموذج لا يملك حسابات مستخدمين.
 */
(function () {
  "use strict";

  const content = document.getElementById("content");
  const data = window.NAAMA_DATA;
  if (!data || !Array.isArray(data.services) || !window.NaamaLifeEvents) {
    content.textContent = "تعذر تحميل بيانات الخدمات (data.js). شغّل build_journeys.py لإنشائها.";
    return;
  }

  const { createElement, iconCircle, journeyUrl } = window.NaamaDom;
  const { LIFE_EVENTS, resolveLifeEvent, progress, stepsLabel } = window.NaamaLifeEvents;
  const STORAGE_PREFIX = "naama.lifeEvent.";
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

  // ---------- العناصر ----------

  function typeLabel(typeKey) {
    return (data.taxonomy[typeKey] || {}).label || "";
  }

  function renderBreadcrumb(crumbs) {
    el.breadcrumb.replaceChildren();
    crumbs.forEach((crumb, index) => {
      if (index) el.breadcrumb.append(createElement("span", "sep", "›"));
      const link = createElement("a", null, crumb.label);
      link.href = crumb.href;
      el.breadcrumb.append(link);
    });
  }

  function eventCard(event) {
    const card = createElement("a", "choice-card event-card");
    card.href = `#/${event.id}`;
    card.append(
      iconCircle(event.type),
      createElement("span", "crumb", typeLabel(event.type)),
      createElement("span", "title", event.title),
      createElement("span", "event-summary", event.summary),
      createElement("span", "badge badge-success", stepsLabel(event.steps.length)),
    );
    return card;
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

  function stepItem(event, resolved, index, done) {
    const { step, service, action } = resolved;
    const isDone = done.includes(index);
    const item = createElement("li", "timeline-step" + (isDone ? " done" : "") + (step.optional ? " optional" : ""));
    item.append(createElement("span", "timeline-marker", isDone ? "✓" : String(index + 1)));

    const body = createElement("div", "timeline-body");
    const head = createElement("div", "timeline-head");
    head.append(createElement("h3", null, step.title));
    if (step.optional) head.append(createElement("span", "badge", "اختيارية"));
    body.append(head, createElement("p", "desc", step.why),
      createElement("span", "timeline-service", `الخدمة: ${action ? action.name : service.name}`));

    const actions = createElement("div", "service-buttons");
    const start = createElement("a", "btn btn-primary", "ابدأ هذه الخطوة ←");
    start.href = journeyUrl(service, action);
    const toggle = createElement("label", "step-toggle");
    const checkbox = createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isDone;
    checkbox.addEventListener("change", () => {
      const next = checkbox.checked ? [...done, index] : done.filter((i) => i !== index);
      saveDone(event.id, next);
      render();
    });
    toggle.append(checkbox, createElement("span", null, "أنجزت هذه الخطوة"));
    actions.append(start, toggle);
    body.append(actions);
    item.append(body);
    return item;
  }

  // ---------- الصفحات ----------

  function renderList() {
    document.title = "نما | أحداث الحياة والأعمال";
    el.title.textContent = "ماذا تريد أن تنجز؟";
    el.hint.textContent = "اختر هدفك، وسنعرض لك كل الخدمات التي تحتاجها بالترتيب، خطوة بخطوة.";
    renderBreadcrumb([{ label: "دليل الخدمات الإلكترونية", href: "index.html" }, { label: "أحداث الحياة والأعمال", href: "#/" }]);
    const grid = createElement("div", "card-grid events-grid");
    LIFE_EVENTS.forEach((event) => grid.append(eventCard(event)));
    content.replaceChildren(grid);
  }

  function renderEvent(event) {
    const { steps, errors } = resolveLifeEvent(event, data.services);
    if (errors.length) console.error(`خطوات غير مربوطة بخدمات في "${event.title}":`, errors);
    const done = loadDone(event.id);
    document.title = `نما | ${event.title}`;
    el.title.textContent = event.title;
    el.hint.textContent = `${typeLabel(event.type)} · ${event.summary}`;
    renderBreadcrumb([
      { label: "دليل الخدمات الإلكترونية", href: "index.html" },
      { label: "أحداث الحياة والأعمال", href: "#/" },
      { label: event.title, href: `#/${event.id}` },
    ]);
    const timeline = createElement("ol", "timeline");
    steps.forEach((resolved) => timeline.append(stepItem(event, resolved, event.steps.indexOf(resolved.step), done)));
    const back = createElement("a", "btn btn-light", "كل الأحداث");
    back.href = "#/";
    content.replaceChildren(progressBar(event, done), timeline, back);
  }

  function render() {
    const eventId = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    const event = LIFE_EVENTS.find((e) => e.id === eventId);
    if (event) renderEvent(event); else renderList();
  }

  window.addEventListener("hashchange", () => {
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  render();
})();
