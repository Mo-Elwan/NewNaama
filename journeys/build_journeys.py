"""
يبني رحلات المستفيد من ملف خدمات نما.

الاستخدام:
    python build_journeys.py [مسار ملف الخدمات]

المخرجات (في مجلد output):
- خدمات_نما_رحلات_المستفيد.xlsx : ملف المراجعة (الهيكل، التوزيع، غير المصنّف).
- prototype/data.js               : بيانات النموذج التفاعلي.
"""

import json
import re
import sys
import warnings
from collections import Counter
from pathlib import Path

import pandas as pd
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from action_parser import LICENSE_STAGES, parse_action, sort_key
from eligibility_rules import QUESTIONS, action_questions, question_label, service_questions, validate_questions
from fee_parser import fee_summary, parse_fee
from journey_rules import EXCLUDE, RULES, normalize_arabic
from journey_taxonomy import TAXONOMY, expand_path, resolve_labels

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_SOURCE = BASE_DIR.parent / "naamaservicesystem1.xls"
OUTPUT_DIR = BASE_DIR / "output"
EXCEL_PATH = OUTPUT_DIR / "خدمات_نما_رحلات_المستفيد.xlsx"
DATA_JS_PATH = BASE_DIR / "prototype" / "data.js"

REQUIRED_COLUMNS = {
    "ID", "CODE", "PARENTID", "SERVICEORDER", "NAMEAR", "SHORTDESCRIPTIONAR",
    "CATEGUERYNAME", "SECTORNAME", "SERVICESYSTEMNAME", "URLAR", "ISACTIVE", "ISPUBLISHED", "SERVICECOST",
}


_BROKEN_SCHEME = re.compile(r"^(https?):/+", re.IGNORECASE)
_BARE_DOMAIN = re.compile(r"^[\w-]+(\.[\w-]+)+(/|$)")


def clean_url(url):
    """
    يصلح الأخطاء الشائعة في روابط الدليل: "https:/x" أو "https:///x" -> "https://x"،
    و"naama.sa" -> "https://naama.sa". يعيد "" لأي قيمة ليست رابطًا حتى تُحوَّل لمنصة نما.
    """
    url = (url or "").strip()
    if _BROKEN_SCHEME.match(url):
        return _BROKEN_SCHEME.sub(lambda m: f"{m.group(1).lower()}://", url, count=1)
    if _BARE_DOMAIN.match(url):
        return "https://" + url
    return ""


def load_services(source_path):
    """يقرأ ملف الخدمات ويتحقق من وجود الأعمدة المطلوبة."""
    if not source_path.exists():
        raise FileNotFoundError(f"ملف الخدمات غير موجود: {source_path}")
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")  # تحذيرات OLE2 من xlrd لا تؤثر على صحة القراءة
        df = pd.read_excel(source_path, dtype=str).fillna("")
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"أعمدة مفقودة في {source_path.name}: {sorted(missing)}")
    for column in ("NAMEAR", "SHORTDESCRIPTIONAR", "CATEGUERYNAME"):
        df[column] = df[column].str.strip()
    return df


def classify(name, category):
    """يعيد قائمة المسارات (بعد توسيع ALL) التي تنتمي لها الخدمة حسب القواعد."""
    name_n, cat_n = normalize_arabic(name), normalize_arabic(category)
    paths = []
    for rule in RULES:
        if rule["name"] and not rule["name"].search(name_n):
            continue
        if rule["cat"] and not rule["cat"].search(cat_n):
            continue
        if rule["not_name"] and rule["not_name"].search(name_n):
            continue
        for path in rule["paths"]:
            for expanded in ([path] if path == EXCLUDE else expand_path(path)):
                if expanded not in paths:
                    paths.append(expanded)
    return paths


