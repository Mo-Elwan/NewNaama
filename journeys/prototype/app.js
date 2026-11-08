/**
 * نموذج رحلات المستفيد لخدمات نما.
 * المسار في عنوان الصفحة (#/type/persona/group) يحدد الخطوة الحالية،
 * حتى يعمل زر الرجوع في المتصفح ويمكن مشاركة رابط أي خطوة.
 */
(function () {
  "use strict";

  const data = window.NAAMA_DATA;
  if (!data || !data.taxonomy || !Array.isArray(data.services)) {
    document.getElementById("content").textContent =
      "تعذر تحميل بيانات الخدمات (data.js). شغّل build_journeys.py لإنشائها.";
    return;
  }

  const { createElement, urlOrPlatform, iconCircle, normalizeArabic: normalize } = window.NaamaDom;
  const GENERAL_PERSONA = "general";
  const GUIDE_PAGE = "index.html";
  const MIN_SEARCH_LENGTH = 2;
  const MAX_SEARCH_RESULTS = 60;
  const STEP_TITLES = [
    { label: "الخطوة 1 من 4", title: "من أنت؟", hint: "اختر نوع المستفيد لنعرض لك الخدمات المناسبة" },
    { label: "الخطوة 2 من 4", title: "ما هي فئتك؟", hint: "اختر الفئة الأقرب لنشاطك" },
    { label: "الخطوة 3 من 4", title: "ماذا تحتاج؟", hint: "اختر مجموعة الخدمات" },
    { label: "الخطوة 4 من 4", title: "الخدمات المتاحة", hint: "اختر الخدمة أو الإجراء المطلوب" },
  ];

  const el = {
    content: document.getElementById("content"),
    breadcrumb: document.getElementById("breadcrumb"),
    stepLabel: document.getElementById("step-label"),
    stepTitle: document.getElementById("step-title"),
    stepHint: document.getElementById("step-hint"),
    search: document.getElementById("search-input"),
    searchSummary: document.getElementById("search-summary"),
    back: document.getElementById("back-button"),
  };

  // ---------- البيانات ----------

  const publishedServices = data.services.filter((s) => s.published);

  /** يحسب عدد الخدمات لكل مستوى من مستويات المسار (type, type/persona, type/persona/group). */
  function countByPrefix(services) {
    const counts = new Map();
    for (const service of services) {
      const seen = new Set();
      for (const path of service.paths) {
        const [type, persona] = path.split("/");
        for (const key of [type, `${type}/${persona}`, path]) {
          if (seen.has(key)) continue;
          seen.add(key);
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
    }
    return counts;
  }

  function pathLabels(path) {
    const [typeKey, personaKey, groupKey] = path.split("/");
    const type = data.taxonomy[typeKey];
    const persona = type && type.personas[personaKey];
    const group = persona && persona.groups[groupKey];
    return type && persona && group ? [type.label, persona.label, group] : null;
  }

  const serviceTextIndex = new Map(
    data.services.map((s) => [s.id, normalize([s.name, s.desc, s.category, ...s.actions.map((a) => a.name)].join(" "))])
  );
  const pathLabelIndex = new Map();

  function pathLabelText(path) {
    if (!pathLabelIndex.has(path)) pathLabelIndex.set(path, normalize((pathLabels(path) || []).join(" ")));
    return pathLabelIndex.get(path);
  }

  function searchTerms(query) {
    return normalize(query).split(/\s+/).filter(Boolean);
  }

  function containsAllTerms(text, terms) {
    return terms.every((term) => text.includes(term));
  }

  /** هل المسار داخل نطاق الخطوة الحالية؟ النطاق الفارغ يعني كل الرحلات. */
  function isInScope(path, scope) {
    return !scope || path === scope || path.startsWith(scope + "/");
  }

  // ---------- عناصر الواجهة ----------

  const { externalLink } = window.NaamaDom;

  function choiceCard({ title, count, href, isGeneral, crumb, icon }) {
    const card = createElement("a", "choice-card" + (isGeneral ? " general" : ""));
    card.href = href;
    card.append(iconCircle(isGeneral ? "general" : icon));
    if (crumb) card.append(createElement("span", "crumb", crumb));
    card.append(createElement("span", "title", title), createElement("span", "badge badge-success", `${count} خدمة`));
    return card;
  }

  function emptyState(message) {
    return createElement("div", "empty", message);
  }

  function serviceCard(service, { showPaths }) {
    const card = createElement("article", "service-card");
    card.dataset.serviceId = service.id;
    card.append(iconCircle("service"), createElement("h3", null, service.name));
    if (service.desc) {
      const desc = createElement("p", "desc", service.desc);
      desc.title = service.desc;
      card.append(desc);
    }

    const meta = createElement("div", "service-meta");
    if (service.system) meta.append(createElement("span", "badge", service.system));
    if (service.category) meta.append(createElement("span", "badge", service.category));
    if (service.actions.length) {
      meta.append(createElement("span", "badge badge-success", `${service.actions.length} خدمة فرعية`));
    }
    card.append(meta);

    if (showPaths) card.append(pathLinks(service.paths));
    if (service.actions.length) card.append(actionPicker(service));
    else card.append(serviceButtons(service, null));
    return card;
  }

  // ---------- الأهلية والرسوم ----------

  /** نوع المستفيد الحالي من الرحلة، أو نوع أول رحلة للخدمة عند البحث من الصفحة الرئيسية. */
  function currentBeneficiaryType(service) {
    return parseRoute()[0] || service.paths[0].split("/")[0];
  }

  /** رابط الخدمة أو الإجراء، أو منصة نما إذا لم يُسجَّل لها رابط صالح في الدليل. */
  function startUrl(service, action) {
    return urlOrPlatform(action ? action.url : service.url);
  }

  function openEligibility(service, action) {
    const questionIds = [...service.eligibility, ...(action ? action.eligibility : [])];
    window.NaamaEligibilityDialog.open({
      title: service.name,
      subtitle: action ? `${data.licenseStages[action.stage]} › ${action.operation}` : "",
      url: startUrl(service, action),
      fee: service.fee,
      questions: window.NaamaEligibility.questionsFor(questionIds, currentBeneficiaryType(service), data.questions),
    });
  }

  /** زرّا "ابدأ الخدمة" و"التحقق من الأهلية والرسوم" لخدمة أو لإجراء فرعي منها. */
  function serviceButtons(service, action) {
    const buttons = createElement("div", "service-buttons");
    buttons.append(externalLink("btn btn-primary", "ابدأ الخدمة ←", startUrl(service, action)));
    const check = createElement("button", "btn btn-outline", "التحقق من الأهلية والرسوم");
    check.type = "button";
    check.addEventListener("click", () => openEligibility(service, action));
    buttons.append(check);
    return buttons;
  }

  function groupActionsByStage(actions) {
    const groups = new Map(Object.keys(data.licenseStages).map((stage) => [stage, []]));
    actions.forEach((action) => groups.get(action.stage).push(action));
    return [...groups].filter(([, list]) => list.length);
  }

  /** يجعل زرًا واحدًا فقط من المجموعة مضغوطًا، كمجموعة اختيار. */
  function selectOnly(container, button) {
    container.querySelectorAll("[aria-pressed]").forEach((b) => b.setAttribute("aria-pressed", "false"));
    button.setAttribute("aria-pressed", "true");
  }

  /** بعد اختيار العملية تظهر أزرار البدء والتحقق الخاصة بها. */
  function operationChips(service, actions) {
    const wrapper = createElement("div");
    const chips = createElement("div", "actions");
    const selectedArea = createElement("div", "selected-action");
    for (const action of actions) {
      const chip = createElement("button", "action-chip", action.operation);
      chip.type = "button";
      chip.title = action.name;
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", () => {
        selectOnly(chips, chip);
        selectedArea.replaceChildren(createElement("div", "selected-action-name", action.name), serviceButtons(service, action));
      });
      chips.append(chip);
    }
    wrapper.append(chips, selectedArea);
    return wrapper;
  }

  /**
   * إذا كانت للخدمة أنواع تراخيص (مبدئي/إنشائي/تشغيلي) يختار المستفيد النوع أولًا
   * ثم تظهر عملياته (إصدار جديد، تجديد، ...). وإلا تُعرض العمليات مباشرة.
   */
  function actionPicker(service) {
    const actions = service.actions;
    const wrapper = createElement("div", "action-picker");
    const groups = groupActionsByStage(actions);
    const hasStages = groups.some(([stage]) => stage !== "general");
    if (!hasStages) {
      wrapper.append(createElement("div", "actions-title", "اختر الإجراء:"), operationChips(service, actions));
      return wrapper;
    }

    const stageButtons = createElement("div", "actions");
    const operationsArea = createElement("div", "operations-area");
    for (const [stage, stageActions] of groups) {
      const button = createElement("button", "stage-button", `${data.licenseStages[stage]} (${stageActions.length})`);
      button.type = "button";
      button.dataset.stage = stage;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        selectOnly(stageButtons, button);
        operationsArea.replaceChildren(
          createElement("div", "actions-title", `اختر الإجراء - ${data.licenseStages[stage]}:`),
          operationChips(service, stageActions)
        );
      });
      stageButtons.append(button);
    }
    wrapper.append(createElement("div", "actions-title", "اختر نوع الترخيص:"), stageButtons, operationsArea);
    return wrapper;
  }

  function pathLinks(paths) {
    const container = createElement("div", "paths");
    container.append("تظهر في: ");
    paths.forEach((path, index) => {
      const labels = pathLabels(path);
      if (!labels) return;
      if (index) container.append(" | ");
      const link = createElement("a", null, labels.join(" › "));
      link.href = `#/${path}`;
      link.addEventListener("click", clearSearchOnSameRoute);
      container.append(link);
    });
    return container;
  }

  /** إذا كان الرابط يشير للخطوة الحالية نفسها فلن يحدث hashchange، لذا نمسح البحث يدويًا. */
  function clearSearchOnSameRoute() {
    el.search.value = "";
    render();
  }

  function setHeader(step, title) {
    const meta = STEP_TITLES[step];
    el.stepLabel.textContent = meta.label;
    el.stepTitle.textContent = title || meta.title;
    el.stepHint.textContent = meta.hint;
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

  // ---------- الخطوات ----------

  function renderTypes(counts) {
    setHeader(0);
    const grid = createElement("div", "card-grid grid-5");
    for (const [typeKey, type] of Object.entries(data.taxonomy)) {
      grid.append(choiceCard({ title: type.label, count: counts.get(typeKey) || 0, href: `#/${typeKey}`, icon: typeKey }));
    }
    return grid;
  }

  function renderPersonas(typeKey, counts) {
    const type = data.taxonomy[typeKey];
    setHeader(1, `${type.label}: ما هي فئتك؟`);
    const grid = createElement("div", "card-grid grid-5");
    const entries = Object.entries(type.personas)
      .filter(([personaKey]) => counts.get(`${typeKey}/${personaKey}`))
      .sort(([a], [b]) => (a === GENERAL_PERSONA) - (b === GENERAL_PERSONA));
    for (const [personaKey, persona] of entries) {
      grid.append(choiceCard({
        title: persona.label,
        count: counts.get(`${typeKey}/${personaKey}`),
        href: `#/${typeKey}/${personaKey}`,
        isGeneral: personaKey === GENERAL_PERSONA,
      }));
    }
    return entries.length ? grid : emptyState("لا توجد خدمات لهذا النوع حاليًا.");
  }

  function renderGroups(typeKey, personaKey, counts) {
    const persona = data.taxonomy[typeKey].personas[personaKey];
    setHeader(2, `${persona.label}: ماذا تحتاج؟`);
    const grid = createElement("div", "card-grid");
    for (const [groupKey, label] of Object.entries(persona.groups)) {
      const count = counts.get(`${typeKey}/${personaKey}/${groupKey}`);
      if (count) grid.append(choiceCard({ title: label, count, href: `#/${typeKey}/${personaKey}/${groupKey}` }));
    }
    return grid.childElementCount ? grid : emptyState("لا توجد خدمات لهذه الفئة حاليًا.");
  }

  function renderServices(path, services) {
    setHeader(3, pathLabels(path)[2]);
    const matches = services.filter((s) => s.paths.includes(path));
    if (!matches.length) return emptyState("لا توجد خدمات في هذه المجموعة حاليًا.");
    const list = createElement("div", "service-list");
    matches.forEach((s) => list.append(serviceCard(s, { showPaths: false })));
    return list;
  }

  // ---------- البحث ----------

  /** كل التصنيفات (نوع / فئة / مجموعة) الواقعة تحت النطاق الحالي، مع مساراتها وأسمائها. */
  function categoriesInScope(route) {
    const categories = [];
    for (const [typeKey, type] of Object.entries(data.taxonomy)) {
      if (route[0] && route[0] !== typeKey) continue;
      if (!route[0]) categories.push({ path: typeKey, title: type.label, crumb: "" });
      for (const [personaKey, persona] of Object.entries(type.personas)) {
        if (route[1] && route[1] !== personaKey) continue;
        const personaPath = `${typeKey}/${personaKey}`;
        if (!route[1]) categories.push({ path: personaPath, title: persona.label, crumb: type.label });
        if (route[2]) continue;
        for (const [groupKey, groupLabel] of Object.entries(persona.groups)) {
          categories.push({
            path: `${personaPath}/${groupKey}`, title: groupLabel, crumb: `${type.label} › ${persona.label}`,
          });
        }
      }
    }
    return categories;
  }

  /**
   * تطابق الخدمة إذا وُجدت كل كلمات البحث في نصها (الاسم، الوصف، الإجراءات)
   * مضافًا إليه أسماء تصنيفات أحد مساراتها داخل النطاق. هكذا يعيد البحث عن
   * "مزارع آبار" خدمات الآبار الموجودة في رحلة المزارع فقط.
   */
  function matchingPaths(service, scope, terms) {
    const serviceText = serviceTextIndex.get(service.id);
    return service.paths.filter(
      (path) => isInScope(path, scope) && containsAllTerms(`${serviceText} ${pathLabelText(path)}`, terms)
    );
  }

  function renderSearchResults(route, services, query) {
    const scope = route.join("/");
    const terms = searchTerms(query);
    const counts = countByPrefix(services);

    const categories = categoriesInScope(route).filter(
      (c) => counts.get(c.path) && containsAllTerms(normalize(c.title), terms)
    );
    const serviceMatches = services
      .map((service) => ({ service, paths: matchingPaths(service, scope, terms) }))
      .filter((match) => match.paths.length);

    el.searchSummary.textContent = `${categories.length} تصنيف و ${serviceMatches.length} خدمة مطابقة`;
    if (!categories.length && !serviceMatches.length) {
      return emptyState("لم يتم العثور على نتائج مطابقة. جرّب كلمات أخرى.");
    }

    const wrapper = createElement("div");
    if (categories.length) {
      const grid = createElement("div", "card-grid");
      categories.forEach((c) => grid.append(choiceCard({
        title: c.title, crumb: c.crumb, count: counts.get(c.path), href: `#/${c.path}`,
        icon: c.path.includes("/") ? "category" : c.path,
      })));
      wrapper.append(createElement("h2", "result-section-title", "تصنيفات مطابقة"), grid);
    }
    if (serviceMatches.length) {
      const list = createElement("div", "service-list");
      const showPaths = route.length < 3;
      serviceMatches.slice(0, MAX_SEARCH_RESULTS).forEach(({ service, paths }) => {
        const card = serviceCard(service, { showPaths: false });
        if (showPaths) card.querySelector(".service-meta").after(pathLinks(paths));
        list.append(card);
      });
      const title = serviceMatches.length > MAX_SEARCH_RESULTS
        ? `خدمات مطابقة (أول ${MAX_SEARCH_RESULTS} من ${serviceMatches.length})`
        : "خدمات مطابقة";
      wrapper.append(createElement("h2", "result-section-title", title), list);
    }
    return wrapper;
  }

  function scopeLabel(route) {
    if (!route.length) return "كل الخدمات";
    const type = data.taxonomy[route[0]];
    if (route.length === 1) return `خدمات ${type.label}`;
    const persona = type.personas[route[1]];
    return route.length === 2 ? `خدمات ${persona.label}` : `خدمات ${persona.groups[route[2]]}`;
  }

  // ---------- التوجيه ----------

  /** يقرأ المسار من عنوان الصفحة ويتجاهل أي أجزاء غير معرّفة في الهيكل. */
  function parseRoute() {
    const [typeKey, personaKey, groupKey] = decodeURIComponent(location.hash.replace(/^#\/?/, "")).split("/");
    const type = data.taxonomy[typeKey];
    if (!type) return [];
    const persona = type.personas[personaKey];
    if (!persona) return [typeKey];
    if (!(groupKey in persona.groups)) return [typeKey, personaKey];
    return [typeKey, personaKey, groupKey];
  }

  function render() {
    const services = publishedServices;
    const query = el.search.value.trim();
    el.back.hidden = !location.hash || location.hash === "#/";

    const counts = countByPrefix(services);
    const route = parseRoute();
    el.search.placeholder = `ابحث في ${scopeLabel(route)} باسم الخدمة أو التصنيف الرئيسي أو الفرعي...`;
    el.searchSummary.textContent = "";
    const crumbs = [{ label: "دليل الخدمات الإلكترونية", href: GUIDE_PAGE }, { label: "رحلة المستفيد", href: "#/" }];
    let view;
    if (route.length === 0) {
      view = renderTypes(counts);
    } else if (route.length === 1) {
      view = renderPersonas(route[0], counts);
    } else if (route.length === 2) {
      view = renderGroups(route[0], route[1], counts);
    } else {
      view = renderServices(route.join("/"), services);
    }
    const type = route[0] && data.taxonomy[route[0]];
    if (type) crumbs.push({ label: type.label, href: `#/${route[0]}` });
    if (route[1]) crumbs.push({ label: type.personas[route[1]].label, href: `#/${route[0]}/${route[1]}` });
    if (route[2]) crumbs.push({ label: type.personas[route[1]].groups[route[2]], href: `#/${route.join("/")}` });
    renderBreadcrumb(crumbs);
    el.content.replaceChildren(query.length >= MIN_SEARCH_LENGTH ? renderSearchResults(route, services, query) : view);
  }

  /** يختار نوع الترخيص ثم الإجراء نيابة عن المستفيد، كما لو ضغط عليهما بنفسه. */
  function preselectAction(actionName) {
    const servicesById = new Map(data.services.map((s) => [s.id, s]));
    for (const card of el.content.querySelectorAll(".service-card")) {
      const service = servicesById.get(card.dataset.serviceId);
      const action = service && service.actions.find((a) => a.name === actionName);
      if (!action) continue;
      const stageButton = [...card.querySelectorAll(".stage-button")].find((b) => b.dataset.stage === action.stage);
      if (stageButton) stageButton.click();
      const chip = [...card.querySelectorAll(".action-chip")].find((c) => c.title === actionName);
      if (chip) {
        chip.click();
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    console.warn(`لم يُعثر على الإجراء المطلوب في نتائج الرحلة: ${actionName}`);
  }

  function goBack() {
    const route = parseRoute();
    location.hash = "#/" + route.slice(0, -1).join("/");
  }

  window.addEventListener("hashchange", () => {
    el.search.value = "";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  el.search.addEventListener("input", render);
  el.back.addEventListener("click", goBack);
  // يسمح لصفحة الدليل بفتح الرحلة على خدمة وإجراء محددين: journey.html?q=اسم الخدمة&action=اسم الإجراء#/المسار
  const params = new URLSearchParams(location.search);
  el.search.value = params.get("q") || "";
  render();
  if (params.get("action")) preselectAction(params.get("action"));
})();
