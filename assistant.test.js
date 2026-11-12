// اختبارات توجيه المساعد الذهبي (مسار وليس بحثًا).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { replyTo } = require("./assistant.js");
const { LIFE_EVENTS } = require("./life-events.js");

let cached;
function loadData() {
  if (!cached) {
    global.window = global.window || {};
    require(path.join(__dirname, "data.js"));
    cached = global.window.NAAMA_DATA;
  }
  return cached;
}

function ctx() {
  return {
    services: loadData().services,
    events: LIFE_EVENTS,
    hrefOf: (service) => `service.html?id=${service.id}`,
    session: {},
  };
}

test("greeting explains the assistant is a guide not a search list", () => {
  const reply = replyTo("مرحبا", ctx());
  assert.match(reply.text, /مسار/);
  assert.equal(reply.kind, "greet");
  assert.equal(reply.steps.length, 0);
});

test("labor request returns a two-step path not similar labor listings", () => {
  const reply = replyTo("عايز عمالة زراعية", ctx());
  assert.equal(reply.kind, "guide");
  assert.ok(reply.steps.length >= 2);
  assert.match(reply.steps[0].title, /سجّل|سجل/);
  assert.match(reply.steps[1].title, /عمال/);
  assert.equal(reply.primary && reply.primary.title, "طلب عمالة زراعية");
  assert.equal(reply.steps.filter((s) => /عمالة زراعية مؤقتة|قطاع النخيل/.test(s.title)).length, 0);
});

test("well request asks for the purpose instead of listing licenses", () => {
  const reply = replyTo("بير", ctx());
  assert.equal(reply.kind, "ask");
  assert.ok(reply.questions.some((q) => q.includes("حفر")));
  assert.equal(reply.steps.length, 0);
});

test("farm start opens a life-event path", () => {
  const reply = replyTo("أبي أسجل مزرعة", ctx());
  assert.equal(reply.kind, "guide");
  assert.match(reply.primary.href, /events.html#\/individual\/new-farmer/);
  assert.ok(reply.steps.length >= 1);
});

test("choosing drill after a well question goes to the new-well license", () => {
  const session = {};
  const shared = { ...ctx(), session };
  replyTo("رخصة بئر", shared);
  const reply = replyTo("حفر بئر جديدة", shared);
  assert.equal(reply.kind, "guide");
  assert.match(reply.primary.title, /حفر بئر/);
});

test("unknown text offers goals instead of an empty catalog dump", () => {
  const reply = replyTo("asdfqwer", ctx());
  assert.equal(reply.kind, "ask");
  assert.ok(reply.questions.length >= 3);
});

test("support query returns phone number 939 and official channels", () => {
  const reply = replyTo("رقم التواصل والدعم الفني", ctx());
  assert.ok(reply.text.includes("939"));
  assert.equal(reply.kind, "guide");
});

test("conditions query for well license returns specific requirements", () => {
  const reply = replyTo("وش شروط رخصة حفر بئر", ctx());
  assert.ok(reply.text.includes("شروط ومتطلبات") || reply.text.includes("شروط"));
  assert.ok(reply.conditions && reply.conditions.length > 0);
});

test("fees query for free service explains it is free 0 SAR", () => {
  const reply = replyTo("كم رسوم طلب كمية مياه اضافية", ctx());
  assert.ok(reply.text.includes("مجانية") || reply.text.includes("مجاناً"));
});

test("multi-turn context: asking fees right after discussing a service", () => {
  const session = {};
  const shared = { ...ctx(), session };
  replyTo("طلب ترقيم الماشية", shared);
  const rFee = replyTo("كم رسومها؟", shared);
  assert.ok(rFee.text.includes("طلب ترقيم الماشية"));
  assert.ok(rFee.text.includes("رسوم"));
});

test("multi-turn context: asking conditions right after discussing a service", () => {
  const session = {};
  const shared = { ...ctx(), session };
  replyTo("رخصة حفر بئر جديدة", shared);
  const rCond = replyTo("وش شروطها؟", shared);
  assert.ok(rCond.text.includes("رخصة حفر بئر جديدة"));
  assert.ok(rCond.conditions && rCond.conditions.length > 0);
});

test("saudi dialect: كرت مربي resolves to إصدار سجل مربي", () => {
  const reply = replyTo("أبي أطلع كرت مربي", ctx());
  assert.ok(reply.primary && reply.primary.title.includes("سجل مربي"));
});

test("conditions for labor resolves to agricultural labor conditions", () => {
  const reply = replyTo("ما هي شروط العمالة؟", ctx());
  assert.equal(reply.kind, "guide");
  assert.ok(reply.service && reply.service.name === "طلب عمالة زراعية");
  assert.ok(reply.text.includes("طلب عمالة زراعية"));
  assert.ok(reply.conditions && reply.conditions.length > 0);
});

test("dialect: شروط العمالة resolves to طلب عمالة زراعية", () => {
  const reply = replyTo("شروط العمالة", ctx());
  assert.ok(reply.service && reply.service.name === "طلب عمالة زراعية");
});

test("import bees resolves to specific service and links related journey", () => {
  const reply = replyTo("استيراد النحل", ctx());
  assert.equal(reply.kind, "guide");
  assert.ok(reply.service && reply.service.name === "إذن استيراد النحل و ملكات النحل");
  assert.ok(reply.primary && reply.primary.title.includes("إذن استيراد النحل"));
  assert.ok(reply.steps && reply.steps.some((s) => s.title.includes("بدء تربية النحل")));
});

test("life event goal: بدء تربية النحل returns full journey", () => {
  const reply = replyTo("بدء تربية النحل", ctx());
  assert.equal(reply.kind, "guide");
  assert.ok(reply.event && reply.event.id === "new-beekeeper");
  assert.ok(reply.primary && reply.primary.title.includes("بدء تربية النحل"));
  assert.ok(reply.steps && reply.steps.length >= 2);
});

test("in-chat interactive eligibility check: asks questions and qualifies", () => {
  const session = {};
  const shared = { ...ctx(), session };
  const rCond = replyTo("ما هي شروط العمالة؟", shared);
  assert.ok(rCond.text.includes("التحقق التفاعلي"));
  assert.ok(rCond.questions.some((q) => q.includes("فحص الأهلية")));

  const rQ1 = replyTo("نعم، ابدأ فحص الأهلية الآن 🔍", shared);
  assert.equal(rQ1.kind, "ask");
  assert.ok(rQ1.text.includes("1 من 3"));

  const rQ2 = replyTo("نعم، متوفر لدي", shared);
  assert.equal(rQ2.kind, "ask");
  assert.ok(rQ2.text.includes("2 من 3"));

  const rQ3 = replyTo("نعم", shared);
  assert.equal(rQ3.kind, "ask");
  assert.ok(rQ3.text.includes("3 من 3"));

  const rFinal = replyTo("لا، لا توجد مخالفات", shared);
  assert.equal(rFinal.kind, "guide");
  assert.ok(rFinal.text.includes("تهانينا"));
  assert.ok(rFinal.primary && rFinal.primary.title.includes("طلب عمالة زراعية"));
});

test("in-chat eligibility check: ineligible condition guides with prerequisite", () => {
  const session = {};
  const shared = { ...ctx(), session };
  replyTo("ما هي شروط العمالة؟", shared);
  replyTo("فحص الأهلية", shared);
  const rFail = replyTo("لا، غير متوفر", shared);
  assert.equal(rFail.kind, "guide");
  assert.ok(rFail.text.includes("غير مستوفى"));
  assert.ok(rFail.primary && rFail.primary.title.includes("تسجيل موقع زراعي جديد"));
});
