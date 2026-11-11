/**
 * مساعد نما الذهبي: يوجّه إلى مسار (حدث حياة أو خطوات مرتبة)، ولا يعيد قائمة بحث.
 * المنطق في replyTo قابل للاختبار بلا DOM.
 */
(function (root) {
  "use strict";

  const GREETING = "أنا مساعد نما الذهبي. صفّ لي هدفك — مثل «أبي أفتح مزرعة» أو «رخصتي للبئر قربت تنتهي» — وسأرتّب لك المسار، لا قائمة نتائج.";

  const EVENT_KEYS = {
    "new-farmer": ["مزرع", "فلاح", "حيازه", "سجل زراعي", "ارض زراعي"],
    "organic-farmer": ["عضوي", "اورجانيك"],
    "new-fisher": ["صيد", "صياد", "سمك", "قارب", "لنش"],
    "livestock-breeder": ["ماشيه", "غنم", "بقر", "ابل", "مربي", "حلال"],
    "new-beekeeper": ["نحل", "عسل", "منحل", "نحال"],
    "horse-owner": ["خيل", "حصان", "مربط", "افراس"],
    "poultry-project": ["دواجن", "دجاج لاحم", "فروج"],
    "greenhouse-project": ["بيوت محميه", "بيت محمي", "صوبه"],
    "aquaculture-project": ["استزراع", "سمك مزرع"],
    "vet-clinic": ["عياده بيطري", "عيادة بيطري"],
    "import-produce": ["استيراد خضار", "استيراد فواكه", "شحن خضار"],
    "firewood-trade": ["حطب", "فحم"],
    "dam-project": ["سد", "سدود"],
    "public-works": ["مرافق عامه", "اشغال"],
    "research-project": ["بحث علمي", "عينات بحث"],
    "environmental-initiative": ["مبادره بيئيه", "تشجير", "شتل"],
    "rural-families": ["اسر ريفيه", "تنميه ريفيه"],
    "pet-travel": ["حيوان اليف", "قطه", "كلب", "سفر مع حيوان"],
    "camping-trip": ["تخييم", "كرافان", "بر"],
  };

  function normalize(text) {
    return (text || "")
      .replace(/[\u064B-\u0652\u0640]/g, "")
      .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
      .toLowerCase();
  }

  function isGreeting(query) {
    return /^(مرحبا|مرحباً|السلام|هلا|اهلا|أهلا|hi|hello|سلام)[\s!.]*$/i.test((query || "").trim());
  }

  function wantsJourney(norm) {
    return /ما اعرف اسم|ما ادري اسم|رحل المستفيد|ابدأ الرحل|من وين ابدأ/.test(norm);
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
    for (const key of keys) {
      if (norm.includes(key)) score += 2;
    }
    const title = normalize(event.title);
    if (title && norm.includes(title)) score += 4;
    return score;
  }

  function rankedEvents(norm, events) {
    return (events || [])
      .map((event) => ({ event, score: scoreEvent(norm, event) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  function wellTopic(norm) {
    return /بير|بئر|ابار|آبار/.test(norm) || /رخصه.*ماء|مياه جوفيه/.test(norm);
  }

  function laborTopic(norm) {
    return /عماله|عمال زراعي|كفاله زراعي/.test(norm);
  }

  function renewalTopic(norm) {
    return /تجديد|جدد رخص|رخصتي قرب|تنتهي رخص|انتهاء رخص/.test(norm);
  }

  function emptyReply(popularGoals) {
    return {
      text: "لم أتبين الهدف بعد. اختر مسارًا أو اكتب الغرض بصيغة «أبي …».",
      kind: "ask",
      primary: null,
      steps: [],
      questions: popularGoals,
      journey: true,
    };
  }

  function greetReply(popularGoals) {
    return {
      text: GREETING,
      kind: "greet",
      primary: null,
      steps: [],
      questions: popularGoals,
      journey: false,
    };
  }

  function guideEvent(event, services, hrefOf) {
    const required = event.steps.filter((step) => !step.optional).slice(0, 3);
    const steps = required.map((step, index) => {
      const service = findService(step.service, services);
      return {
        title: step.title,
        why: step.why,
        href: service ? hrefOf(service) : `events.html#/${event.type}/${event.id}`,
      };
    });
    return {
      text: `هذا هدف يحتاج مسارًا مرتبًا، وليس نتيجة بحث. ابدأ «${event.title}»: ${event.summary}`,
      kind: "guide",
      primary: {
        title: `مسار: ${event.title}`,
        href: `events.html#/${event.type}/${event.id}`,
        hint: "خطوات متتابعة حتى يكتمل الهدف",
      },
      steps,
      questions: [],
      journey: false,
    };
  }

  function guideNamed(service, hrefOf, extraSteps) {
    return {
      text: `هذه خدمة محددة وليست قائمة نتائج. راجع شروطها أولًا، ثم قدّم الطلب.`,
      kind: "guide",
      primary: { title: service.name, href: hrefOf(service), hint: service.category || "تفاصيل الخدمة والشروط" },
      steps: extraSteps || [],
      questions: [],
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
        why: "بدون سجل أو حيازة مسجلة لا تُقبل طلبات العمالة.",
        href: hrefOf(register),
      });
    }
    if (labor) {
      steps.push({
        title: "اطلب العمالة الزراعية",
        why: "بعد السجل تُعرض خدمة العمالة وفق ضوابط النشاط.",
        href: hrefOf(labor),
      });
    }
    return {
      text: "العمالة الزراعية ليست أول خطوة، ولا تُعرض كقائمة خدمات متشابهة. اربط الطلب بالمزرعة المسجلة ثم قدّم.",
      kind: "guide",
      primary: labor ? { title: labor.name, href: hrefOf(labor), hint: "بعد استيفاء السجل الزراعي" } : null,
      steps,
      questions: [],
      journey: false,
    };
  }

  function wellAsk() {
    return {
      text: "رخص الآبار ليست خدمة واحدة في الدليل. حدّد غرضك لأوجهك للخطوة الصحيحة، لا لقائمة الرخص.",
      kind: "ask",
      primary: null,
      steps: [],
      questions: ["حفر بئر جديدة", "استخدام مياه جوفية", "بدء نشاط زراعي ويحتاج بئرًا"],
      journey: false,
    };
  }

  function renewalAsk() {
    return {
      text: "التجديد يعتمد على نوع الرخصة، وليس على كلمة «تجديد» في البحث. أي رخصة تقصد؟",
      kind: "ask",
      primary: null,
      steps: [],
      questions: ["رخصة بئر", "رخصة صيد", "رخصة منحل", "ترخيص مشروع دواجن"],
      journey: false,
    };
  }

  function popularGoals() {
    return ["بدء النشاط الزراعي", "بدء تربية الماشية", "طلب عمالة زراعية", "رخصة بئر"];
  }

  /**
   * @returns {{text: string, kind: string, primary: object|null, steps: object[], questions: string[], journey: boolean}}
   */
  function replyTo(query, ctx) {
    const session = ctx.session || (ctx.session = {});
    const services = ctx.services || [];
    const events = ctx.events || [];
    const hrefOf = ctx.hrefOf || ((service) => `service.html?id=${encodeURIComponent(service.id)}`);
    const raw = (query || "").trim();
    const goals = popularGoals();

    if (!raw) return greetReply(goals);
    if (isGreeting(raw)) return greetReply(goals);

    const norm = normalize(raw);
    if (wantsJourney(norm)) {
      return {
        text: "رحلة المستفيد ترتّب الخدمات حسب صفتك ونشاطك، وهي أنسب إن كنت لا تعرف الاسم الرسمي.",
        kind: "guide",
        primary: { title: "ابدأ رحلة المستفيد", href: "journey.html", hint: "من أنت؟ ثم فئتك ثم احتياجك" },
        steps: [],
        questions: goals,
        journey: true,
      };
    }

    if (session.awaiting === "well" || (wellTopic(norm) && /حفر/.test(norm))) {
      const well = findService("رخصة حفر بئر جديدة", services);
      if (well && (/حفر/.test(norm) || session.awaiting === "well" && /حفر/.test(norm))) {
        session.awaiting = null;
        return guideNamed(well, hrefOf, [{
          title: "بعد الرخصة",
          why: "إن كنت تبدأ مزرعة، أكمل مسار النشاط الزراعي بعد رخصة البئر.",
          href: "events.html#/individual/new-farmer",
        }]);
      }
    }
    if (session.awaiting === "well" && /استخدام|جوفي/.test(norm)) {
      const use = findService("إصدار رخص استخدام مصادر المياه الجوفية ( الابار )", services);
      session.awaiting = null;
      if (use) return guideNamed(use, hrefOf);
    }
    if (session.awaiting === "well" && /نشاط زراعي|مزرع/.test(norm)) {
      session.awaiting = null;
      const event = eventById(events, "new-farmer");
      if (event) return guideEvent(event, services, hrefOf);
    }
    if (session.awaiting === "renewal") {
      session.awaiting = null;
      return replyTo(raw.replace(/تجديد/g, "").trim() || raw, ctx);
    }

    if (wellTopic(norm) && !/حفر بئر جديده|حفر بئر جديدة/.test(raw)) {
      session.awaiting = "well";
      return wellAsk();
    }
    if (laborTopic(norm)) {
      session.awaiting = null;
      return laborGuide(services, hrefOf);
    }
    if (renewalTopic(norm) && !wellTopic(norm)) {
      session.awaiting = "renewal";
      return renewalAsk();
    }

    const ranked = rankedEvents(norm, events);
    if (ranked.length >= 2 && ranked[0].score === ranked[1].score) {
      session.awaiting = "event";
      return {
        text: "وجدت أكثر من مسار محتمل. اختر هدفك لأرتّب خطواته، بدل عرض خدمات متشابهة.",
        kind: "ask",
        primary: null,
        steps: [],
        questions: ranked.slice(0, 3).map((row) => row.event.title),
        journey: false,
      };
    }
    if (ranked.length && ranked[0].score >= 2) {
      session.awaiting = null;
      return guideEvent(ranked[0].event, services, hrefOf);
    }

    const titled = events.find((event) => normalize(event.title) === norm);
    if (titled) {
      session.awaiting = null;
      return guideEvent(titled, services, hrefOf);
    }

    const named = services.filter((s) => s.published && normalize(s.name) === norm);
    if (named.length === 1) return guideNamed(named[0], hrefOf);

    return emptyReply(goals);
  }

  const api = { replyTo, GREETING, laborGuide, wellAsk };

  function boot() {
    const shell = document.querySelector(".naama-assist");
    if (!shell || !root.NaamaDom) return;
    const { createElement, serviceUrl } = root.NaamaDom;
    const fab = shell.querySelector(".naama-assist-fab");
    const panel = document.getElementById("naama-assist-panel");
    const thread = document.getElementById("naama-assist-thread");
    const form = document.getElementById("naama-assist-form");
    const input = document.getElementById("naama-assist-input");
    const closeBtn = shell.querySelector(".naama-assist-close");
    if (!fab || !panel || !thread || !form || !input) return;

    const data = root.NAAMA_DATA;
    const services = data && Array.isArray(data.services) ? data.services : [];
    const events = root.NaamaLifeEvents ? root.NaamaLifeEvents.LIFE_EVENTS : [];
    const ctx = {
      services,
      events,
      hrefOf: (service) => serviceUrl(service),
      session: {},
    };

    function setOpen(open) {
      panel.hidden = !open;
      fab.setAttribute("aria-expanded", String(open));
      if (open) input.focus();
    }

    function addBubble(role, text) {
      const box = createElement("div", `naama-assist-msg ${role}`);
      box.append(createElement("p", null, text));
      thread.append(box);
      return box;
    }

    function renderReply(reply) {
      const box = addBubble("bot", reply.text);
      if (reply.kind === "guide") {
        box.prepend(createElement("span", "naama-assist-badge", "مسار موجَّه"));
      } else if (reply.kind === "ask") {
        box.prepend(createElement("span", "naama-assist-badge ask", "سؤال توضيحي"));
      }
      if (reply.primary) {
        const link = createElement("a", "naama-assist-primary");
        link.href = reply.primary.href;
        link.append(createElement("strong", null, reply.primary.title));
        if (reply.primary.hint) link.append(createElement("small", null, reply.primary.hint));
        box.append(link);
      }
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
        link.append(createElement("strong", null, "أو ابدأ رحلة المستفيد"));
        box.append(link);
      }
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

    function ask(text) {
      addBubble("user", text);
      renderReply(replyTo(text, ctx));
    }

    fab.addEventListener("click", () => setOpen(panel.hidden));
    closeBtn.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) setOpen(false);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      ask(text);
    });

    renderReply(replyTo("", ctx));
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
