// اختبارات منطق الأهلية والرسوم. التشغيل: node --test prototype/eligibility.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { questionsFor, evaluate, howToQualify, QUALIFY_FIXES, describeFee, calculateFee } = require("./eligibility.js");

let cachedData;
function loadData() {
  if (!cachedData) {
    global.window = global.window || {};
    require(path.join(__dirname, "data.js"));
    cachedData = global.window.NAAMA_DATA;
  }
  return cachedData;
}

const BANK = {
  account: { text: "حساب؟", expect: true, reason: "سجّل حسابًا" },
  cr: { text: "سجل تجاري؟", expect: true, reason: "سجل تجاري مطلوب", for_types: ["company"] },
  violations: { text: "مخالفات؟", expect: false, reason: "سدّد المخالفات" },
};

const CALCULATOR = {
  options_label: "نوع العقار",
  unit_label: "عدد الشبكات",
  options: [
    { label: "سكني", amount: 150, per_unit: false },
    { label: "تجاري", amount: 500, per_unit: true },
  ],
};

test("questionsFor removes duplicates and questions for other beneficiary types", () => {
  assert.deepEqual(questionsFor(["account", "cr", "account"], "individual", BANK).map((q) => q.id), ["account"]);
  assert.deepEqual(questionsFor(["account", "cr"], "company", BANK).map((q) => q.id), ["account", "cr"]);
});

test("questionsFor fails loudly on an undefined question", () => {
  assert.throws(() => questionsFor(["missing"], "company", BANK), /missing/);
});

test("evaluate passes only when every answer matches the expected one", () => {
  const questions = questionsFor(["account", "violations"], "individual", BANK);
  assert.deepEqual(evaluate(questions, { account: true, violations: false }), {
    eligible: true, reasons: [], unanswered: [], failed: [],
  });
  const failed = evaluate(questions, { account: false, violations: true });
  assert.equal(failed.eligible, false);
  assert.deepEqual(failed.reasons, ["سجّل حسابًا", "سدّد المخالفات"]);
  assert.deepEqual(failed.failed.map((q) => q.id), ["account", "violations"]);
});

test("evaluate treats unanswered questions as not eligible", () => {
  const result = evaluate(questionsFor(["account"], "individual", BANK), {});
  assert.equal(result.eligible, false);
  assert.deepEqual(result.unanswered, ["account"]);
});

test("evaluate with no questions is eligible", () => {
  assert.equal(evaluate([], {}).eligible, true);
});

test("calculateFee uses a flat amount or multiplies per unit", () => {
  assert.deepEqual(calculateFee(CALCULATOR, 0, NaN), { amount: 150 });
  assert.deepEqual(calculateFee(CALCULATOR, 1, 3), { amount: 1500 });
});

test("calculateFee rejects missing option and invalid unit counts", () => {
  assert.ok(calculateFee(CALCULATOR, -1, 1).error);
  for (const units of [0, -2, 1.5, NaN, 1001]) assert.ok(calculateFee(CALCULATOR, 1, units).error, String(units));
});

test("howToQualify falls back to the reason when no next service is mapped", () => {
  const questions = questionsFor(["account"], "individual", BANK);
  const [step] = howToQualify(evaluate(questions, { account: false }).failed);
  assert.equal(step.how, "سجّل حسابًا");
  assert.equal(step.service, null);
  assert.equal(step.url, null);
});

test("howToQualify links a failed register check to the Naama service that creates it", () => {
  const services = loadData().services;
  const questions = [{ id: "breeder_record", reason: "يُشترط وجود سجل مربي مفعّل قبل طلب الخدمة." }];
  const [step] = howToQualify(questions, { services });
  assert.match(step.how, /سجل المربي/);
  assert.equal(step.service.name, "إصدار سجل مربي");
  assert.equal(step.url, null);
});

test("howToQualify points construction-license failure to the same service's initial action", () => {
  const service = loadData().services.find((s) => s.published && s.name === "إنتاج الدجاج اللاحم");
  const currentAction = service.actions.find((a) => a.stage === "construction" && a.operation === "إصدار جديد");
  const [step] = howToQualify(
    [{ id: "has_initial_license", reason: "يتطلب الترخيص الإنشائي الحصول على ترخيص مبدئي معتمد أولًا." }],
    { currentService: service, currentAction }
  );
  assert.equal(step.service, service);
  assert.equal(step.action.stage, "initial");
  assert.equal(step.action.operation, "إصدار جديد");
});

test("howToQualify uses an external agency link when the fix is outside Naama", () => {
  const [step] = howToQualify([{ id: "commercial_register", reason: "سجل تجاري مطلوب" }]);
  assert.equal(step.url, "https://mc.gov.sa");
  assert.equal(step.linkLabel, "وزارة التجارة");
  assert.equal(step.service, null);
});

test("every mapped Naama fix matches exactly one published service", () => {
  const services = loadData().services;
  for (const [id, fix] of Object.entries(QUALIFY_FIXES)) {
    if (!fix.service) continue;
    const matches = services.filter((s) => s.published && s.name === fix.service);
    assert.equal(matches.length, 1, `${id} → "${fix.service}" matches ${matches.length}`);
    if (fix.operation) {
      const action = matches[0].actions.find((a) => a.operation === fix.operation && (!fix.stage || a.stage === fix.stage));
      assert.ok(action, `${id} has no action "${fix.operation}" on "${fix.service}"`);
    }
  }
});

test("describeFee covers every fee kind", () => {
  assert.equal(describeFee({ kind: "free" }), "الخدمة مجانية");
  assert.match(describeFee({ kind: "study", amount: 500 }), /فتح طلب/);
  assert.match(describeFee(undefined), /لم تُحدد/);
});