def _sub_services(df):
    """
    يجمع الإجراءات الفرعية النشطة تحت الخدمة الأم، مع تحديد نوع الترخيص
    (مبدئي/إنشائي/تشغيلي) والعملية (إصدار جديد/تجديد/...) لكل إجراء.
    """
    service_names = dict(zip(df.ID, df.NAMEAR))
    children = df[(df.PARENTID != "") & (df.ISACTIVE == "1")]
    actions_by_parent = {}
    for r in children.itertuples():
        stage, operation = parse_action(r.NAMEAR, service_names.get(r.PARENTID, ""))
        actions_by_parent.setdefault(r.PARENTID, []).append({
            "name": r.NAMEAR, "stage": stage, "operation": operation,
            "url": clean_url(r.URLAR), "published": r.ISPUBLISHED == "1",
            "eligibility": action_questions(stage, operation),
        })
    for actions in actions_by_parent.values():
        actions.sort(key=lambda a: sort_key(a["stage"], a["operation"]))
    return actions_by_parent


def build_assignments(df):
    """يصنّف الخدمات الرئيسية النشطة ويعيد (الخدمات المصنفة، غير المصنفة، الداخلية)."""
    top_level = df[(df.PARENTID == "") & (df.ISACTIVE == "1")]
    actions_by_parent = _sub_services(df)
    classified, unclassified, excluded = [], [], []
    for r in top_level.itertuples():
        paths = classify(r.NAMEAR, r.CATEGUERYNAME)
        service = {
            "id": r.ID, "code": r.CODE, "name": r.NAMEAR, "desc": r.SHORTDESCRIPTIONAR,
            "category": r.CATEGUERYNAME, "sector": r.SECTORNAME, "system": r.SERVICESYSTEMNAME,
            "url": clean_url(r.URLAR), "published": r.ISPUBLISHED == "1",
            "actions": actions_by_parent.get(r.ID, []), "paths": paths,
            "fee": parse_fee(r.NAMEAR, r.SERVICECOST),
            "eligibility": service_questions(r.NAMEAR, r.CATEGUERYNAME),
        }
        if EXCLUDE in paths:
            excluded.append(service)
        elif paths:
            for path in paths:
                resolve_labels(path)  # يكتشف أي مسار غير معرّف في القواعد مبكرًا
            classified.append(service)
        else:
            unclassified.append(service)
    return classified, unclassified, excluded


def _taxonomy_rows(classified):
    counts = Counter(path for s in classified for path in s["paths"])
    rows = []
    for type_key, type_node in TAXONOMY.items():
        for persona_key, persona_node in type_node["personas"].items():
            for group_key, group_label in persona_node["groups"].items():
                path = f"{type_key}/{persona_key}/{group_key}"
                rows.append({
                    "نوع المستفيد": type_node["label"], "فئة المستفيد": persona_node["label"],
                    "مجموعة الاحتياج": group_label, "عدد الخدمات": counts.get(path, 0), "المسار": path,
                })
    return pd.DataFrame(rows)


def _assignment_rows(classified):
    rows = []
    for s in classified:
        for path in s["paths"]:
            type_label, persona_label, group_label = resolve_labels(path)
            rows.append({
                "نوع المستفيد": type_label, "فئة المستفيد": persona_label, "مجموعة الاحتياج": group_label,
                "اسم الخدمة": s["name"], "عدد الإجراءات الفرعية": len(s["actions"]),
                "التصنيف الحالي": s["category"], "النظام": s["system"],
                "منشورة": "نعم" if s["published"] else "لا", "رمز الخدمة": s["code"], "ID": s["id"],
            })
    return pd.DataFrame(rows)


def _license_stages_text(actions):
    stages = dict.fromkeys(a["stage"] for a in actions)
    return " | ".join(LICENSE_STAGES[s] for s in LICENSE_STAGES if s in stages)


def _questions_text(question_ids):
    return "\n".join(f"- {question_label(q)}" for q in question_ids)


