/**
 * مساعد نما الذهبي الذكي (Virtual Smart Assistant for Naama Platform)
 * - فهم متقدم للغة الطبيعية واللهجة السعودية.
 * - إدراك للنوايا: الشروط والأهلية، الرسوم، المسارات التراكمية، الإجراءات (تجديد، نقل، إلغاء)، وأرقام الدعم.
 * - ذاكرة سياقية متعددة الأدوار (Multi-turn Context Memory).
 * - بطاقات خدمات غنية وأزرار تقديم تفاعلية وفحص فوري للأهلية.
 */
(function (root) {
  "use strict";

  const GREETING = "أنا مساعد نما الذهبي الذكي. صفّ لي هدفك — مثل «أبي أفتح مزرعة»، «وش شروط رخصة البئر»، أو «كم رسوم سجل المربي» — وسأرتّب لك المسار والشروط، لا مجرد قائمة نتائج.";

  const SUPPORT_INFO = {
    phone: "939",
    hours: "متاح على مدار الساعة (24/7)",
    mewa_url: "https://www.mewa.gov.sa",
    portal_url: "https://naama.sa",
  };

  const EVENT_KEYS = {
    "new-farmer": ["مزرع", "فلاح", "حيازه", "سجل زراعي", "ارض زراعي", "زراعه"],
    "organic-farmer": ["عضوي", "اورجانيك", "زراعه عضويه", "شعار عضوي"],
    "new-fisher": ["صيد", "صياد", "سمك", "قارب", "لنش", "بحاره", "واسطه بحريه"],
    "livestock-breeder": ["ماشيه", "غنم", "بقر", "ابل", "تربية الماشية", "حلال", "خراف", "بهم"],
    "new-beekeeper": ["نحل", "عسل", "منحل", "نحال", "طوائف نحل"],
    "horse-owner": ["خيل", "حصان", "مربط", "افراس", "شهاده خيل", "خيول"],
    "poultry-project": ["دواجن", "دجاج لاحم", "فروج", "مداجن", "مفقسات", "مفارخ"],
    "greenhouse-project": ["بيوت محميه", "بيت محمي", "صوبه", "بيوت بلاستيكيه", "زراعه مائيه"],
    "aquaculture-project": ["استزراع", "سمك مزرع", "احياء مائيه", "احواض سمك"],
    "vet-clinic": ["عياده بيطري", "عيادة بيطري", "طبيب بيطري", "صيدليه بيطريه"],
    "import-produce": ["استيراد خضار", "استيراد فواكه", "شحن خضار", "فسح زراعي"],
    "firewood-trade": ["حطب", "فحم", "احتطاب", "بيع حطب"],
    "dam-project": ["سد", "سدود", "محطه تحليه"],
    "public-works": ["مرافق عامه", "اشغال", "بنيه تحتيه"],
    "research-project": ["بحث علمي", "عينات بحث", "جامعه", "مختبر"],
    "environmental-initiative": ["مبادره بيئيه", "تشجير", "شتل", "غطاء نباتي"],
    "rural-families": ["اسر ريفيه", "تنميه ريفيه", "ريف", "دعم ريف"],
    "pet-travel": ["حيوان اليف", "قطه", "كلب", "سفر مع حيوان", "جواز حيوان"],
    "camping-trip": ["تخييم", "كرافان", "بر", "مخيم", "متنزه"],
  };

  // مرادفات وكلمات شائعة باللهجة السعودية والمصطلحات الزراعية
  const DIALECT_SYNONYMS = [
    { target: "رخصة حفر بئر جديدة", words: ["حفر بير", "حفر بئر", "رخصة بئر جديدة", "رخصة حفر"] },
    { target: "إصدار سجل مربي", words: ["كرت مربي", "بطاقة مربي", "كارت مربي", "سجل الحلال", "سجل مربي", "اطلع سجل مربي"] },
    { target: "طلب ترقيم الماشية", words: ["شريحة", "شريحه", "ارقم", "ترقيم", "ارقام حلال", "ترقيم الماشية", "ترقيم ماشية"] },
    { target: "تسجيل موقع زراعي جديد", words: ["تسجيل مزرعة", "حيازة", "حيازه", "كرت مزارع", "حصر زراعي", "سجل زراعي جديد"] },
    { target: "طلب عمالة زراعية", words: ["عمال", "عماله", "عامل زراعي", "كفالة زراعية", "استقدام مزارع"] },
    { target: "طلب الدعم في برنامج التنمية الريفية الزراعية المستدامة", words: ["دعم ريف", "اعانة ريف", "تنمية ريفية", "دعم صغار المزارعين", "برنامج ريف"] },
    { target: "رخصة منحل أفراد", words: ["رخصة منحل", "تصريح منحل", "ترخيص منحل"] },
    { target: "رخصة صيد حرفي", words: ["رخصة صيد", "تصريح صيد", "رخصة صياد"] },
    { target: "رخصة واسطة بحرية", words: ["رخصة قارب", "رخصة لنش", "واسطة بحرية"] },
    { target: "خدمة مقابلة المعالي", words: ["مقابلة الوزير", "مقابلة المعالي", "لقاء الوزير", "موعد الوزير", "موعد معالي"] },
    { target: "خدمة حجز موعد (ميعاد)", words: ["حجز موعد", "ميعاد", "مواعيد ميعاد", "حجز ميعاد"] },
  ];

  function normalize(text) {
    return (text || "")
      .replace(/[\u064B-\u0652\u0640]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[؟،؛?!.,:;ـ\-\(\)\[\]\{\}\/\\"'`~*&^%$#@+=_<>|]/g, " ")
      .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function cleanIntentQuery(norm) {
    if (!norm) return "";
    let s = " " + norm + " ";
    s = s.replace(/\s+(ما\s+هي|ما\s+هو|وش\s+هي|وش\s+هو|ماهي|ماهو|كم\s+هي|كم\s+هو|وش|ما|كم|كيف|ممكن\s+اعرف|ودي\s+اعرف|ابي\s+اعرف|ابغى\s+اعرف|ابي|ابغى|اريد|ودي|ارغب\s+في|ارغب)\s+/g, " ");
    s = s.replace(/\s+(شروط|شرط|متطلبات|متطلب|اهليه|استحقاق|المطلوب|رسوم|تكلفه|تكلف|تكاليف|بكم|مبلغ|فلوس|اسعار|سعر|الخدمه|خدمه|هذه|هذي|هذا|عن)\s+/g, " ");
    return s.replace(/\s+/g, " ").trim();
  }

  function isGreeting(raw, norm) {
    return (
      /^(مرحبا|مرحباً|السلام|هلا|اهلا|أهلا|سلام|صباح الخير|مساء الخير|الو|hi|hello)[\s!.]*$/i.test(raw) ||
      norm === "من انت" ||
      norm === "وش تسوي" ||
      norm === "عرف بنفسك"
    );
  }

  function isReset(norm) {
    return /^(مسح|اعاده ضبط|ابدأ من جديد|ابدا من جديد|محادثه جديده|مسح المحادثه)$/.test(norm);
  }

  function isSupport(norm) {
    return /تواصل|رقم.*الوزار|رقم.*نما|هاتف|دعم.*فني|شكوى|بلاغ|خدمه العملاء|939|اعتراض على مخالف/.test(norm);
  }

  function wantsJourney(norm) {
    return /ما اعرف اسم|ما ادري اسم|رحل المستفيد|ابدأ الرحل|ابدا الرحل|من وين ابدأ|من وين ابدا/.test(norm);
  }

  function isConditionsIntent(norm) {
    return /شروط|شرط|متطلب|المطلوب|مؤهل|اهليه|استحقاق|اوراق|وثائق|هل لازم|هل يشترط|هل اقدر|شروطها|متطلباتها/.test(norm);
  }

  function isFeesIntent(norm) {
    return /رسوم|تكلف|بكم|مبلغ|فلوس|مجاني|مجانيه|اسعار|سعر|كم الرسوم|كم رسومها|كم تكلف|قيمه الخدمه/.test(norm);
  }

  function isOperationIntent(norm) {
    if (/تجديد|جدد/.test(norm)) return "تجديد";
    if (/نقل ملكي|تنازل/.test(norm)) return "نقل ملكية";
    if (/الغاء|شطب|ايقاف/.test(norm)) return "إلغاء";
    if (/توسع/.test(norm)) return "توسعة مشروع";
    if (/تشغيلي/.test(norm)) return "ترخيص تشغيلي";
    if (/انشائي|بناء/.test(norm)) return "ترخيص إنشائي";
    if (/مبدئي/.test(norm)) return "تصريح مبدئي";
    if (/ورقي|تحويل.*الكتروني/.test(norm)) return "تحويل رخصة ورقية إلى إلكترونية";
    return null;
  }

  function wellTopic(norm) {
    return /بير|بئر|ابار|آبار/.test(norm) || /رخصه.*ماء|مياه جوفيه/.test(norm);
  }

  function laborTopic(norm) {
    return /عماله|عمال زراعي|كفاله زراعي|استقدام مزارع|استقدام عمال|عمال\b/.test(norm);
  }

  function renewalTopic(norm) {
    return /تجديد|جدد رخص|رخصتي قرب|تنتهي رخص|انتهاء رخص/.test(norm);
  }

  function findService(name, services) {
    if (!name || !Array.isArray(services)) return null;
    const matches = services.filter((s) => s.published && s.name === name);
    return matches.length === 1 ? matches[0] : null;
  }

  function eventById(events, id) {
    return (events || []).find((event) => event.id === id) || null;
  }

  function scoreEvent(norm, event) {
    const keys = EVENT_KEYS[event.id] || [];
    let score = 0;
    const title = normalize(event.title);
    if (title && title === norm) {
      score += 30;
    } else if (title && norm.includes(title)) {
      score += 20;
    } else if (title && title.includes(norm) && norm.length >= 4) {
      score += 15;
    }
    for (const key of keys) {
      if (norm.includes(key)) score += 2;
    }
    return score;
  }

  function findRelatedEvent(service, events) {
    if (!service || !Array.isArray(events)) return null;
    for (const event of events) {
      if (!Array.isArray(event.steps)) continue;
      if (event.steps.some((s) => s.service === service.name)) {
        return event;
      }
    }
    return null;
  }

  function rankedEvents(norm, events) {
    return (events || [])
      .map((event) => ({ event, score: scoreEvent(norm, event) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  function popularGoals() {
    return ["بدء النشاط الزراعي", "بدء تربية الماشية", "طلب عمالة زراعية", "رخصة بئر", "دعم برنامج ريف"];
  }

  /**
   * مطابقة ذكية للخدمات مع فهم الكلمات المفتاحية والمرادفات
   */
  const GENERIC_TOKENS = new Set(["طلب", "خدمه", "خدمة", "اصدار", "إصدار", "تقديم", "في", "على", "علي", "من", "عن", "الى", "الي", "مع", "او"]);

  function matchServicesWithScore(norm, services) {
    if (!norm || !Array.isArray(services)) return [];

    // توسيع الاستعلام بالمرادفات
    let expanded = norm;
    if (norm.includes("موعد") || norm.includes("مواعيد") || norm.includes("ميعاد")) {
      expanded += " مواعيد ميعاد مقابله مقابلة حجز";
    }
    for (const syn of DIALECT_SYNONYMS) {
      for (const word of syn.words) {
        if (norm.includes(normalize(word))) {
          expanded += " " + syn.target;
          break;
        }
      }
    }

    const normExpanded = normalize(expanded);
    const tokens = normExpanded.split(/\s+/).filter((t) => t.length >= 2);

    const scored = [];
    for (const s of services) {
      if (!s.published) continue;
      const sName = normalize(s.name);
      const sDesc = normalize(s.desc);
      const sCat = normalize(s.category);

      let score = 0;
      if (sName === norm) {
        score += 100;
      } else if (sName.includes(norm) && norm.length >= 4) {
        score += 50;
      } else if (norm.includes(sName) && sName.length >= 4) {
        score += 45;
      }

      for (const token of tokens) {
        const weight = GENERIC_TOKENS.has(token) ? 1 : 10;
        if (sName.includes(token)) score += weight;
        if (sCat.includes(token)) score += Math.floor(weight * 0.5);
        if (sDesc.includes(token)) score += Math.floor(weight * 0.25);
      }

      if (score >= 6) {
        scored.push({ service: s, score });
      }
    }

    return scored.sort((a, b) => b.score - a.score);
  }

  function matchServices(norm, services) {
    return matchServicesWithScore(norm, services).map((row) => row.service);
  }

  /**
   * تحويل معرّفات أسئلة الأهلية إلى قائمة نصوص مقروءة ومفيدة للمستفيد
   */
  function formatEligibilityList(service, questionsMap) {
    const list = [];
    if (!service || !Array.isArray(service.eligibility) || !service.eligibility.length) {
      return ["الخدمة متاحة إلكترونياً وتتطلب حساباً مفعّلاً في النفاذ الوطني وسداد الرسوم إن وجدت."];
    }
    const qMap = questionsMap || (root.NAAMA_DATA && root.NAAMA_DATA.questions) || {};
    for (const qId of service.eligibility) {
      const q = qMap[qId];
      if (q && q.reason) {
        list.push(q.reason);
      } else if (q && q.text) {
        list.push(q.text.replace(/^هل\s+/, ""));
      }
    }
    return list.slice(0, 5);
  }

  /**
   * تحليل رسوم الخدمة وصياغتها بأسلوب واضح ومباشر
   */
  const DEFAULT_QUALIFY_FIXES = {
    agricultural_register: {
      how: "سجّل موقعك الزراعي في الوزارة؛ هذا السجل هو الأساس لمعظم الخدمات والبرامج الزراعية.",
      service: "تسجيل موقع زراعي جديد",
    },
    palm_farm_registered: {
      how: "سجّل مزرعة النخيل في السجل الزراعي أولاً مع أعداد النخيل وأصنافه.",
      service: "تسجيل موقع زراعي جديد",
    },
    breeder_record: {
      how: "أصدر سجل المربي أولاً لإثبات حيازتك وتربيتك للماشية.",
      service: "إصدار سجل مربي",
    },
    livestock_owned: {
      how: "رقّم الماشية باسمك عبر خدمة ترقيم الثروة الحيوانية لإثبات الملكية وتحديث السجل.",
      service: "طلب ترقيم الماشية",
    },
    horse_registered: {
      how: "سجّل بيانات الخيل في السجل المعتمد لإثبات ملكيتها وتسجيلها رسمياً.",
      service: "تسجيل بيانات الخيل",
    },
    apiary_registered: {
      how: "أصدر رخصة المنحل وسجّله في السجل الزراعي لمربي النحل.",
      service: "رخصة منحل أفراد",
    },
    licensed_water_source: {
      how: "احصل على رخصة استخدام مصدر المياه الجوفية أولاً قبل طلب التعديل أو الاستخدام.",
      service: "إصدار رخص استخدام مصادر المياه الجوفية ( الابار )",
    },
    valid_well_license: {
      how: "احصل على رخصة البئر المطلوبة (حفر أو تعميق) قبل إنشاء أمر العمل أو التعاقد.",
      service: "رخصة حفر بئر جديدة",
    },
    licensed_drilling_contractor: {
      how: "يجب التعاقد مع مقاول حفر آبار مرخّص ومعتمد من الوزارة لتنفيذ الأعمال.",
      service: "رخصة حفر بئر جديدة",
    },
    labor_violations: {
      how: "يُرجى سداد وتسوية أي مخالفات عمالية مسجلة لدى وزارة الموارد البشرية عبر منصة قوى.",
    },
    labor_justified: {
      how: "يجب أن يتناسب عدد العمالة المطلوب مع السعة الإنتاجية والمساحة المعتمدة للمزرعة.",
    },
    importer_qualified: {
      how: "سجّل منشأتك كمستورد مؤهل في نظام الوزارة قبل طلب إذن الاستيراد.",
      service: "طلب تأهيل مستورد سلع أخرى",
    },
  };

  function parseEligibilityAnswer(norm) {
    if (/^(نعم|اي|ايوه|اجل|متوفر|موجود|عندي|صحيح|منطبق|توجد|نعم توجد|نعم متوفر|نعم متوفر لدي|نعم متوفر لدي|نعم)/.test(norm)) {
      return true;
    }
    if (/^(لا|كلا|غير متوفر|مو متوفر|ما عندي|ليس لدي|لا توجد|غير منطبق|مافي|ما في|لا توجد مخالفات|لا لا توجد|لا غير متوفر)/.test(norm)) {
      return false;
    }
    return null;
  }

  function startEligibilityCheck(service, session, questionsMap) {
    const qIds = service.eligibility || [];
    const qMap = questionsMap || (root.NAAMA_DATA && root.NAAMA_DATA.questions) || {};
    const qList = [];
    for (const qid of qIds) {
      if (qMap[qid]) {
        qList.push({ id: qid, ...qMap[qid] });
      }
    }

    if (!qList.length) {
      return {
        text: `الخدمة [${service.name}] متاحة إلكترونياً وتتطلب حساباً مفعّلاً في النفاذ الوطني وسداد الرسوم إن وجدت.\n\nهل ترغب في الانتقال للتقديم المباشر؟`,
        kind: "guide",
        service,
        primary: {
          title: `تقديم طلب: ${service.name}`,
          href: `service.html?id=${encodeURIComponent(service.id)}`,
          hint: "الانتقال لصفحة الخدمة وتعبئة الطلب",
        },
        steps: [],
        questions: ["كم الرسوم؟", "خدمات مرتبطة"],
        journey: false,
      };
    }

    session.eligibilitySession = {
      service,
      questions: qList,
      currentIndex: 0,
      passedReasons: [],
    };

    const firstQ = qList[0];
    const expect = firstQ.expect !== false;
    const chips = expect
      ? ["نعم، متوفر لدي ✅", "لا، غير متوفر ❌"]
      : ["لا، لا توجد مخالفات ✅", "نعم، توجد مخالفات ❌"];

    return {
      text: `🔍 **فحص الأهلية التفاعلي لخدمة [${service.name}]:**\n\nسنراجع معك الشروط خطوة بخطوة في المحادثة للتأكد من انطباقها عليك قبل التقديم.\n\n📌 **الشرط الأول (1 من ${qList.length}):**\n${firstQ.text}`,
      kind: "ask",
      service,
      eligibilityProgress: {
        current: 1,
        total: qList.length,
        percent: Math.round((1 / qList.length) * 100),
      },
      steps: [],
      questions: chips,
      journey: false,
    };
  }

  function handleEligibilityAnswer(raw, norm, session, services, questionsMap, hrefOf) {
    const el = session.eligibilitySession;
    if (!el) return null;

    const qList = el.questions;
    const idx = el.currentIndex;
    const currQ = qList[idx];

    const ans = parseEligibilityAnswer(norm);
    if (ans === null) {
      const expect = currQ.expect !== false;
      const chips = expect
        ? ["نعم، متوفر لدي ✅", "لا، غير متوفر ❌"]
        : ["لا، لا توجد ✅", "نعم، توجد ❌"];
      return {
        text: `للتحقق من الشرط (${idx + 1} من ${qList.length}):\n**${currQ.text}**\n\nيرجى الإجابة بنعم أو لا للمتابعة:`,
        kind: "ask",
        service: el.service,
        steps: [],
        questions: chips,
        journey: false,
      };
    }

    const expect = currQ.expect !== false;
    if (ans === expect) {
      el.passedReasons = el.passedReasons || [];
      el.passedReasons.push(currQ.reason || currQ.text.replace(/^هل\s+/, ""));
      el.currentIndex++;
      if (el.currentIndex < qList.length) {
        const nextQ = qList[el.currentIndex];
        const nextExpect = nextQ.expect !== false;
        const chips = nextExpect
          ? ["نعم، متوفر لدي ✅", "لا، غير متوفر ❌"]
          : ["لا، لا توجد ✅", "نعم، توجد ❌"];
        const currNum = el.currentIndex + 1;
        return {
          text: `✅ **ممتاز، هذا الشرط منطبق لديك!**\n\n📌 **الشرط التالي (${currNum} من ${qList.length}):**\n${nextQ.text}`,
          kind: "ask",
          service: el.service,
          eligibilityProgress: {
            current: currNum,
            total: qList.length,
            percent: Math.round((currNum / qList.length) * 100),
          },
          steps: [],
          questions: chips,
          journey: false,
        };
      } else {
        const svc = el.service;
        const passedItems = el.passedReasons || [];
        session.eligibilitySession = null;
        session.lastService = svc;
        return {
          text: `🎉 **تهانينا! جميع شروط خدمة [${svc.name}] منطبقة عليك بنجاح.**\n\nتم التحقق من جميع المتطلبات بنجاح (${qList.length} من ${qList.length}). يمكنك الآن التقديم مباشرة على الخدمة عبر بوابة نما:`,
          kind: "guide",
          service: svc,
          eligibilityPassed: {
            service: svc,
            total: qList.length,
            items: passedItems,
          },
          primary: {
            title: `تقديم طلب: ${svc.name}`,
            href: hrefOf(svc),
            hint: "الانتقال المباشر لصفحة الخدمة وتعبئة النموذج",
          },
          steps: [],
          questions: ["كم الرسوم؟", "الخطوة التالية الموصى بها", "خدمات مرتبطة"],
          journey: false,
        };
      }
    } else {
      const svc = el.service;
      session.eligibilitySession = null;
      session.lastService = svc;

      const fixes = (root.NaamaEligibility && root.NaamaEligibility.QUALIFY_FIXES) || DEFAULT_QUALIFY_FIXES;
      const fix = fixes[currQ.id] || DEFAULT_QUALIFY_FIXES[currQ.id] || {};
      const how = fix.how || currQ.reason || "يرجى استيفاء هذا المتطلب قبل التقديم.";
      const fixSvcName = fix.service;
      const fixSvc = fixSvcName ? findService(fixSvcName, services) : null;

      let primary = null;
      const chips = ["إعادة فحص الأهلية 🔄", "كم الرسوم؟", "بدء رحلة المستفيد"];
      if (fixSvc) {
        primary = {
          title: `ابدأ بهذا أولاً: ${fixSvc.name}`,
          href: hrefOf(fixSvc),
          hint: "استوفِ هذا المتطلب التمهيدي ثم عد لإكمال طلبك",
        };
        chips.unshift(`تقديم على ${fixSvc.name}`);
      }

      return {
        text: `⚠️ **عذراً، هذا الشرط غير مستوفى حالياً:**\n• ${currQ.reason || currQ.text}\n\n💡 **كيف يمكنك استيفاء هذا الشرط؟**\n${how}`,
        kind: "guide",
        service: svc,
        primary,
        steps: [],
        questions: chips,
        journey: false,
      };
    }
  }

  function formatFeeInfo(service) {
    if (!service || !service.fee) {
      return { kind: "unknown", text: "يتم تحديد الرسوم آلياً بناءً على بيانات الطلب عند التقديم." };
    }
    const fee = service.fee;
    if (fee.kind === "free" || /مجانا/i.test(fee.text || "")) {
      return { kind: "free", text: "هذه الخدمة مجانية بالكامل (0 ريال) بدون أي مقابل مالي حكومي." };
    }
    if (fee.text && fee.text.trim()) {
      return { kind: "paid", text: `الرسوم: ${fee.text}` };
    }
    return { kind: "calculator", text: "الرسوم محددة وفق لائحة معتمدة بحسب سعة المشروع ومواصفاته." };
  }

  function emptyReply(popularGoalsList) {
    return {
      text: "لم أتبين طلبك بدقة بعد. صف ما تريد إنجازه بصيغة «أبي...» أو اختر أحد المسارات الأكثر طلباً أدناه:",
      kind: "ask",
      primary: null,
      steps: [],
      questions: popularGoalsList,
      journey: true,
    };
  }

  function greetReply(popularGoalsList) {
    return {
      text: GREETING,
      kind: "greet",
      primary: null,
      steps: [],
      questions: popularGoalsList,
      journey: false,
    };
  }

  function supportReply() {
    return {
      text: `📞 **قنوات الدعم والتواصل الرسمية:**\n\n• **الرقم الموحد المجاني:** ${SUPPORT_INFO.phone} (متاح على مدار 24 ساعة لخدمتكم والبلاغات الطارئة).\n• **منصة نما:** يمكنك تقديم بلاغ أو شكوى ومتابعة حالة المعاملات مباشرة.\n• **الاعتراض على المخالفات:** متاح إلكترونياً عبر المنصة خلال المهلة النظامية.`,
      kind: "guide",
      primary: {
        title: "منصة نما الإلكترونية",
        href: SUPPORT_INFO.portal_url,
        hint: `الاتصال المباشر على الرقم الموحد ${SUPPORT_INFO.phone}`,
      },
      steps: [
        { title: "الاتصال بالرقم الموحد", why: `اتصل على ${SUPPORT_INFO.phone} للاستفسار الفوري عن أي معاملة.`, href: `tel:${SUPPORT_INFO.phone}` },
        { title: "الاستعلام عن المعاملات", why: "متابعة حالة طلبك برقم الهوية أو رقم الطلب.", href: "index.html?q=استعلام" },
      ],
      questions: ["رخصة بئر", "إصدار سجل مربي", "طلب عمالة زراعية", "بدء النشاط الزراعي"],
      journey: false,
    };
  }

  function guideEvent(event, services, hrefOf) {
    const rawSteps = event.steps && event.steps.length ? event.steps.slice(0, 4) : [];
    const steps = rawSteps.map((step) => {
      const service = findService(step.service, services);
      return {
        title: step.title,
        why: step.why,
        href: service ? hrefOf(service) : `events.html#/${event.type}/${event.id}`,
      };
    });
    return {
      text: `هذا هدف يتطلب مساراً متكاملاً مرتب الخطوات. مسار «${event.title}»: ${event.summary}`,
      kind: "guide",
      event,
      primary: {
        title: `مسار: ${event.title}`,
        href: `events.html#/${event.type}/${event.id}`,
        hint: "استعراض المسار الكامل خطوة بخطوة مع الشروط",
      },
      steps,
      questions: ["ما هي شروط المسار؟", "كم رسوم الخدمات؟", "ابدأ رحلة المستفيد"],
      journey: false,
    };
  }

  /**
   * حساب واقتراح الخطوة التالية الموصى بها (Next Best Action) تلقائياً
   * اعتماداً على شبكة رحلات الحياة (Life Events) وتصنيف الخدمات
   */
  function findNextBestAction(service, services, events) {
    if (!service) return null;

    // 1. البحث في رحلات الحياة المرتبة
    if (Array.isArray(events)) {
      for (const event of events) {
        if (!Array.isArray(event.steps)) continue;
        const idx = event.steps.findIndex((s) => s.service === service.name);
        if (idx !== -1 && idx < event.steps.length - 1) {
          const next = event.steps[idx + 1];
          const nextS = findService(next.service, services);
          return {
            title: next.title,
            serviceName: next.service,
            why: next.why || "الخطوة المكملة التالية في هذا المسار",
            eventTitle: event.title,
            eventId: event.id,
            eventType: event.type,
            service: nextS,
          };
        }
      }
    }

    // 2. خريطة ذكية للخدمات المنفردة الأكثر طلباً
    const STANDALONE_NEXT = {
      "خدمة حجز موعد (ميعاد)": {
        title: "الاستعلام عن الطلبات والمعاملات",
        serviceName: "الاستعلام عن الطلبات والمعاملات",
        why: "لمتابعة حالة طلبك وتفاصيل المراجعة بعد الموعد",
      },
      "خدمة مقابلة المعالي": {
        title: "الاستعلام عن الطلبات والمعاملات",
        serviceName: "الاستعلام عن الطلبات والمعاملات",
        why: "لمتابعة حالة طلب مقابلة معالي الوزير إلكترونياً",
      },
      "رخصة حفر بئر جديدة": {
        title: "إصدار رخص استخدام مصادر المياه الجوفية ( الابار )",
        serviceName: "إصدار رخص استخدام مصادر المياه الجوفية ( الابار )",
        why: "بعد اكتمال حفر البئر، يلزم إصدار رخصة الاستخدام وتركيب عداد قياس معتمد",
      },
      "طلب عمالة زراعية": {
        title: "تسجيل موقع زراعي جديد",
        serviceName: "تسجيل موقع زراعي جديد",
        why: "يُشترط قيد وتحديث السجل الزراعي للمزرعة لطلب العمالة وتأييدها",
      },
    };

    if (STANDALONE_NEXT[service.name]) {
      const entry = STANDALONE_NEXT[service.name];
      const nextS = findService(entry.serviceName, services);
      return {
        title: entry.title,
        serviceName: entry.serviceName,
        why: entry.why,
        service: nextS,
      };
    }

    return null;
  }

  function guideNamed(service, hrefOf, extraSteps, customNote, events, services) {
    const feeInfo = formatFeeInfo(service);
    const conditions = formatEligibilityList(service);
    const relatedEvent = findRelatedEvent(service, events);

    let note = customNote;
    if (!note) {
      note = `هذه خدمة محددة: **${service.desc || service.name}**. راجع الشروط والمتطلبات أدناه ثم قدّم طلبك.`;
      if (relatedEvent) {
        note += `\n\n🗺️ **المسار المرتبط:** هذه الخدمة ترتبط بمسار **«${relatedEvent.title}»** (${relatedEvent.summary || "يمكنك استعراض كافة خطوات واشتراطات المسار كاملاً"}).`;
      }
    }

    const nextAction = findNextBestAction(service, services, events);

    const steps = extraSteps ? [...extraSteps] : [];
    if (relatedEvent && !steps.some((s) => s.href && s.href.includes(relatedEvent.id))) {
      steps.push({
        title: `مسار متكامل: ${relatedEvent.title}`,
        why: `هذه الخدمة مرحلية ضمن مسار «${relatedEvent.title}»؛ يمكنك استعراض كافة خطوات واشتراطات المسار كاملاً.`,
        href: `events.html#/${relatedEvent.type}/${relatedEvent.id}`,
      });
    }

    const questions = ["ما هي الشروط والأهلية؟", "كم الرسوم بالتفصيل؟"];
    if (relatedEvent) {
      questions.push(`مسار: ${relatedEvent.title}`);
    }
    if (nextAction) {
      questions.unshift(`الخطوة التالية: ${nextAction.title}`);
    } else {
      questions.push("التقديم المباشر");
    }

    return {
      text: `${note}\n\n💳 **الرسوم:** ${feeInfo.text}`,
      kind: "guide",
      service,
      conditions,
      feeInfo,
      nextAction,
      relatedEvent,
      primary: {
        title: service.name,
        href: hrefOf(service),
        hint: `${service.category || "خدمة إلكترونية"} · ${feeInfo.kind === "free" ? "مجانية ✅" : "برسوم 💳"}`,
      },
      steps,
      questions,
      journey: false,
    };
  }

  function laborGuide(services, hrefOf) {
    const register = findService("تسجيل موقع زراعي جديد", services);
    const labor = findService("طلب عمالة زراعية", services);
    const steps = [];
    if (register) {
      steps.push({
        title: "سجّل الموقع الزراعي",
        why: "بدون سجل زراعي أو حيازة مسجلة لا تُقبل طلبات استقدام أو تأييد العمالة.",
        href: hrefOf(register),
      });
    }
    if (labor) {
      steps.push({
        title: "اطلب العمالة الزراعية",
        why: "بعد قيد السجل تُعرض خدمة العمالة وفق المعايير المعتمدة للمساحة والنشاط.",
        href: hrefOf(labor),
      });
    }
    return {
      text: "العمالة الزراعية ترتبط بوجود موقع زراعي مسجل أولاً، وليست قائمة عمالة عشوائية. إليك المسار الصحيح لإتمام طلبك:",
      kind: "guide",
      service: labor,
      primary: labor ? { title: labor.name, href: hrefOf(labor), hint: "بعد استيفاء السجل الزراعي للموقع" } : null,
      steps,
      questions: ["ما هي شروط العمالة؟", "تسجيل موقع زراعي", "رخصة بئر"],
      journey: false,
    };
  }

  function wellAsk() {
    return {
      text: "رخص الآبار تتفرع بحسب الغرض؛ حدّد احتياجك الدقيق لأوجهك للخطوة النظامية المناسبة:",
      kind: "ask",
      primary: null,
      steps: [],
      questions: ["حفر بئر جديدة", "استخدام مياه جوفية", "بدء نشاط زراعي ويحتاج بئرًا"],
      journey: false,
    };
  }

  function renewalAsk() {
    return {
      text: "إجراء التجديد يعتمد على نوع الرخصة المسجلة لديك. ما هي الرخصة التي ترغب في تجديدها؟",
      kind: "ask",
      primary: null,
      steps: [],
      questions: ["رخصة بئر", "رخصة صيد", "رخصة منحل", "ترخيص مشروع دواجن"],
      journey: false,
    };
  }

  /**
   * الدالة الرئيسية المسؤولة عن الرد الذكي
   * @param {string} query
   * @param {object} ctx
   */
  function replyTo(query, ctx) {
    const session = ctx.session || (ctx.session = {});
    const services = ctx.services || [];
    const events = ctx.events || [];
    const questionsMap = ctx.questions || (root.NAAMA_DATA && root.NAAMA_DATA.questions) || {};
    const hrefOf = ctx.hrefOf || ((service) => `service.html?id=${encodeURIComponent(service.id)}`);
    const raw = (query || "").trim();
    const goals = popularGoals();

    if (!raw) return greetReply(goals);
    const norm = normalize(raw);

    // 1. تحية المستخدم
    if (isGreeting(raw, norm)) {
      return greetReply(goals);
    }

    // 2. إعادة ضبط المحادثة
    if (isReset(norm)) {
      session.lastService = null;
      session.lastEvent = null;
      session.awaiting = null;
      session.eligibilitySession = null;
      session.awaitingEligibilityFor = null;
      return {
        text: "تمت إعادة ضبط المحادثة. كيف يمكنني مساعدتك في خدمات منصة نما اليوم؟",
        kind: "greet",
        primary: null,
        steps: [],
        questions: goals,
        journey: false,
      };
    }

    // معالجة جلسة فحص الأهلية التفاعلية النشطة (Active In-Chat Eligibility Session)
    if (session.eligibilitySession) {
      if (/^(الغاء|تراجع|خلاص|وقف|توقف|خروج)$/.test(norm)) {
        session.eligibilitySession = null;
        session.awaitingEligibilityFor = null;
        return {
          text: "تم إيقاف فحص الأهلية التفاعلي. كيف يمكنني مساعدتك في خدمات أخرى؟",
          kind: "guide",
          primary: null,
          steps: [],
          questions: goals,
          journey: false,
        };
      }
      const ansRes = handleEligibilityAnswer(raw, norm, session, services, questionsMap, hrefOf);
      if (ansRes) return ansRes;
    }

    // بدء فحص الأهلية التفاعلي في الشات
    const wantsEligibility =
      /فحص.*اهلي|تحقق.*شروط|فحص.*شروط|تاكد.*شروط|ابدأ فحص|ابدا فحص/.test(norm) ||
      (session.awaitingEligibilityFor && /^(نعم|اي|ايوه|اجل|ابدا|ابدأ|تحقق|افحص|نعم ابدا|نعم ابدأ|نعم ابدأ فحص|ابي اتحقق|ابغى اتاكد)$/.test(norm));

    if (wantsEligibility) {
      const targetService = session.awaitingEligibilityFor || session.lastService;
      if (targetService) {
        session.awaitingEligibilityFor = null;
        return startEligibilityCheck(targetService, session, questionsMap);
      }
    }

    // 3. أرقام وقنوات الدعم الفني
    if (isSupport(norm)) {
      return supportReply();
    }

    // معالجة طلب الخطوة التالية (Next Best Action)
    if (/الخطوه التاليه|الخطوة التالية|وش بعد|وش اسوي بعد|وش الخطوه|ما الخطوه|الخطوة القادمة/.test(norm)) {
      if (session.lastService) {
        const nextAction = findNextBestAction(session.lastService, services, events);
        if (nextAction) {
          if (nextAction.service) {
            session.lastService = nextAction.service;
            return guideNamed(nextAction.service, hrefOf, [], `الخطوة التالية الموصى بها بعد [${session.lastService.name}] هي: **${nextAction.title}**.\n\n💡 **السبب:** ${nextAction.why}`, events, services);
          } else {
            return {
              text: `الخطوة التالية الموصى بها بعد [${session.lastService.name}] هي: **${nextAction.title}** (${nextAction.serviceName}).\n\n💡 **السبب:** ${nextAction.why}`,
              kind: "guide",
              primary: { title: nextAction.serviceName, href: `index.html?q=${encodeURIComponent(nextAction.serviceName)}`, hint: "ابحث عن تفاصيل الخدمة" },
              steps: [],
              questions: ["ما هي الشروط والأهلية؟", "كم الرسوم؟", "بدء رحلة المستفيد"],
              journey: false,
            };
          }
        }
      }
    }

    // 4. توجيه لرحلة المستفيد العامة
    if (wantsJourney(norm)) {
      return {
        text: "رحلة المستفيد ترتّب لك الخدمات بحسب صفتك (فرد، شركة، جهة) ونشاطك، وتوصلك للخدمة خلال 4 خطوات واضحة.",
        kind: "guide",
        primary: { title: "ابدأ رحلة المستفيد الآن", href: "journey.html", hint: "من أنت؟ ← فئتك ← احتياجك ← الخدمة" },
        steps: [],
        questions: goals,
        journey: true,
      };
    }

    // 5. التعامل مع الحالات المعلقة في الجلسة (Awaiting States)
    if (session.awaiting === "well" || (wellTopic(norm) && /حفر/.test(norm))) {
      const well = findService("رخصة حفر بئر جديدة", services);
      if (well && (/حفر/.test(norm) || (session.awaiting === "well" && /حفر/.test(norm)))) {
        session.awaiting = null;
        session.lastService = well;
        return guideNamed(well, hrefOf, [{
          title: "بعد رخصة البئر",
          why: "إذا كنت تؤسس مزرعة جديدة، أكمل مسار بدء النشاط الزراعي.",
          href: "events.html#/individual/new-farmer",
        }]);
      }
    }
    if (session.awaiting === "well" && /استخدام|جوفي/.test(norm)) {
      const use = findService("إصدار رخص استخدام مصادر المياه الجوفية ( الابار )", services);
      session.awaiting = null;
      if (use) {
        session.lastService = use;
        return guideNamed(use, hrefOf, null, null, events, services);
      }
    }
    if (session.awaiting === "well" && /نشاط زراعي|مزرع/.test(norm)) {
      session.awaiting = null;
      const event = eventById(events, "new-farmer");
      if (event) {
        session.lastEvent = event;
        return guideEvent(event, services, hrefOf);
      }
    }
    if (session.awaiting === "renewal") {
      session.awaiting = null;
      return replyTo(raw.replace(/تجديد/g, "").trim() || raw, ctx);
    }

    // أسئلة الآبار والعمالة والتجديد المباشرة
    if (wellTopic(norm) && !/حفر بئر جديده|حفر بئر جديدة/.test(raw) && !isConditionsIntent(norm) && !isFeesIntent(norm)) {
      session.awaiting = "well";
      return wellAsk();
    }
    if (laborTopic(norm) && !isConditionsIntent(norm) && !isFeesIntent(norm)) {
      session.awaiting = null;
      const res = laborGuide(services, hrefOf);
      if (res.service) session.lastService = res.service;
      return res;
    }
    if (renewalTopic(norm) && !wellTopic(norm) && !session.lastService) {
      session.awaiting = "renewal";
      return renewalAsk();
    }

    // 6. استفسار ذكي عن الشروط والأهلية (Conditions Intent)
    if (isConditionsIntent(norm)) {
      const cleaned = cleanIntentQuery(norm);

      let targetService = null;
      if (laborTopic(norm)) {
        targetService = findService("طلب عمالة زراعية", services);
      } else if (wellTopic(norm) && !/استخدام/.test(norm)) {
        targetService = findService("رخصة حفر بئر جديدة", services);
      } else if (cleaned.length >= 3) {
        const matched = matchServices(cleaned, services);
        if (matched.length > 0) targetService = matched[0];
      }
      if (!targetService && session.lastService) {
        targetService = session.lastService;
      }

      if (targetService) {
        session.lastService = targetService;
        session.awaitingEligibilityFor = targetService;
        const conditions = formatEligibilityList(targetService, questionsMap);
        const condListText = conditions.map((c, i) => `${i + 1}. ${c}`).join("\n");
        return {
          text: `📋 **شروط ومتطلبات خدمة [${targetService.name}]:**\n\n${condListText}\n\n💡 **هل ترغب في التحقق التفاعلي من انطباق هذه الشروط عليك الآن خطوة بخطوة؟**`,
          kind: "guide",
          service: targetService,
          conditions,
          primary: {
            title: `تقديم طلب: ${targetService.name}`,
            href: hrefOf(targetService),
            hint: "الانتقال لصفحة الخدمة والتقديم",
          },
          steps: [],
          questions: ["نعم، ابدأ فحص الأهلية الآن 🔍", "كم الرسوم؟", "تقديم الطلب المباشر"],
          journey: false,
        };
      }
    }

    // 7. استفسار ذكي عن الرسوم والتكاليف (Fees Intent)
    if (isFeesIntent(norm)) {
      const cleaned = cleanIntentQuery(norm);

      let targetService = null;
      if (laborTopic(norm)) {
        targetService = findService("طلب عمالة زراعية", services);
      } else if (wellTopic(norm) && !/استخدام/.test(norm)) {
        targetService = findService("رخصة حفر بئر جديدة", services);
      } else if (cleaned.length >= 3) {
        const matched = matchServices(cleaned, services);
        if (matched.length > 0) targetService = matched[0];
      }
      if (!targetService && session.lastService) {
        targetService = session.lastService;
      }

      if (targetService) {
        session.lastService = targetService;
        const feeInfo = formatFeeInfo(targetService);
        return {
          text: `💳 **رسوم خدمة [${targetService.name}]:**\n\n${feeInfo.text}\n\nتُسدد الرسوم الحكومية عبر نظام سداد بعد مراجعة وقبول الطلب من الوزارة.`,
          kind: "guide",
          service: targetService,
          feeInfo,
          primary: {
            title: targetService.name,
            href: hrefOf(targetService),
            hint: feeInfo.kind === "free" ? "خدمة مجانية بالكامل" : "الاطلاع على تفاصيل وحاسبة الرسوم",
          },
          steps: [],
          questions: ["ما هي الشروط والأهلية؟", "تقديم الطلب الآن", "مسار مرتبط"],
          journey: false,
        };
      }
    }

    // 8. استفسار عن العمليات (تجديد، نقل ملكية، إلغاء، ترخيص تشغيلي...)
    const op = isOperationIntent(norm);
    if (op) {
      let targetService = session.lastService;
      const matched = matchServices(norm.replace(new RegExp(op, "g"), "").trim(), services);
      if (matched.length > 0) targetService = matched[0];

      if (targetService && Array.isArray(targetService.actions)) {
        session.lastService = targetService;
        const matchingAction = targetService.actions.find((a) => a.operation === op || (a.name && a.name.includes(op)));
        if (matchingAction) {
          const actionUrl = matchingAction.url || hrefOf(targetService);
          return {
            text: `إجراء **${op}** متاح إلكترونياً لخدمة [${targetService.name}].\n\nيُشترط أن تكون هناك رخصة قائمة سارية أو في فترة التجديد النظامية مع سداد أي مخالفات مستحقة.`,
            kind: "guide",
            service: targetService,
            primary: {
              title: `${op}: ${targetService.name}`,
              href: actionUrl,
              hint: "بدء التقديم المباشر على هذا الإجراء",
            },
            steps: [],
            questions: ["ما هي شروط التجديد؟", "كم الرسوم؟", "تفاصيل الخدمة"],
            journey: false,
          };
        }
      }
    }

    // 9. التحقق أولاً من مطابقة خدمة محددة بالاسم أو اللهجة الدارجة
    const named = services.filter((s) => s.published && normalize(s.name) === norm);
    if (named.length === 1) {
      session.lastService = named[0];
      return guideNamed(named[0], hrefOf, null, null, events, services);
    }

    for (const syn of DIALECT_SYNONYMS) {
      for (const word of syn.words) {
        if (norm.includes(word)) {
          const targetS = findService(syn.target, services);
          if (targetS) {
            session.lastService = targetS;
            return guideNamed(targetS, hrefOf, null, null, events, services);
          }
        }
      }
    }

    // 10. مطابقة ذكية متوازنة بين الخدمات المباشرة ومسارات الحياة (Services & Life Events)
    const scoredServices = matchServicesWithScore(norm, services);
    const topServiceRow = scoredServices.length > 0 ? scoredServices[0] : null;

    const ranked = rankedEvents(norm, events);
    const topEventRow = ranked.length > 0 ? ranked[0] : null;

    // أ) هل يطابق الاستعلام عنوان مسار حياة بدقة؟
    const exactEvent = events.find((event) => normalize(event.title) === norm);
    if (exactEvent) {
      session.awaiting = null;
      session.lastEvent = exactEvent;
      return guideEvent(exactEvent, services, hrefOf);
    }

    // ب) هل الاستعلام يعبر عن نية تأسيس أو هدف شامل؟ (مثل: أبي أربي نحل، أبي أسجل مزرعة، مشروع دواجن)
    const isGoalPhrase = /^(ابي|ابغى|اريد|ودي|ارغب|كيف|طريقه)\s+(افتح|اسوي|ابدا|ابدأ|انشئ|انشى|اربي|ازرع|اسجل)|مشروع|تاسيس|بدء/.test(norm);
    if (isGoalPhrase && topEventRow && topEventRow.score >= 2 && (!topServiceRow || topServiceRow.score < 45)) {
      session.awaiting = null;
      session.lastEvent = topEventRow.event;
      return guideEvent(topEventRow.event, services, hrefOf);
    }

    // ج) هل توجد خدمة مطابقة بقوة للاستعلام؟ (مثل: استيراد النحل، رخصة منحل، حجز موعد)
    const isStrongServiceMatch = topServiceRow && (
      topServiceRow.score >= 40 ||
      normalize(topServiceRow.service.name) === norm ||
      (norm.length >= 4 && normalize(topServiceRow.service.name).includes(norm))
    );

    if (isStrongServiceMatch) {
      session.lastService = topServiceRow.service;
      const extraSteps = [];
      // إذا كانت هناك خدمة بديلة أو مكملة مطابقة بدرجة متقاربة (مثل النحل الطنان)
      if (scoredServices.length > 1 && scoredServices[1].score >= topServiceRow.score * 0.75) {
        const altSvc = scoredServices[1].service;
        extraSteps.push({
          title: `خدمة ذات صلة: ${altSvc.name}`,
          why: "خيار بديل مرتبط بنفس طلبك.",
          href: hrefOf(altSvc),
        });
      }
      return guideNamed(topServiceRow.service, hrefOf, extraSteps, null, events, services);
    }

    // د) إذا كان المسار يطابق بقوة أكبر من أي خدمة فردية
    if (topEventRow && topEventRow.score >= 4 && (!topServiceRow || topServiceRow.score < 20)) {
      session.awaiting = null;
      session.lastEvent = topEventRow.event;
      return guideEvent(topEventRow.event, services, hrefOf);
    }

    // هـ) إذا كانت هناك خدمة فردية واحدة مطابقة
    if (scoredServices.length === 1) {
      session.lastService = scoredServices[0].service;
      return guideNamed(scoredServices[0].service, hrefOf, null, null, events, services);
    }

    // و) إذا كانت هناك عدة خدمات متعددة
    if (scoredServices.length > 1) {
      if (normalize(scoredServices[0].service.name) === norm) {
        session.lastService = scoredServices[0].service;
        return guideNamed(scoredServices[0].service, hrefOf, null, null, events, services);
      }
      return {
        text: "وجدت عدة خدمات مرتبطة بطلبك. اختر الخدمة المطلوبة لعرض شروطها ورسومها فوراً:",
        kind: "ask",
        primary: null,
        steps: [],
        questions: scoredServices.slice(0, 5).map((r) => r.service.name),
        journey: false,
      };
    }

    // ز) مسار فرعي مرجح
    if (topEventRow && topEventRow.score >= 2) {
      session.awaiting = null;
      session.lastEvent = topEventRow.event;
      return guideEvent(topEventRow.event, services, hrefOf);
    }

    return emptyReply(goals);
  }

  const api = { replyTo, GREETING, laborGuide, wellAsk, renewalAsk, normalize, formatEligibilityList, formatFeeInfo };

  function boot() {
    const shell = document.querySelector(".naama-assist");
    if (!shell || !root.NaamaDom) return;
    const { createElement, serviceUrl } = root.NaamaDom;
    const fab = shell.querySelector(".naama-assist-fab");
    const panel = document.getElementById("naama-assist-panel");
    const thread = document.getElementById("naama-assist-thread");
    const form = document.getElementById("naama-assist-form");
    const input = document.getElementById("naama-assist-input");

    // زر الإدخال الصوتي (Speech to Text)
    let micBtn = form.querySelector("#naama-assist-mic");
    if (!micBtn) {
      micBtn = createElement("button", "naama-assist-mic");
      micBtn.type = "button";
      micBtn.id = "naama-assist-mic";
      micBtn.title = "تحدّث صوتياً باللهجة الدارجة (بحث صوتي)";
      micBtn.setAttribute("aria-label", "تحدث صوتياً");
      micBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) form.insertBefore(micBtn, submitBtn);
      else form.append(micBtn);
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recInstance = null;
    let isRecording = false;

    if (SpeechRec) {
      try {
        recInstance = new SpeechRec();
        recInstance.lang = "ar-SA";
        recInstance.continuous = false;
        recInstance.interimResults = false;

        recInstance.onstart = () => {
          isRecording = true;
          micBtn.classList.add("recording");
          input.placeholder = "جاري الاستماع... تحدّث الآن 🎙️";
        };

        recInstance.onresult = (ev) => {
          if (ev.results && ev.results[0] && ev.results[0][0]) {
            const transcript = ev.results[0][0].transcript;
            if (transcript && transcript.trim()) {
              input.value = transcript.trim();
              ask(transcript.trim());
            }
          }
        };

        recInstance.onerror = () => { stopRec(); };
        recInstance.onend = () => { stopRec(); };
      } catch (e) {
        recInstance = null;
      }
    }

    function stopRec() {
      isRecording = false;
      micBtn.classList.remove("recording");
      input.placeholder = "مثال: أبي أفتح مزرعة ...";
      if (recInstance) {
        try { recInstance.stop(); } catch (e) {}
      }
    }

    micBtn.addEventListener("click", () => {
      if (!recInstance) {
        alert("البحث الصوتي متاح في المتصفحات التي تدعم التعرف على الصوت (مثل Chrome و Edge). يرجى التأكد من السماح بالمايكروفون.");
        return;
      }
      if (isRecording) {
        stopRec();
      } else {
        try {
          recInstance.start();
        } catch (e) {
          stopRec();
        }
      }
    });
    const closeBtn = shell.querySelector(".naama-assist-close");
    if (!fab || !panel || !thread || !form || !input) return;

    // إضافة زر مسح المحادثة بالرأس إذا لم يكن موجوداً
    let resetBtn = panel.querySelector(".naama-assist-reset");
    if (!resetBtn) {
      resetBtn = createElement("button", "naama-assist-reset", "🔄");
      resetBtn.type = "button";
      resetBtn.title = "بدء محادثة جديدة ومسح الذاكرة";
      resetBtn.setAttribute("aria-label", "محادثة جديدة");
      const head = panel.querySelector(".naama-assist-head");
      if (head && closeBtn) {
        head.insertBefore(resetBtn, closeBtn);
      }
    }

    const data = root.NAAMA_DATA;
    const services = data && Array.isArray(data.services) ? data.services : [];
    const questions = data && data.questions ? data.questions : {};
    const events = root.NaamaLifeEvents ? root.NaamaLifeEvents.LIFE_EVENTS : [];
    const ctx = {
      services,
      questions,
      events,
      hrefOf: (service) => serviceUrl(service),
      session: {},
    };

    function setOpen(open) {
      panel.hidden = !open;
      fab.setAttribute("aria-expanded", String(open));
      if (open) {
        input.focus();
        thread.scrollTop = thread.scrollHeight;
      }
    }

    function addBubble(role, text, shouldScroll = true) {
      const box = createElement("div", `naama-assist-msg ${role}`);
      if (text) {
        // دعم التنسيق البسيط للنقاط والأسطر العريضة
        const lines = text.split("\n");
        let currentP = null;
        for (const line of lines) {
          if (!line.trim()) {
            currentP = null;
            continue;
          }
          if (!currentP) {
            currentP = createElement("p");
            box.append(currentP);
          } else {
            currentP.append(document.createElement("br"));
          }

          // تمييز النصوص البارزة **text**
          const parts = line.split(/(\*\*.*?\*\*)/g);
          for (const part of parts) {
            if (part.startsWith("**") && part.endsWith("**")) {
              currentP.append(createElement("strong", null, part.slice(2, -2)));
            } else {
              currentP.append(document.createTextNode(part));
            }
          }
        }
      }
      thread.append(box);
      if (shouldScroll) thread.scrollTop = thread.scrollHeight;
      return box;
    }

    function showTypingIndicator() {
      const box = createElement("div", "naama-assist-msg bot naama-assist-typing");
      const dot1 = createElement("span", "dot");
      const dot2 = createElement("span", "dot");
      const dot3 = createElement("span", "dot");
      box.append(dot1, dot2, dot3);
      thread.append(box);
      thread.scrollTop = thread.scrollHeight;
      return box;
    }

    function renderReply(reply, shouldScroll = true) {
      const box = addBubble("bot", reply.text, shouldScroll);

      // شريط تقدّم فحص الأهلية التفاعلي
      if (reply.eligibilityProgress) {
        const prog = reply.eligibilityProgress;
        const progWrap = createElement("div", "naama-assist-progress-wrap");
        const labels = createElement("div", "naama-assist-progress-labels");
        labels.append(
          createElement("span", "progress-step-label", `فحص المتطلبات (الشرط ${prog.current} من ${prog.total})`),
          createElement("span", "progress-percent", `${prog.percent}%`)
        );
        const bar = createElement("div", "naama-assist-progress-bar");
        const fill = createElement("div", "naama-assist-progress-fill");
        fill.style.width = `${prog.percent}%`;
        bar.append(fill);
        progWrap.append(labels, bar);
        box.append(progWrap);
      }

      // بطاقة اجتياز واعتماد الأهلية الرسمية
      if (reply.eligibilityPassed) {
        const pass = reply.eligibilityPassed;
        const certCard = createElement("div", "naama-assist-cert-card");
        const badge = createElement("div", "cert-badge");
        badge.append(
          createElement("span", "cert-icon", "✓"),
          createElement("strong", null, "مؤهل للخدمة رسمياً")
        );
        certCard.append(
          badge,
          createElement("h4", "cert-title", pass.service.name),
          createElement("p", "cert-desc", `تم استيفاء جميع المتطلبات بنجاح (${pass.total} من ${pass.total})؛ جاهز للتقديم الفوري.`)
        );
        if (pass.items && pass.items.length) {
          const list = createElement("ul", "cert-checklist");
          for (const it of pass.items) {
            const li = createElement("li");
            li.append(createElement("span", "check-mark", "✓"), document.createTextNode(" " + it));
            list.append(li);
          }
          certCard.append(list);
        }
        box.append(certCard);
      }

      // شارة نوع الرد
      if (reply.kind === "guide") {
        box.prepend(createElement("span", "naama-assist-badge", "✨ إرشاد موجه"));
      } else if (reply.kind === "ask") {
        box.prepend(createElement("span", "naama-assist-badge ask", "❓ سؤال توضيحي"));
      }

      // البطاقة الأساسية
      if (reply.primary) {
        const link = createElement("a", "naama-assist-primary");
        link.href = reply.primary.href;
        link.append(createElement("strong", null, reply.primary.title));
        if (reply.primary.hint) link.append(createElement("small", null, reply.primary.hint));
        box.append(link);
      }

      // إذا كانت هناك خدمة محددة، وفر أزرار التقديم وفحص الأهلية التفاعلي في نفس الشات
      if (reply.service) {
        const actionsRow = createElement("div", "naama-assist-quick-actions");
        const eligibilityBtn = createElement("button", "btn-check-eligibility", "🔍 فحص الأهلية");
        eligibilityBtn.type = "button";
        eligibilityBtn.title = "بدء التحقق من الشروط تفاعلياً في المحادثة خطوة بخطوة";
        eligibilityBtn.addEventListener("click", () => {
          ask("فحص الأهلية");
        });
        actionsRow.append(eligibilityBtn);
        box.append(actionsRow);
      }

      // الخطوات التتابعية
      if (reply.steps && reply.steps.length) {
        const list = createElement("ol", "naama-assist-steps");
        for (const step of reply.steps) {
          const item = createElement("li");
          const link = createElement("a");
          link.href = step.href;
          link.append(createElement("strong", null, step.title));
          if (step.why) link.append(createElement("span", null, step.why));
          item.append(link);
          list.append(item);
        }
        box.append(list);
      }

      if (reply.journey && !reply.primary) {
        const link = createElement("a", "naama-assist-primary");
        link.href = "journey.html";
        link.append(createElement("strong", null, "🚀 ابدأ رحلة المستفيد"));
        box.append(link);
      }

      // بطاقة الخطوة التالية الموصى بها (Next Best Action)
      if (reply.nextAction) {
        const nextBox = createElement("div", "naama-assist-next-action");
        const nextHeader = createElement("div", "naama-assist-next-header");
        nextHeader.append(
          createElement("span", "next-tag", "💡 الخطوة التالية الموصى بها"),
          createElement("span", "next-event", reply.nextAction.eventTitle ? `مسار: ${reply.nextAction.eventTitle}` : "")
        );
        nextBox.append(
          nextHeader,
          createElement("strong", null, `${reply.nextAction.title} (${reply.nextAction.serviceName})`),
          createElement("p", null, reply.nextAction.why)
        );
        const askNextBtn = createElement("button", "btn-ask-next", "الانتقال لهذه الخطوة ←");
        askNextBtn.type = "button";
        askNextBtn.addEventListener("click", () => ask(reply.nextAction.serviceName));
        nextBox.append(askNextBtn);
        box.append(nextBox);
      }

      // شريط أدوات مصغر للإجابة (استماع صوتي + نسخ)
      const msgBar = createElement("div", "naama-assist-msg-bar");

      const speakBtn = createElement("button", "btn-msg-tool", "🔊 استمع");
      speakBtn.type = "button";
      speakBtn.title = "الاستماع الصوتي للإجابة";
      speakBtn.addEventListener("click", () => {
        if (!("speechSynthesis" in window)) {
          alert("المتصفح لا يدعم القراءة الصوتية للنصوص.");
          return;
        }
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          speakBtn.textContent = "🔊 استمع";
          speakBtn.classList.remove("speaking");
          return;
        }
        const textToSpeak = (reply.text || "")
          .replace(/\*\*/g, "")
          .replace(/[✨❓💳📋💡🚀📞•]/g, "")
          .trim();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = "ar-SA";
        try {
          const voices = window.speechSynthesis.getVoices();
          const arVoice = voices.find((v) => v.lang && v.lang.startsWith("ar"));
          if (arVoice) utterance.voice = arVoice;
        } catch (e) {}

        utterance.onend = () => {
          speakBtn.textContent = "🔊 استمع";
          speakBtn.classList.remove("speaking");
        };
        utterance.onerror = () => {
          speakBtn.textContent = "🔊 استمع";
          speakBtn.classList.remove("speaking");
        };

        speakBtn.textContent = "⏹️ إيقاف";
        speakBtn.classList.add("speaking");
        window.speechSynthesis.speak(utterance);
      });

      const copyBtn = createElement("button", "btn-msg-tool", "📋 نسخ");
      copyBtn.type = "button";
      copyBtn.title = "نسخ الإجابة";
      copyBtn.addEventListener("click", () => {
        const textToCopy = (reply.text || "").replace(/\*\*/g, "");
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy);
        }
        copyBtn.textContent = "تم النسخ ✅";
        setTimeout(() => { copyBtn.textContent = "📋 نسخ"; }, 1800);
      });

      msgBar.append(speakBtn, copyBtn);
      box.append(msgBar);

      // الأسئلة والمقترحات السريعة
      if (reply.questions && reply.questions.length) {
        const chips = createElement("div", "naama-assist-choices");
        for (const question of reply.questions) {
          const button = createElement("button", "naama-assist-choice", question);
          button.type = "button";
          button.addEventListener("click", () => ask(question));
          chips.append(button);
        }
        box.append(chips);
      }

      thread.scrollTop = thread.scrollHeight;
    }

    const STORAGE_KEY_HISTORY = "naama_chat_history";
    const STORAGE_KEY_SESSION = "naama_chat_session";
    const STORAGE_KEY_OPEN = "naama_chat_open";
    let chatLog = [];

    function saveChatState() {
      try {
        if (!window.sessionStorage) return;
        sessionStorage.setItem(STORAGE_KEY_OPEN, panel.hidden ? "0" : "1");

        const sess = ctx.session || {};
        const safeSession = {
          lastServiceName: sess.lastService ? sess.lastService.name : null,
          lastEventId: sess.lastEvent ? sess.lastEvent.id : null,
          awaiting: sess.awaiting || null,
          awaitingEligibilityForName: sess.awaitingEligibilityFor ? sess.awaitingEligibilityFor.name : null,
          eligibilitySession: sess.eligibilitySession ? {
            serviceName: sess.eligibilitySession.service.name,
            currentIndex: sess.eligibilitySession.currentIndex,
            passedReasons: sess.eligibilitySession.passedReasons || [],
            questionIds: sess.eligibilitySession.questions.map((q) => q.id),
          } : null,
        };
        sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(safeSession));
        sessionStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(chatLog));
      } catch (e) {}
    }

    function ask(text) {
      addBubble("user", text);
      chatLog.push({ role: "user", text });
      const typingBox = showTypingIndicator();
      setTimeout(() => {
        typingBox.remove();
        const rep = replyTo(text, ctx);
        renderReply(rep);
        chatLog.push({ role: "bot", reply: rep });
        saveChatState();
      }, 320);
    }

    function resetChat() {
      try {
        if (window.sessionStorage) {
          sessionStorage.removeItem(STORAGE_KEY_HISTORY);
          sessionStorage.removeItem(STORAGE_KEY_SESSION);
        }
      } catch (e) {}
      chatLog = [];
      thread.replaceChildren();
      ctx.session = {};
      const initial = replyTo("", ctx);
      renderReply(initial);
      chatLog.push({ role: "bot", reply: initial });
    }

    fab.addEventListener("click", () => {
      setOpen(panel.hidden);
      try {
        if (window.sessionStorage) sessionStorage.setItem(STORAGE_KEY_OPEN, panel.hidden ? "0" : "1");
      } catch (e) {}
    });
    closeBtn.addEventListener("click", () => {
      setOpen(false);
      try {
        if (window.sessionStorage) sessionStorage.setItem(STORAGE_KEY_OPEN, "0");
      } catch (e) {}
    });
    if (resetBtn) resetBtn.addEventListener("click", resetChat);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        setOpen(false);
        try {
          if (window.sessionStorage) sessionStorage.setItem(STORAGE_KEY_OPEN, "0");
        } catch (e) {}
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      ask(text);
    });

    // استعادة الجلسة السابقة إن وجدت
    let restored = false;
    try {
      if (window.sessionStorage) {
        const rawSess = sessionStorage.getItem(STORAGE_KEY_SESSION);
        if (rawSess) {
          const s = JSON.parse(rawSess);
          if (s.lastServiceName) ctx.session.lastService = findService(s.lastServiceName, services);
          if (s.lastEventId) ctx.session.lastEvent = eventById(events, s.lastEventId);
          if (s.awaiting) ctx.session.awaiting = s.awaiting;
          if (s.awaitingEligibilityForName) ctx.session.awaitingEligibilityFor = findService(s.awaitingEligibilityForName, services);
          if (s.eligibilitySession && s.eligibilitySession.serviceName) {
            const sService = findService(s.eligibilitySession.serviceName, services);
            if (sService) {
              const qList = (s.eligibilitySession.questionIds || []).map((id) => ({ id, ...(questions[id] || {}) }));
              ctx.session.eligibilitySession = {
                service: sService,
                questions: qList,
                currentIndex: s.eligibilitySession.currentIndex || 0,
                passedReasons: s.eligibilitySession.passedReasons || [],
              };
            }
          }
        }

        const rawHist = sessionStorage.getItem(STORAGE_KEY_HISTORY);
        if (rawHist) {
          const parsed = JSON.parse(rawHist);
          if (Array.isArray(parsed) && parsed.length > 0) {
            chatLog = parsed;
            for (const item of chatLog) {
              if (item.role === "user") {
                addBubble("user", item.text, false);
              } else if (item.role === "bot" && item.reply) {
                renderReply(item.reply, false);
              }
            }
            thread.scrollTop = thread.scrollHeight;
            restored = true;
          }
        }

        const wasOpen = sessionStorage.getItem(STORAGE_KEY_OPEN);
        if (wasOpen === "1") {
          setOpen(true);
        }
      }
    } catch (e) {}

    if (!restored) {
      const initial = replyTo("", ctx);
      renderReply(initial);
      chatLog.push({ role: "bot", reply: initial });
    }
  }

  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.NaamaAssistant = api;
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
      else boot();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
