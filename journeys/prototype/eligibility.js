/**
 * منطق التحقق من الأهلية وحساب الرسوم (دوال نقية بلا DOM لتسهيل اختبارها).
 * يُستخدم في المتصفح عبر window.NaamaEligibility وفي الاختبارات عبر require.
 */
(function (root) {
  "use strict";

  const MAX_UNITS = 1000;

  /**
   * يعيد أسئلة الخدمة والإجراء معًا بلا تكرار، بعد استبعاد الأسئلة
   * المخصصة لأنواع مستفيد أخرى (مثل السجل التجاري للشركات فقط).
   */
  function questionsFor(questionIds, typeKey, questionBank) {
    const unique = [...new Set(questionIds)];
    return unique
      .map((id) => {
        const question = questionBank[id];
        if (!question) throw new Error(`سؤال أهلية غير معرّف: ${id}`);
        return { id, ...question };
      })
      .filter((q) => !q.for_types || q.for_types.includes(typeKey));
  }

  /**
   * يقارن الإجابات بالإجابة المطلوبة لكل سؤال.
   * @param answers كائن {questionId: true|false}
   * @returns {{eligible: boolean, reasons: string[], failed: object[], unanswered: string[]}}
   */
  function evaluate(questions, answers) {
    const unanswered = questions.filter((q) => typeof answers[q.id] !== "boolean").map((q) => q.id);
    const failed = questions.filter((q) => typeof answers[q.id] === "boolean" && answers[q.id] !== q.expect);
    return {
      eligible: !unanswered.length && !failed.length,
      reasons: failed.map((q) => q.reason),
      failed,
      unanswered,
    };
  }

  const NEW_ISSUE = "إصدار جديد";

  /**
   * الخطوة التالية لكل شرط غير مستوفى: خدمة في نما تحل السبب، أو جهة خارجية،
   * أو المرحلة السابقة من نفس الترخيص. الأسئلة غير المذكورة هنا تُعرض بنص السبب فقط.
   */
  const QUALIFY_FIXES = {
    has_initial_license: {
      how: "أصدر الترخيص المبدئي لنفس النشاط أولًا، ثم عد إلى هذا الإجراء.",
      sameServiceStage: "initial", operation: NEW_ISSUE,
    },
    has_construction_license: {
      how: "أكمل الترخيص الإنشائي ونفّذ المشروع وفق المخططات، ثم اطلب الترخيص التشغيلي.",
      sameServiceStage: "construction", operation: NEW_ISSUE,
    },
    existing_license: {
      how: "أصدر الترخيص أولًا، ثم يمكنك تجديده أو تعديله.",
      sameServiceOperation: NEW_ISSUE,
    },
    agricultural_register: {
      how: "سجّل موقعك الزراعي في الوزارة؛ هذا السجل أساس معظم الخدمات الزراعية.",
      service: "تسجيل موقع زراعي جديد",
    },
    palm_farm_registered: {
      how: "سجّل مزرعة النخيل في السجل الزراعي مع أعداد النخيل وأصنافه.",
      service: "تسجيل موقع زراعي جديد",
    },
    breeder_record: {
      how: "أصدر سجل المربي أولًا ليثبت حيازتك للماشية.",
      service: "إصدار سجل مربي",
    },
    livestock_owned: {
      how: "رقّم الماشية باسمك عبر خدمة الترقيم حتى تُثبت الملكية.",
      service: "طلب ترقيم الماشية",
    },
    horse_registered: {
      how: "سجّل الخيل باسمك في سجلات الخيل.",
      service: "تسجيل بيانات الخيل",
    },
    apiary_registered: {
      how: "أصدر رخصة المنحل وسجّله في السجل الزراعي لمربي النحل.",
      service: "رخصة منحل أفراد", operation: NEW_ISSUE,
    },
    licensed_water_source: {
      how: "احصل على رخصة استخدام مصدر المياه الجوفية قبل طلب الاستخدام أو التعديل.",
      service: "إصدار رخص استخدام مصادر المياه الجوفية ( الابار )",
    },
    valid_well_license: {
      how: "احصل على رخصة البئر المطلوبة (حفر أو تعميق أو تنظيف أو ردم) قبل إنشاء أمر العمل.",
      service: "رخصة حفر بئر جديدة",
    },
    animal_vaccinated: {
      how: "حصّن الحيوانات من العيادة البيطرية واحتفظ بشهادات التحصين السارية.",
      service: "طلب موعد لزيارة العيادة البيطرية",
    },
    importer_qualified: {
      how: "سجّل المنشأة كمستورد مؤهل في نظام الوزارة قبل طلب إذن الاستيراد.",
      service: "طلب تأهيل مستورد سلع أخرى",
    },
    duplicate_report: {
      how: "يوجد بلاغ قائم بنفس الموضوع. تابع حالته من خدمة الاستعلام.",
      service: "الاستعلام عن المعاملات",
    },
    unpaid_violations: {
      how: "سدّد المخالفات والغرامات القائمة على الترخيص من حسابك في منصة نما، ثم أعد التحقق.",
    },
    fishing_violations: {
      how: "سدّد مخالفات الصيد القائمة ثم أعد التقديم.",
    },
    site_ready_inspection: {
      how: "جهّز المشروع للمعاينة الميدانية (اكتمال الإنشاء والاشتراطات) ثم أعد التقديم.",
    },
    commercial_register: {
      how: "أصدر سجلًا تجاريًا ساريًا يتضمن النشاط من وزارة التجارة.",
      url: "https://mc.gov.sa", label: "وزارة التجارة",
    },
    municipal_license: {
      how: "أصدر رخصة بلدية سارية للموقع والنشاط من منصة بلدي.",
      url: "https://balady.gov.sa", label: "منصة بلدي",
    },
    nonprofit_license: {
      how: "سجّل الجهة لدى المركز الوطني لتنمية القطاع غير الربحي وتأكد أن الترخيص ساري.",
      url: "https://ncnp.gov.sa", label: "المركز الوطني لتنمية القطاع غير الربحي",
    },
    environmental_approval: {
      how: "احصل على تصريح بيئي ساري من المركز الوطني للرقابة على الالتزام البيئي.",
      url: "https://www.ncec.gov.sa", label: "المركز الوطني للرقابة على الالتزام البيئي",
    },
    civil_defense: {
      how: "أصدر شهادة سلامة سارية للموقع من الدفاع المدني.",
      url: "https://www.998.gov.sa", label: "الدفاع المدني",
    },
    health_classification: {
      how: "أصدر تصنيفًا مهنيًا ساريًا من الهيئة السعودية للتخصصات الصحية.",
      url: "https://www.scfhs.org.sa", label: "الهيئة السعودية للتخصصات الصحية",
    },
    engineers_council: {
      how: "سجّل المهندس المختص في الهيئة السعودية للمهندسين.",
      url: "https://www.saudieng.sa", label: "الهيئة السعودية للمهندسين",
    },
    supplier_registered: {
      how: "سجّل المنشأة في منصة اعتماد كمورد حكومي.",
      url: "https://tenders.etimad.sa", label: "منصة اعتماد",
    },
    land_document: {
      how: "استخرج صك ملكية أو وثّق عقد الإيجار من منصة ناجز.",
      url: "https://najiz.sa", label: "منصة ناجز",
    },
  };

  function findPublishedService(name, services) {
    if (!name || !Array.isArray(services)) return null;
    const matches = services.filter((s) => s.published && s.name === name);
    return matches.length === 1 ? matches[0] : null;
  }

  function findAction(service, { stage, operation } = {}) {
    if (!service || !Array.isArray(service.actions) || (!stage && !operation)) return null;
    return service.actions.find((a) =>
      (!operation || a.operation === operation) && (!stage || a.stage === stage)
    ) || null;
  }

  /** يتجاهل الرابط إذا كان يشير لنفس الإجراء الذي يتحقق المستفيد منه الآن. */
  function skipCurrentAction(service, action, currentAction) {
    if (action && currentAction && action.name === currentAction.name) return { service: null, action: null };
    return { service, action };
  }

  /**
   * يحوّل الشروط غير المستوفاة إلى خطوات عملية: ماذا يفعل المستفيد، وأين يبدأ.
   * @returns {Array<{id, reason, how, service, action, url, linkLabel}>}
   */
  function howToQualify(failedQuestions, context = {}) {
    const { services, currentService, currentAction } = context;
    return failedQuestions.map((question) => {
      const fix = QUALIFY_FIXES[question.id] || {};
      let service = null;
      let action = null;
      if (fix.sameServiceStage && currentService) {
        action = findAction(currentService, { stage: fix.sameServiceStage, operation: fix.operation || NEW_ISSUE });
        ({ service, action } = skipCurrentAction(currentService, action, currentAction));
      } else if (fix.sameServiceOperation && currentService) {
        const stage = currentAction && currentAction.stage;
        action = findAction(currentService, { stage, operation: fix.sameServiceOperation })
          || findAction(currentService, { operation: fix.sameServiceOperation });
        ({ service, action } = skipCurrentAction(currentService, action, currentAction));
      } else if (fix.service) {
        service = findPublishedService(fix.service, services);
        action = service ? findAction(service, fix) : null;
      }
      const url = service ? null : (fix.url || null);
      return {
        id: question.id,
        reason: question.reason,
        how: fix.how || question.reason,
        service,
        action,
        url,
        linkLabel: service ? (action ? action.name : service.name) : (fix.label || null),
      };
    });
  }

  function formatAmount(amount) {
    return `${Number(amount).toLocaleString("en-US")} ريال`;
  }

  /** وصف الرسوم قبل أي إدخال من المستفيد. */
  function describeFee(fee) {
    switch (fee && fee.kind) {
      case "free": return "الخدمة مجانية";
      case "fixed": return `رسوم الخدمة: ${formatAmount(fee.amount)}`;
      case "study": return fee.amount
        ? `تُحدد الرسوم بعد دراسة الطلب، مع رسوم فتح طلب ${formatAmount(fee.amount)}`
        : "تُحدد الرسوم بعد دراسة الطلب";
      case "calculator": return "تُحسب الرسوم حسب البيانات التي تدخلها أدناه";
      case "text": return fee.text;
      default: return "لم تُحدد رسوم هذه الخدمة في دليل الخدمات";
    }
  }

  /**
   * يحسب رسوم الحاسبة من اختيار المستفيد وعدد الوحدات.
   * @returns {{amount: number}|{error: string}}
   */
  function calculateFee(calculator, optionIndex, units) {
    const option = calculator.options[optionIndex];
    if (!option) return { error: `يرجى اختيار ${calculator.options_label}.` };
    if (!option.per_unit) return { amount: option.amount };
    if (!Number.isInteger(units) || units < 1 || units > MAX_UNITS) {
      return { error: `يرجى إدخال ${calculator.unit_label} كرقم صحيح بين 1 و ${MAX_UNITS}.` };
    }
    return { amount: option.amount * units };
  }

  const api = {
    questionsFor, evaluate, howToQualify, QUALIFY_FIXES, describeFee, calculateFee, formatAmount, MAX_UNITS,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NaamaEligibility = api;
})(typeof window !== "undefined" ? window : globalThis);
