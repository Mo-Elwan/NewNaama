"""اختبارات قواعد التوزيع. التشغيل: python -m unittest test_journey_rules"""

import unittest

from build_journeys import classify
from journey_rules import EXCLUDE, RULES, normalize_arabic
from journey_taxonomy import TAXONOMY, expand_path, resolve_labels


class NormalizeArabicTests(unittest.TestCase):
    def test_unifies_letter_variants_and_spaces(self):
        self.assertEqual(normalize_arabic("  إذن   استيراد  الصقورَ "), "اذن استيراد الصقور")
        self.assertEqual(normalize_arabic("مياه معبأة"), "مياه معباه")

    def test_handles_empty_and_none(self):
        self.assertEqual(normalize_arabic(""), "")
        self.assertEqual(normalize_arabic(None), "")


class TaxonomyTests(unittest.TestCase):
    def test_all_rule_paths_exist_in_taxonomy(self):
        for rule in RULES:
            for path in rule["paths"]:
                if path == EXCLUDE:
                    continue
                for expanded in expand_path(path):
                    resolve_labels(expanded)  # يرفع ValueError إذا كان المسار غير معرّف

    def test_unknown_path_raises(self):
        with self.assertRaises(ValueError):
            resolve_labels("individual/farmer/not_a_group")

    def test_all_prefix_expands_to_every_type(self):
        self.assertEqual(len(expand_path("ALL/general/contact")), len(TAXONOMY))


class ClassifyTests(unittest.TestCase):
    def test_well_license_reaches_farmer_and_water_company(self):
        paths = classify("رخصة حفر بئر جديدة", "رخص مصادر المياه الجوفية (حفر الآبار)")
        self.assertIn("individual/farmer/water", paths)
        self.assertIn("company/water/wells", paths)

    def test_falcon_import_serves_trader_and_falcon_owner(self):
        paths = classify("إذن استيراد الصقور", "خدمات الاستيراد")
        self.assertIn("individual/pet/falcons", paths)
        self.assertIn("company/trader/import", paths)

    def test_organic_service_goes_to_matching_persona_only(self):
        paths = classify("طلب دعم المزارع العضوية للنحالين", "خدمات الزراعة العضوية")
        self.assertEqual(paths, ["individual/beekeeper/organic"])

    def test_firewood_for_companies_is_not_shown_to_individuals(self):
        paths = classify("ترخيص نقل الحطب والفحم المستوردين والمخلفات الشجرية للمؤسسات والشركات", "خدمات التراخيص")
        self.assertNotIn("individual/seller/firewood", paths)

    def test_word_fragments_do_not_cause_false_matches(self):
        # "الاتحاد" و"الوكالات" تحتوي على حروف "آلات" ويجب ألا تُعتبر معدات
        self.assertNotIn("company/inputs/equipment",
                         classify('تسجيل بيانات الهجن "ملاك الإتحاد السعودي للهجن"', "طلب ترقيم الثروة الحيوانية"))
        self.assertNotIn("company/inputs/equipment", classify("سجلات الوكالات", "خدمات المزارعين"))

    def test_prefixed_word_still_matches(self):
        paths = classify("مركز الإقليمي للعواصف الغبارية والرملية", "ارصادي")
        self.assertIn("visitor/aware/weather", paths)
        self.assertNotIn("company/met/stations", paths)

    def test_internal_service_is_excluded(self):
        self.assertEqual(classify("بطاقة الموظف", "خدمات المياه"), [EXCLUDE])

    def test_unknown_service_returns_empty(self):
        self.assertEqual(classify("خدمة غير معروفة", "تصنيف غير معروف"), [])


if __name__ == "__main__":
    unittest.main()
