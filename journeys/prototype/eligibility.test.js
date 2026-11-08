// اختبارات منطق الأهلية والرسوم. التشغيل: node --test prototype/eligibility.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { questionsFor, evaluate, describeFee, calculateFee } = require("./eligibility.js");

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
  assert.deepEqual(evaluate(questions, { account: true, violations: false }), { eligible: true, reasons: [], unanswered: [] });
  const failed = evaluate(questions, { account: false, violations: true });
  assert.equal(failed.eligible, false);
  assert.deepEqual(failed.reasons, ["سجّل حسابًا", "سدّد المخالفات"]);
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

test("describeFee covers every fee kind", () => {
  assert.equal(describeFee({ kind: "free" }), "الخدمة مجانية");
  assert.match(describeFee({ kind: "study", amount: 500 }), /فتح طلب/);
  assert.match(describeFee(undefined), /لم تُحدد/);
});
