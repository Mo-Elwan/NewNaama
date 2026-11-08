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
   * @returns {{eligible: boolean, reasons: string[], unanswered: string[]}}
   */
  function evaluate(questions, answers) {
    const unanswered = questions.filter((q) => typeof answers[q.id] !== "boolean").map((q) => q.id);
    const reasons = questions
      .filter((q) => typeof answers[q.id] === "boolean" && answers[q.id] !== q.expect)
      .map((q) => q.reason);
    return { eligible: !unanswered.length && !reasons.length, reasons, unanswered };
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

  const api = { questionsFor, evaluate, describeFee, calculateFee, formatAmount, MAX_UNITS };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NaamaEligibility = api;
})(typeof window !== "undefined" ? window : globalThis);
