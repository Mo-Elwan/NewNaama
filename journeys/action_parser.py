"""
تحليل أسماء الإجراءات الفرعية إلى (نوع الترخيص، العملية).

مثال: "تجديد ترخيص إنشائي زراعة الزيتون" -> ("construction", "تجديد")
       "ترخيص تشغيلي زراعة الزيتون"       -> ("operational", "إصدار جديد")
       "إلغاء ترخيص زراعة الزيتون"        -> ("general", "إلغاء")
"""

import re

from journey_rules import normalize_arabic

GENERAL_STAGE = "general"

# الترتيب هنا هو ترتيب العرض للمستفيد (مراحل الترخيص الطبيعية).
LICENSE_STAGES = {
    "initial": "ترخيص مبدئي",
    "construction": "ترخيص إنشائي",
    "operational": "ترخيص تشغيلي",
    GENERAL_STAGE: "إجراءات أخرى",
}

_STAGE_PATTERNS = [
    ("initial", re.compile(r"مبدئ|مبدي")),
    ("construction", re.compile(r"انشائ|انشاي")),
    ("operational", re.compile(r"تشغيل")),
]

NEW_ISSUE = "إصدار جديد"

# الترتيب هنا هو ترتيب عرض العمليات داخل كل نوع ترخيص.
_OPERATION_PATTERNS = [
    (NEW_ISSUE, re.compile(r"^(خدمات )?(اصدار|ترخيص|تصريح|الترخيص|التصريح|رخصه)\b")),
    ("تجديد", re.compile(r"^(خدمه )?تجديد")),
    ("نقل ملكية", re.compile(r"^نقل ملكيه")),
    ("تغيير نشاط", re.compile(r"^(خدمه )?تغيير نشاط")),
    ("توسعة مشروع", re.compile(r"^توسعه")),
    ("تحويل رخصة ورقية إلى إلكترونية", re.compile(r"^تحويل")),
    ("تحديث بيانات", re.compile(r"^تحديث")),
    ("استبدال", re.compile(r"^استبدال")),
    ("نقل", re.compile(r"^نقل")),
    ("إلغاء", re.compile(r"^الغاء")),
]
OPERATION_ORDER = [label for label, _ in _OPERATION_PATTERNS]


def detect_stage(action_name):
    """يعيد مفتاح نوع الترخيص، أو general إذا لم يُذكر نوع في الاسم."""
    name = normalize_arabic(action_name)
    for stage, pattern in _STAGE_PATTERNS:
        if pattern.search(name):
            return stage
    return GENERAL_STAGE


def detect_operation(action_name, fallback):
    """
    يعيد اسم العملية الموحد (إصدار جديد، تجديد، ...).
    إذا لم يُعرف النمط يعيد fallback (الاسم المختصر للإجراء) حتى لا يضيع أي إجراء.
    """
    name = normalize_arabic(action_name)
    for label, pattern in _OPERATION_PATTERNS:
        if pattern.search(name):
            return label
    return fallback


def short_action_name(action_name, service_name):
    """يحذف اسم الخدمة الأم من اسم الإجراء لعرضه مختصرًا."""
    short = " ".join(action_name.replace(service_name, "").split())
    return short if len(short) > 2 else action_name


def parse_action(action_name, service_name):
    """
    يعيد (نوع الترخيص، العملية) للإجراء.
    يُحلَّل الاسم بعد حذف اسم الخدمة، لأن بعض أسماء الخدمات نفسها تحتوي
    على كلمة "تشغيل" (مثل: تشغيل مفارخ الدجاج) فتُفهم خطأً كترخيص تشغيلي.
    """
    short = short_action_name(action_name, service_name)
    return detect_stage(short), detect_operation(short, short)


def sort_key(stage, operation):
    """مفتاح ترتيب: حسب مرحلة الترخيص ثم حسب ترتيب العمليات المعروف."""
    stage_index = list(LICENSE_STAGES).index(stage)
    op_index = OPERATION_ORDER.index(operation) if operation in OPERATION_ORDER else len(OPERATION_ORDER)
    return stage_index, op_index