def _action_rows(services):
    """صف لكل إجراء: الخدمة > نوع الترخيص > العملية، بنفس ترتيب العرض في النموذج."""
    return pd.DataFrame([{
        "اسم الخدمة": s["name"], "نوع الترخيص": LICENSE_STAGES[a["stage"]], "الإجراء": a["operation"],
        "اسم الإجراء الأصلي": a["name"], "أسئلة أهلية إضافية للإجراء": _questions_text(a["eligibility"]),
        "منشور": "نعم" if a["published"] else "لا", "الرابط": a["url"], "ID الخدمة": s["id"],
    } for s in services for a in s["actions"]])


def _service_rows(services):
    return pd.DataFrame([{
        "اسم الخدمة": s["name"], "التصنيف الحالي": s["category"], "النظام": s["system"],
        "أنواع التراخيص": _license_stages_text(s["actions"]),
        "عدد الإجراءات": len(s["actions"]),
        "عدد الرحلات": len(s["paths"]),
        "الرحلات": " | ".join(" > ".join(resolve_labels(p)) for p in s["paths"] if p != EXCLUDE),
        "الرسوم": fee_summary(s["fee"]),
        "أسئلة الأهلية (نموذجية - تحتاج اعتماد)": _questions_text(s["eligibility"]),
        "منشورة": "نعم" if s["published"] else "لا", "الوصف المختصر": s["desc"], "ID": s["id"],
    } for s in services])


def _format_sheet(sheet):
    """يضبط الاتجاه من اليمين لليسار وعرض الأعمدة وتنسيق العناوين."""
    sheet.sheet_view.rightToLeft = True
    sheet.freeze_panes = "A2"
    header_fill = PatternFill("solid", fgColor="1B5E3B")
    for cell in sheet[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for index, column in enumerate(sheet.columns, start=1):
        longest = max((len(str(c.value or "")) for c in column), default=10)
        sheet.column_dimensions[get_column_letter(index)].width = min(max(12, longest + 2), 60)
    sheet.auto_filter.ref = sheet.dimensions


def write_excel(classified, unclassified, excluded):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sheets = {
        "هيكل الرحلات": _taxonomy_rows(classified),
        "توزيع الخدمات على الرحلات": _assignment_rows(classified),
        "الخدمات ورحلاتها": _service_rows(classified),
        "إجراءات الخدمات": _action_rows(classified),
        "غير مصنفة - للمراجعة": _service_rows(unclassified),
        "خدمات داخلية مستبعدة": _service_rows(excluded),
    }
    with pd.ExcelWriter(EXCEL_PATH, engine="openpyxl") as writer:
        for sheet_name, frame in sheets.items():
            frame.to_excel(writer, sheet_name=sheet_name, index=False)
            _format_sheet(writer.sheets[sheet_name])


def write_prototype_data(classified):
    """يكتب البيانات كملف JS حتى يعمل النموذج بفتح الملف مباشرة دون خادم."""
    services = [{k: v for k, v in s.items() if k != "code"} for s in classified]
    payload = {
        "taxonomy": TAXONOMY, "licenseStages": LICENSE_STAGES, "questions": QUESTIONS, "services": services,
    }
    DATA_JS_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_JS_PATH.write_text(
        "window.NAAMA_DATA = " + json.dumps(payload, ensure_ascii=False) + ";\n", encoding="utf-8"
    )


def main():
    source_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    validate_questions()
    df = load_services(source_path)
    classified, unclassified, excluded = build_assignments(df)
    write_prototype_data(classified)
    try:
        write_excel(classified, unclassified, excluded)
    except PermissionError:
        sys.exit(f"تعذّر حفظ ملف Excel لأنه مفتوح في برنامج آخر. أغلقه ثم أعد التشغيل: {EXCEL_PATH}")

    total = len(classified) + len(unclassified) + len(excluded)
    print(f"الخدمات الرئيسية النشطة: {total}")
    print(f"مصنفة: {len(classified)} | غير مصنفة: {len(unclassified)} | داخلية: {len(excluded)}")
    print(f"ملف Excel: {EXCEL_PATH}")
    print(f"بيانات النموذج: {DATA_JS_PATH}")


if __name__ == "__main__":
    main()
