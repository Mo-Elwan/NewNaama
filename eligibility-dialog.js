/**
 * نافذة "التحقق من الأهلية والرسوم": تعرض أسئلة الخدمة وحاسبة الرسوم،
 * وتُظهر زر التقديم عند الاستيفاء، أو خطوات "كيف تصبح مؤهلًا" عند الاختلاف.
 */
(function (root) {
  "use strict";

  const { createElement, safeUrl, externalLink, journeyUrl } = root.NaamaDom;
  const { describeFee, calculateFee, evaluate, howToQualify, formatAmount } = root.NaamaEligibility;

  const dialog = document.getElementById("eligibility-dialog");

  function sectionTitle(text) {
    return createElement("h3", "modal-section-title", text);
  }

  function yesNoQuestion(question, index) {
    const fieldset = createElement("fieldset", "question");
    fieldset.append(createElement("legend", null, `${index + 1}. ${question.text}`));
    const options = createElement("div", "question-options");
    for (const [label, value] of [["نعم", "yes"], ["لا", "no"]]) {
      const option = createElement("label", "radio-option");
      const input = createElement("input");
      input.type = "radio";
      input.name = `q-${question.id}`;
      input.value = value;
      input.required = true;
      option.append(input, createElement("span", null, label));
      options.append(option);
    }
    fieldset.append(options);
    return fieldset;
  }

  /** حقول الحاسبة: اختيار الفئة، وعدد الوحدات يظهر فقط للفئات المحسوبة بالوحدة. */
  function feeCalculatorFields(calculator) {
    const wrapper = createElement("div", "fee-calculator");
    const select = createElement("select", "form-control");
    select.name = "fee-option";
    select.required = true;
    select.append(new Option(`اختر ${calculator.options_label}`, ""));
    calculator.options.forEach((option, index) => select.append(new Option(option.label, String(index))));

    const unitsField = createElement("label", "form-field");
    const units = createElement("input", "form-control");
    units.type = "number";
    units.name = "fee-units";
    units.min = "1";
    units.max = String(root.NaamaEligibility.MAX_UNITS);
    units.step = "1";
    unitsField.append(createElement("span", null, calculator.unit_label), units);

    const syncUnitsField = () => {
      const option = calculator.options[select.value];
      const needsUnits = Boolean(option && option.per_unit);
      unitsField.hidden = !needsUnits;
      units.required = needsUnits;
    };
    select.addEventListener("change", syncUnitsField);
    syncUnitsField();

    const selectField = createElement("label", "form-field");
    selectField.append(createElement("span", null, calculator.options_label), select);
    wrapper.append(selectField, unitsField);
    if (calculator.note) wrapper.append(createElement("p", "hint", calculator.note));
    return wrapper;
  }

  function readAnswers(form, questions) {
    const answers = {};
    for (const q of questions) {
      const checked = form.querySelector(`input[name="q-${q.id}"]:checked`);
      if (checked) answers[q.id] = checked.value === "yes";
    }
    return answers;
  }

  /** نص الرسوم في النتيجة: المبلغ المحسوب للحاسبة، أو وصف الرسوم لغيرها. */
  function feeResultText(form, fee) {
    if (fee.kind !== "calculator") return describeFee(fee);
    const optionIndex = form.elements["fee-option"].value;
    const units = Number(form.elements["fee-units"].value);
    const result = calculateFee(fee.calculator, optionIndex === "" ? -1 : Number(optionIndex), units);
    const note = fee.calculator.note ? ` - ${fee.calculator.note}` : "";
    return result.error || `الرسوم المتوقعة: ${formatAmount(result.amount)}${note}`;
  }

  function successResult(url, feeText) {
    const box = createElement("div", "result-box success");
    box.append(createElement("strong", null, "أنت مستوفٍ لشروط التقديم على هذه الخدمة"));
    box.append(createElement("p", null, feeText));
    box.append(externalLink("btn btn-primary", "التقديم على الخدمة ←", url));
    return box;
  }

  function nextStepsResult(failed, context) {
    const box = createElement("div", "result-box next-steps");
    box.append(createElement("strong", null, "كيف تصبح مؤهلًا لهذه الخدمة"));
    box.append(createElement("p", null, "الشروط التالية غير مستوفاة. أكملها ثم أعد التحقق من الأهلية."));
    const list = createElement("ol", "next-steps-list");
    for (const step of howToQualify(failed, context)) {
      const item = createElement("li", "next-step");
      item.append(createElement("p", null, step.how));
      if (step.service) {
        item.append(externalLink("btn btn-outline", `ابدأ: ${step.linkLabel} ←`,
          journeyUrl(step.service, step.action, context.typeKey)));
      } else if (step.url) {
        item.append(externalLink("btn btn-outline", `ابدأ من ${step.linkLabel} ←`, step.url));
      }
      list.append(item);
    }
    box.append(list);
    return box;
  }

  function markFailedQuestions(form, questions, failed) {
    const failedIds = new Set(failed.map((q) => q.id));
    for (const question of questions) {
      const fieldset = form.querySelector(`input[name="q-${question.id}"]`)?.closest("fieldset");
      if (fieldset) fieldset.classList.toggle("failed", failedIds.has(question.id));
    }
  }

  function buildForm({ questions, fee, url, service, action, typeKey, services }) {
    const form = createElement("form", "modal-body");
    const resultArea = createElement("div", "result-area");
    resultArea.setAttribute("aria-live", "polite");
    const qualifyContext = { services, currentService: service, currentAction: action, typeKey };

    form.append(sectionTitle("الرسوم"), createElement("p", "fee-text", describeFee(fee)));
    if (fee.kind === "calculator") form.append(feeCalculatorFields(fee.calculator));

    form.append(sectionTitle("أسئلة الأهلية"));
    if (questions.length) questions.forEach((q, i) => form.append(yesNoQuestion(q, i)));
    else form.append(createElement("p", "hint", "لا توجد شروط أهلية مسجلة لهذه الخدمة."));

    const submit = createElement("button", "btn btn-primary", "تحقق من الأهلية");
    submit.type = "submit";
    const footer = createElement("div", "modal-actions");
    footer.append(submit);
    form.append(footer, resultArea);

    form.addEventListener("change", () => {
      resultArea.replaceChildren();
      markFailedQuestions(form, questions, []);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const { eligible, failed } = evaluate(questions, readAnswers(form, questions));
      markFailedQuestions(form, questions, failed);
      resultArea.replaceChildren(
        eligible ? successResult(url, feeResultText(form, fee)) : nextStepsResult(failed, qualifyContext)
      );
      resultArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return form;
  }

  /**
   * يفتح النافذة لخدمة أو إجراء.
   * @param {{title: string, subtitle?: string, url: string, questions: object[], fee: object, service?: object, action?: object, typeKey?: string, services?: object[]}} target
   * url يجب أن يكون رابط http/https صالحًا (تتكفل الصفحة بالرجوع لمنصة نما عند غيابه).
   */
  function open(target) {
    const header = createElement("div", "modal-header");
    const titles = createElement("div");
    titles.append(createElement("h2", null, "التحقق من الأهلية والرسوم"), createElement("p", "hint", target.title));
    if (target.subtitle) titles.append(createElement("p", "modal-subtitle", target.subtitle));
    const close = createElement("button", "modal-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "إغلاق");
    close.addEventListener("click", () => dialog.close());
    header.append(titles, close);

    const url = safeUrl(target.url);
    if (!url) throw new Error(`رابط التقديم غير صالح للخدمة: ${target.title}`);
    dialog.replaceChildren(header, buildForm({ ...target, url }));
    dialog.showModal();
  }

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  root.NaamaEligibilityDialog = { open };
})(window);
