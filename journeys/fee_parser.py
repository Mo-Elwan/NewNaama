"""
تحويل نص الرسوم الحر في عمود SERVICECOST إلى بيانات منظمة يعرضها النموذج.

أنواع الرسوم (kind):
- free        : الخدمة مجانية.
- fixed       : مبلغ ثابت (amount).
- study       : تُحدد بعد دراسة الطلب، وقد يوجد مبلغ فتح طلب (amount).
- calculator  : تُحسب من مدخلات يدخلها المستفيد (calculator).
- text        : نص لا يمكن تفسيره، يُعرض كما هو.
- unknown     : لم تُسجَّل رسوم للخدمة في الدليل.

الحاسبات تُعرَّف يدويًا في FEE_CALCULATORS لأن صيغتها لا يمكن استنتاجها
بشكل موثوق من النص الحر. يُضاف لها مفتاح باسم الخدمة (بعد توحيد الحروف).
"""

import re

from journey_rules import normalize_arabic

_FREE = re.compile(r"مجان|لا يوجد|بدون رسوم")
_STUDY = re.compile(r"بعد دراسه|يتم تقدير|يتم تحديد")
_AMOUNT = re.compile(r"(\d[\d,]*(?:\.\d+)?)")
_ONLY_AMOUNT = re.compile(r"^\d[\d,]*(?:\.\d+)?\s*(ريال|رياب|ر\.س)?$")

# كل خيار يحدد المبلغ، و per_unit يعني أن المبلغ يُضرب في عدد الوحدات المُدخل.
FEE_CALCULATORS = {
    normalize_arabic("خدمة كشف التسربات و التدقيق المائي"): {
        "note": "هذا هو الحد الأدنى للرسوم، وقد يزيد بعد المعاينة.",
        "options_label": "نوع العقار",
        "options": [
            {"label": "عقار سكني", "amount": 150, "per_unit": False},
            {"label": "عقار تجاري أو حكومي", "amount": 500, "per_unit": True},
        ],
        "unit_label": "عدد شبكات المياه في الطلب",
    },
}


def _to_number(text):
    value = float(text.replace(",", ""))
    return int(value) if value.is_integer() else value


def parse_fee(service_name, cost_text):
    """يعيد وصف الرسوم كقاموس {kind, text, amount?, calculator?}."""
    text = " ".join((cost_text or "").split())
    calculator = FEE_CALCULATORS.get(normalize_arabic(service_name))
    if calculator:
        return {"kind": "calculator", "text": text, "calculator": calculator}
    if not text:
        return {"kind": "unknown", "text": ""}

    normalized = normalize_arabic(text)
    amount_match = _AMOUNT.search(normalized)
    amount = _to_number(amount_match.group(1)) if amount_match else None
    if _FREE.search(normalized):
        return {"kind": "free", "text": text}
    if _STUDY.search(normalized):
        return {"kind": "study", "text": text, "amount": amount}
    if _ONLY_AMOUNT.match(normalized):
        return {"kind": "fixed", "text": text, "amount": amount}
    return {"kind": "text", "text": text}


def fee_summary(fee):
    """وصف نصي مختصر للرسوم يُستخدم في ملف Excel."""
    kind = fee["kind"]
    if kind == "free":
        return "مجانية"
    if kind == "fixed":
        return f"{fee['amount']} ريال"
    if kind == "study":
        opening = f" (رسوم فتح طلب {fee['amount']} ريال)" if fee.get("amount") else ""
        return "تُحدد بعد دراسة الطلب" + opening
    if kind == "calculator":
        return "تُحسب حسب مدخلات المستفيد: " + fee["text"]
    if kind == "text":
        return fee["text"]
    return "غير محددة في الدليل"
