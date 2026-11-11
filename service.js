/**
 * صفحة تفاصيل الخدمة: الشروط والأحكام، الخطوات، المستندات، والخدمات المرتبطة.
 * البيانات من الدليل؛ شروط الأهلية نموذجية إلى أن تعتمدها الجهة المالكة.
 */
(function () {
  "use strict";

  const root = document.getElementById("service-root");
  const data = window.NAAMA_DATA;
  if (!data || !Array.isArray(data.services)) {
    root.textContent = "تعذر تحميل بيانات الخدمات (data.js). شغّل build_journeys.py لإنشائها.";
    return;
  }

  const { createElement, icon, journeyUrl, serviceUrl, urlOrPlatform, NAAMA_PLATFORM_URL } = window.NaamaDom;
  const { questionsFor, describeFee, formatAmount, QUALIFY_FIXES } = window.NaamaEligibility;
  if (typeof serviceUrl !== "function") {
    root.textContent = "تعذر تحميل أدوات الصفحة (dom.js). حدّث الصفحة بدون تخزين مؤقت.";
    return;
  }
  const published = data.services.filter((s) => s.published);
  const byName = new Map(published.map((s) => [s.name, s]));
  const TABS = [
    { id: "overview", label: "نظرة عامة" },
    { id: "steps", label: "الخطوات" },
    { id: "conditions", label: "الشروط" },
    { id: "documents", label: "المستندات المطلوبة" },
  ];
  const DEFAULT_TAB = "conditions";
  const MAX_RELATED = 6;
  const BASE_DOCUMENTS = ["تعبئة نموذج الطلب الإلكتروني عبر منصة نما"];
  const ALWAYS_TERMS = [
    "يلتزم مقدم الطلب بصحة البيانات والمستندات المقدَّمة.",
    "تُطبق الضوابط المعتمدة لدى الوزارة على هذه الخدمة.",
  ];
  const DOCUMENT_BY_QUESTION = {
    commercial_register: "صورة السجل التجاري ساري المفعول ويتضمن النشاط",
    municipal_license: "رخصة بلدية سارية للموقع والنشاط",
    nonprofit_license: "ترخيص ساري من المركز الوطني لتنمية القطاع غير الربحي",
    government_authorization: "خطاب تفويض رسمي من الجهة الحكومية",
    saudi_national: "الهوية الوطنية",
    adult_age: "إثبات الهوية",
    land_document: "صك ملكية أو عقد إيجار موثق للأرض",
    agricultural_register: "السجل الزراعي أو مستند الحيازة المسجلة",
    palm_farm_registered: "إثبات تسجيل مزرعة النخيل",
    breeder_record: "سجل المربي المفعّل",
    livestock_owned: "شهادة ترقيم الماشية باسم مقدم الطلب",
    horse_registered: "شهادة تسجيل الخيل",
    animal_microchip: "إثبات الشريحة الإلكترونية للحيوان",
    animal_vaccinated: "شهادات التحصين السارية",
    apiary_registered: "رخصة المنحل أو إثبات تسجيله",
    licensed_water_source: "رخصة مصدر المياه",
    valid_well_license: "رخصة البئر المطلوبة",
    engineering_design: "تصميم هندسي معتمد من مكتب مرخّص",
    engineers_council: "إثبات تسجيل المهندس في الهيئة السعودية للمهندسين",
    environmental_approval: "التصريح البيئي الساري",
    civil_defense: "شهادة سلامة من الدفاع المدني",
    health_classification: "تصنيف الهيئة السعودية للتخصصات الصحية",
    importer_qualified: "شهادة تأهيل المستورد",
    origin_health_certificate: "شهادة صحية معتمدة من بلد المنشأ",
    organic_certificate: "شهادة إنتاج عضوي سارية",
    vessel_registered: "استمارة الواسطة البحرية سارية من حرس الحدود",
  };

  const params = new URLSearchParams(location.search);
  const service = findService(params.get("id"), params.get("q"));
  const action = findAction(service, params.get("action"));

  if (!service) {
    renderMissing();
    return;
  }

  document.title = `نما | ${service.name}`;
  render(service, action);

  function findService(id, query) {
    if (id) return published.find((s) => s.id === id) || null;
    const name = (query || "").trim();
    if (!name) return null;
    return published.find((s) => s.name === name) || byName.get(name) || null;
  }

  function findAction(target, actionName) {
    if (!target || !actionName) return null;
    return target.actions.find((a) => a.name === actionName) || null;
  }

  function beneficiaryTypes(target) {
    const keys = [...new Set(target.paths.map((path) => path.split("/")[0]))];
    return keys.map((key) => data.taxonomy[key] && data.taxonomy[key].label).filter(Boolean);
  }

  function questionIds(target, currentAction) {
    const ids = [...target.eligibility];
    if (currentAction) ids.push(...currentAction.eligibility);
    else target.actions.forEach((item) => ids.push(...item.eligibility));
    return [...new Set(ids)];
  }

  function questionsOf(target, currentAction) {
    const typeKey = target.paths[0] ? target.paths[0].split("/")[0] : "individual";
    try {
      return questionsFor(questionIds(target, currentAction), typeKey, data.questions);
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  function termsOf(questions) {
    const fromQuestions = questions.map((q) => q.reason).filter(Boolean);
    const seen = new Set();
    return [...fromQuestions, ...ALWAYS_TERMS].filter((text) => {
      if (seen.has(text)) return false;
      seen.add(text);
      return true;
    });
  }

  function documentsOf(questions) {
    const docs = [...BASE_DOCUMENTS];
    const seen = new Set(docs);
    for (const question of questions) {
      const doc = DOCUMENT_BY_QUESTION[question.id];
      if (doc && !seen.has(doc)) {
        seen.add(doc);
        docs.push(doc);
      }
    }
    return docs;
  }

  function relatedOf(target) {
    const seen = new Set([target.id]);
    const out = [];
    const add = (item) => {
      if (!item || seen.has(item.id) || !item.published) return;
      seen.add(item.id);
      out.push(item);
    };
    for (const id of questionIds(target, null)) {
      const fix = QUALIFY_FIXES[id];
      if (fix && fix.service) add(byName.get(fix.service));
    }
    const sameGroup = new Set(target.paths);
    const ranked = published
      .filter((item) => item.id !== target.id)
      .map((item) => {
        let score = 0;
        if (item.category && item.category === target.category) score += 2;
        if (item.sector && item.sector === target.sector) score += 1;
        if (item.paths.some((path) => sameGroup.has(path))) score += 2;
        return { item, score };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, "ar"));
    for (const row of ranked) {
      if (out.length >= MAX_RELATED) break;
      add(row.item);
    }
    return out.slice(0, MAX_RELATED);
  }

  function arCount(n, one, two, few) {
    if (n === 1) return one;
    if (n === 2) return two;
    return `${n} ${few}`;
  }

  function feeLabel(fee) {
    switch (fee && fee.kind) {
      case "free": return "مجانًا";
      case "fixed": return formatAmount(fee.amount);
      case "study": return "تُحدد بعد الدراسة";
      case "calculator": return "تُحسب حسب الطلب";
      case "text": return fee.text || "غير محددة";
      default: return "غير محددة";
    }
  }

  function hasLicenseStages(target) {
    return target.actions.some((item) => item.stage && item.stage !== "general");
  }

  function stepsOf(target) {
    if (hasLicenseStages(target)) {
      return [
        { title: "اسم المشروع", detail: `هذه الخدمة تُعرض باسم المشروع: ${target.name}` },
        { title: "مرحلة الترخيص", detail: "اختر مبدئي أو إنشائي أو تشغيلي." },
        { title: "نوع الطلب", detail: "إصدار أو تجديد أو إلغاء أو نقل ملكية أو الإجراء المطلوب." },
        { title: "استيفاء الشروط والمستندات", detail: "راجع الشروط في هذه الصفحة وجهّز المستندات." },
        { title: "تقديم الطلب", detail: "أكمل الطلب عبر منصة نما." },
      ];
    }
    if (target.actions.length) {
      return [
        { title: "اختيار الإجراء", detail: "حدد العملية المطلوبة من إجراءات هذه الخدمة." },
        { title: "استيفاء الشروط والمستندات", detail: "راجع الشروط في هذه الصفحة وجهّز المستندات." },
        { title: "تقديم الطلب", detail: "أكمل الطلب عبر منصة نما." },
      ];
    }
    return [
      { title: "مراجعة الشروط", detail: "تأكد من انطباق الشروط والأحكام على حالتك." },
      { title: "تجهيز المستندات", detail: "اجمع المستندات المطلوبة قبل بدء الطلب." },
      { title: "تقديم الطلب", detail: "أكمل الطلب عبر منصة نما." },
    ];
  }

  function checkIcon() {
    const mark = createElement("span", "svc-check");
    mark.append(icon("check"));
    return mark;
  }

  function termRow(text) {
    const row = createElement("p", "svc-term");
    row.append(checkIcon(), document.createTextNode(text));
    return row;
  }

  function renderMissing() {
    const box = createElement("div", "container svc-missing");
    box.append(
      createElement("h1", null, "الخدمة غير موجودة"),
      createElement("p", null, "لم يُعثر على هذه الخدمة في الدليل المنشور."),
    );
    const back = createElement("a", "btn btn-primary", "العودة إلى دليل الخدمات");
    back.href = "index.html";
    box.append(back);
    root.replaceChildren(box);
  }

  function crumb() {
    const nav = createElement("nav", "breadcrumb");
    nav.setAttribute("aria-label", "مسار التنقل");
    const home = createElement("a", null, "الرئيسية");
    home.href = NAAMA_PLATFORM_URL;
    home.target = "_blank";
    home.rel = "noopener noreferrer";
    const guide = createElement("a", null, "دليل الخدمات الإلكترونية");
    guide.href = "index.html";
    const current = createElement("a", null, service.name);
    current.href = serviceUrl(service, action);
    current.setAttribute("aria-current", "page");
    nav.append(home, createElement("span", "sep", "›"), guide, createElement("span", "sep", "›"), current);
    return nav;
  }

  function tags() {
    const list = createElement("div", "svc-tags");
    for (const label of [service.sector, service.category, service.system]) {
      if (label) list.append(createElement("span", null, label));
    }
    return list;
  }

  function facts(types) {
    const items = [
      ["individual", types.join(" ، ") || "غير محدد", "المستفيد المستهدف"],
      ["globe", "العربية", "لغة الخدمة"],
      ["clock", "5-7 أيام", "المدة الزمنية"],
      ["bolt", "فوري", "مدة التجاوب"],
      ["coin", feeLabel(service.fee), "رسوم الخدمة"],
    ];
    const list = createElement("ul", "svc-facts");
    for (const [iconKey, value, label] of items) {
      const li = createElement("li");
      const mark = createElement("span", "svc-fact-icon");
      mark.append(icon(iconKey));
      li.append(mark, createElement("strong", null, value), createElement("span", null, label));
      list.append(li);
    }
    return list;
  }

  function hero(related) {
    const section = createElement("section", "svc-hero");
    const wrap = createElement("div", "container svc-hero-grid");
    const main = createElement("div");
    main.append(crumb(), createElement("h1", null, service.name), tags());
    if (service.desc) main.append(createElement("p", "svc-desc", service.desc));
    if (related.length) {
      const link = createElement("a", "svc-related-count", `${related.length} خدمات ذات صلة`);
      link.href = "#related";
      link.prepend(icon("link"));
      main.append(link);
    }
    const side = createElement("div", "svc-hero-side");
    const actions = createElement("div", "svc-hero-actions");
    const request = createElement("a", "btn btn-primary", "طلب الخدمة");
    request.href = journeyUrl(service, action);
    const check = createElement("button", "btn btn-outline", "تحقق من انطباق الشروط عليك");
    check.type = "button";
    check.addEventListener("click", () => openEligibility());
    actions.append(request, check);
    side.append(actions, facts(beneficiaryTypes(service)));
    wrap.append(main, side);
    section.append(wrap);
    return section;
  }

  function tabButton(tab, selected) {
    const button = createElement("button", null, tab.label);
    button.type = "button";
    button.id = `tab-${tab.id}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", `panel-${tab.id}`);
    button.setAttribute("aria-selected", String(tab.id === selected));
    button.addEventListener("click", () => selectTab(tab.id));
    return button;
  }

  function selectTab(tabId) {
    root.querySelectorAll("[role='tab']").forEach((button) => {
      button.setAttribute("aria-selected", String(button.id === `tab-${tabId}`));
    });
    root.querySelectorAll("[role='tabpanel']").forEach((panel) => {
      panel.hidden = panel.id !== `panel-${tabId}`;
    });
    const next = `#${tabId}`;
    if (location.hash !== next) history.replaceState(null, "", `${location.pathname}${location.search}${next}`);
  }

  function overviewPanel(questions, related) {
    const panel = createElement("div", "svc-panel");
    panel.id = "panel-overview";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", "tab-overview");
    panel.append(createElement("p", null, service.desc || "لا يتوفر وصف مختصر لهذه الخدمة في الدليل."));
    panel.append(createElement("p", null, describeFee(service.fee)));
    panel.append(createElement("p", "svc-note",
      `تصنيف الخدمة: ${service.category || "غير مصنّف"} · ${arCount(questions.length, "شرط واحد", "شرطان", "شروط")} للمراجعة قبل التقديم · ${arCount(related.length, "خدمة مرتبطة", "خدمتان مرتبطتان", "خدمات مرتبطة")}.`));
    return panel;
  }

  function stepsPanel() {
    const panel = createElement("div", "svc-panel");
    panel.id = "panel-steps";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", "tab-steps");
    const list = createElement("ol", "svc-steps");
    stepsOf(service).forEach((step, index) => {
      const li = createElement("li");
      const body = createElement("div");
      body.append(createElement("strong", null, step.title), createElement("span", null, step.detail));
      li.append(createElement("b", null, String(index + 1)), body);
      list.append(li);
    });
    panel.append(list);
    return panel;
  }

  function conditionsPanel(questions) {
    const panel = createElement("div", "svc-panel");
    panel.id = "panel-conditions";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", "tab-conditions");
    const terms = termsOf(questions);
    terms.forEach((text) => panel.append(termRow(text)));
    panel.append(createElement("p", "svc-note", "الشروط نموذجية للمراجعة الداخلية حتى تعتمدها الجهة المالكة لكل خدمة."));
    return panel;
  }

  function documentsPanel(questions) {
    const panel = createElement("div", "svc-panel");
    panel.id = "panel-documents";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", "tab-documents");
    documentsOf(questions).forEach((text) => {
      const row = createElement("p", "svc-doc");
      row.append(checkIcon(), document.createTextNode(text));
      panel.append(row);
    });
    return panel;
  }

  function relatedSection(related) {
    if (!related.length) return createElement("div");
    const section = createElement("section", "svc-related");
    section.id = "related";
    section.append(createElement("h2", null, "خدمات ذات صلة"));
    const list = createElement("ul", "svc-related-list");
    for (const item of related) {
      const li = createElement("li");
      const link = createElement("a");
      link.href = serviceUrl(item);
      const text = createElement("div");
      text.append(createElement("strong", null, item.name));
      if (item.category) text.append(createElement("span", null, item.category));
      link.append(text, createElement("em", null, "اطّلع ←"));
      li.append(link);
      list.append(li);
    }
    section.append(list);
    return section;
  }

  function aside() {
    const col = createElement("aside", "svc-aside");
    const channels = createElement("div");
    channels.append(createElement("h2", null, "قنوات تقديم الخدمة"), createElement("p", "svc-channel", "إلكتروني عبر منصة نما"));
    const faq = createElement("div");
    faq.append(createElement("h2", null, "الأسئلة الشائعة"));
    const faqList = createElement("ul");
    const faqLink = createElement("a", null, "الأسئلة الشائعة في منصة نما");
    faqLink.href = NAAMA_PLATFORM_URL;
    faqLink.target = "_blank";
    faqLink.rel = "noopener noreferrer";
    const faqItem = createElement("li");
    faqItem.append(faqLink);
    faqList.append(faqItem);
    faq.append(faqList);
    const contact = createElement("div");
    contact.append(createElement("h2", null, "تواصل معنا"));
    const contactList = createElement("ul");
    contactList.append(
      createElement("li", "svc-contact-item", "الرقم الموحد: 939"),
      createElement("li", "svc-contact-item", "E-services@mewa.gov.sa"),
    );
    contact.append(contactList);
    col.append(channels, faq, contact);
    return col;
  }

  function openEligibility() {
    const typeKey = service.paths[0] ? service.paths[0].split("/")[0] : "individual";
    window.NaamaEligibilityDialog.open({
      title: service.name,
      subtitle: action ? `${data.licenseStages[action.stage] || ""} › ${action.operation}` : "",
      url: urlOrPlatform(action ? action.url : service.url),
      fee: service.fee,
      questions: questionsOf(service, action),
      service,
      action,
      typeKey,
      services: published,
    });
  }

  function render(target, currentAction) {
    const questions = questionsOf(target, currentAction);
    const related = relatedOf(target);
    const requestedTab = (location.hash || "").replace("#", "");
    const selectedTab = TABS.some((tab) => tab.id === requestedTab) ? requestedTab : DEFAULT_TAB;

    const layout = createElement("div", "container svc-layout");
    const main = createElement("div");
    const tabs = createElement("div", "svc-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "تفاصيل الخدمة");
    TABS.forEach((tab) => tabs.append(tabButton(tab, selectedTab)));

    const overview = overviewPanel(questions, related);
    const steps = stepsPanel();
    const conditions = conditionsPanel(questions);
    const documents = documentsPanel(questions);
    overview.hidden = selectedTab !== "overview";
    steps.hidden = selectedTab !== "steps";
    conditions.hidden = selectedTab !== "conditions";
    documents.hidden = selectedTab !== "documents";

    main.append(tabs, overview, steps, conditions, documents);
    layout.append(main, aside());
    const relatedWrap = createElement("div", "container");
    relatedWrap.append(relatedSection(related));
    root.replaceChildren(hero(related), layout, relatedWrap);
    if (requestedTab === "related") {
      document.getElementById("related")?.scrollIntoView();
    }

    window.addEventListener("hashchange", () => {
      const id = (location.hash || "").replace("#", "");
      if (TABS.some((tab) => tab.id === id)) selectTab(id);
      if (id === "related") document.getElementById("related")?.scrollIntoView({ behavior: "smooth" });
    });
  }
})();
