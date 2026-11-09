/**
 * رحلات "أحداث الحياة والأعمال": هدف يريده المستفيد (مثل بدء مشروع دواجن)
 * وخطوات مرتبة من خدمات الدليل. الخطوات تشير للخدمة باسمها لأن معرّفات المصدر غير فريدة،
 * والاختبارات تتحقق أن كل اسم يطابق خدمة منشورة واحدة.
 * يُستخدم في المتصفح عبر window.NaamaLifeEvents وفي الاختبارات عبر require.
 */
(function (root) {
  "use strict";

  const NEW_ISSUE = "إصدار جديد";

  const LIFE_EVENTS = [
    {
      id: "poultry-project",
      type: "company",
      title: "بدء مشروع دواجن لاحم",
      summary: "من الترخيص المبدئي حتى تشغيل المشروع، مع مصدر المياه والعمالة.",
      steps: [
        { title: "احصل على الترخيص المبدئي", why: "يثبت موافقة الوزارة على فكرة المشروع وموقعه قبل البدء في الإنشاء.",
          service: "إنتاج الدجاج اللاحم", stage: "initial", operation: NEW_ISSUE },
        { title: "رخّص مصدر المياه", why: "إذا كان المشروع يحتاج بئرًا خاصة، فاحصل على رخصة الحفر قبل الإنشاء.",
          service: "رخصة حفر بئر جديدة", optional: true },
        { title: "احصل على الترخيص الإنشائي", why: "يسمح لك ببناء العنابر والمرافق وفق الاشتراطات الفنية.",
          service: "إنتاج الدجاج اللاحم", stage: "construction", operation: NEW_ISSUE },
        { title: "اطلب العمالة الزراعية", why: "استقدم العمالة اللازمة لتشغيل المشروع بعد اكتمال الإنشاء.",
          service: "طلب عمالة زراعية", optional: true },
        { title: "احصل على الترخيص التشغيلي", why: "يسمح لك ببدء الإنتاج بعد معاينة المشروع والتأكد من جاهزيته.",
          service: "إنتاج الدجاج اللاحم", stage: "operational", operation: NEW_ISSUE },
      ],
    },
    {
      id: "new-farmer",
      type: "individual",
      title: "أصبحت مزارعًا",
      summary: "سجّل مزرعتك، ورخّص مصدر المياه، واستفد من برامج الدعم.",
      steps: [
        { title: "سجّل موقعك الزراعي", why: "تسجيل المزرعة هو الأساس لأغلب الخدمات الزراعية وبرامج الدعم.",
          service: "تسجيل موقع زراعي جديد" },
        { title: "رخّص البئر", why: "حفر الآبار يحتاج رخصة مسبقة لحماية المياه الجوفية.",
          service: "رخصة حفر بئر جديدة", optional: true },
        { title: "اطلب العمالة الزراعية", why: "إذا كانت مزرعتك تحتاج عمالة دائمة.",
          service: "طلب عمالة زراعية", optional: true },
        { title: "قدّم على برنامج الدعم الريفي", why: "دعم مالي وفني لصغار المزارعين لتطوير الإنتاج.",
          service: "طلب الدعم في برنامج التنمية الريفية الزراعية المستدامة", optional: true },
      ],
    },
    {
      id: "new-fisher",
      type: "individual",
      title: "أصبحت صيادًا",
      summary: "رخصة الصيد، ثم رخصة القارب، ثم رخص العاملين معك.",
      steps: [
        { title: "احصل على رخصة الصيد", why: "لا يُسمح بالصيد التجاري دون رخصة سارية.",
          service: "رخصة صيد حرفي", operation: NEW_ISSUE },
        { title: "رخّص الواسطة البحرية", why: "كل قارب صيد يحتاج رخصة مستقلة.",
          service: "رخصة واسطة بحرية", operation: NEW_ISSUE },
        { title: "رخّص العاملين معك", why: "إذا كان معك عمال صيد على القارب.",
          service: "رخصة عامل صيد", operation: NEW_ISSUE, optional: true },
        { title: "قدّم على برنامج الدعم الريفي", why: "دعم لصغار الصيادين لتطوير معداتهم.",
          service: "طلب الدعم في برنامج التنمية الريفية الزراعية المستدامة", optional: true },
      ],
    },
    {
      id: "livestock-breeder",
      type: "individual",
      title: "بدء تربية الماشية",
      summary: "سجل المربي وترقيم الماشية ثم برامج الدعم والتسويق.",
      steps: [
        { title: "أصدر سجل المربي", why: "يثبت حيازتك للماشية ويؤهلك لباقي الخدمات.",
          service: "إصدار سجل مربي" },
        { title: "رقّم ماشيتك", why: "الترقيم إلزامي لتتبع صحة الماشية وملكيتها.",
          service: "طلب ترقيم الماشية" },
        { title: "قدّم على دعم صغار المربين", why: "دعم مالي لمربي الماشية الذين تنطبق عليهم الشروط.",
          service: "برنامج دعم صغار مربي الماشية", optional: true },
        { title: "احجز موعد المسلخ", why: "عند الحاجة لذبح الماشية في مسلخ معتمد.",
          service: "حجز موعد مسلخ", optional: true },
      ],
    },
    {
      id: "import-produce",
      type: "company",
      title: "استيراد خضار وفواكه",
      summary: "رخصة الاستيراد أولًا، ثم إذن الاستيراد لكل شحنة.",
      steps: [
        { title: "احصل على رخصة الاستيراد", why: "رخصة سنوية تؤهل منشأتك لاستيراد الخضار والفواكه الطازجة.",
          service: "رخصة استيراد الخضروات والفواكه الطازجة", operation: NEW_ISSUE },
        { title: "اطلب إذن الاستيراد للشحنة", why: "يُطلب لكل شحنة قبل وصولها للمنفذ.",
          service: "إذن استيراد خضار وفواكه" },
      ],
    },
  ];

  /** يعيد الخدمة المنشورة الوحيدة بهذا الاسم، أو خطأ يوضح المشكلة. */
  function findService(name, services) {
    const matches = services.filter((s) => s.published && s.name === name);
    if (matches.length !== 1) return { error: `الخدمة "${name}" مطابقة لـ ${matches.length} خدمة منشورة بدلًا من واحدة` };
    return { service: matches[0] };
  }

  function findAction(service, step) {
    if (!step.operation) return { action: null };
    const action = service.actions.find((a) => a.operation === step.operation && (!step.stage || a.stage === step.stage));
    if (!action) return { error: `لا يوجد إجراء "${step.operation}" ${step.stage || ""} في خدمة "${service.name}"` };
    return { action };
  }

  /**
   * يربط خطوات الحدث بخدمات الدليل وإجراءاتها.
   * @returns {{steps: Array<{step, service, action}>, errors: string[]}}
   */
  function resolveLifeEvent(event, services) {
    const steps = [];
    const errors = [];
    for (const step of event.steps) {
      const found = findService(step.service, services);
      const matched = found.service ? findAction(found.service, step) : found;
      if (matched.error) errors.push(matched.error);
      else steps.push({ step, service: found.service, action: matched.action });
    }
    return { steps, errors };
  }

  /** نسبة الإنجاز محسوبة على الخطوات الإلزامية فقط، لأن الاختيارية قد لا تنطبق على المستفيد. */
  function progress(event, doneIndexes) {
    const done = new Set(doneIndexes);
    const required = event.steps.map((s, i) => [s, i]).filter(([s]) => !s.optional);
    const requiredDone = required.filter(([, i]) => done.has(i)).length;
    return { requiredDone, requiredTotal: required.length, complete: requiredDone === required.length };
  }

  /** صيغة العدد العربية للخطوات: خطوة واحدة، خطوتان، 3-10 خطوات، 11 فأكثر خطوة. */
  function stepsLabel(count) {
    if (count === 1) return "خطوة واحدة";
    if (count === 2) return "خطوتان";
    return count <= 10 ? `${count} خطوات` : `${count} خطوة`;
  }

  const api = { LIFE_EVENTS, resolveLifeEvent, progress, stepsLabel };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NaamaLifeEvents = api;
})(typeof window !== "undefined" ? window : globalThis);
