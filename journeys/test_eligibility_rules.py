"""اختبارات قواعد الأهلية. التشغيل: python -m unittest test_eligibility_rules"""

import unittest

from action_parser import GENERAL_STAGE, NEW_ISSUE
from eligibility_rules import (
    FALLBACK_QUESTIONS, QUESTIONS, action_questions, question_label, service_questions, validate_questions,
)


class ServiceQuestionsTests(unittest.TestCase):
    def test_rules_and_questions_are_consistent(self):
        validate_questions()  # يرفع ValueError عند وجود سؤال غير معرّف أو غير مستخدم

    def test_no_generic_login_question(self):
        self.assertNotIn("nafath_account", QUESTIONS)

    def test_questions_differ_by_service_nature(self):
        well = service_questions("رخصة حفر بئر جديدة", "رخص مصادر المياه الجوفية (حفر الآبار)")
        pets = service_questions("إذن استيراد قطط", "خدمات الاستيراد")
        fishing = service_questions("رخصة صيد حرفي", "رخص الصيادين")
        self.assertIn("well_restricted_zone", well)
        self.assertIn("animal_microchip", pets)
        self.assertIn("saudi_national", fishing)
        self.assertEqual(len({tuple(well), tuple(pets), tuple(fishing)}), 3)

    def test_services_get_several_conditions(self):
        self.assertGreaterEqual(len(service_questions("زراعة الزيتون", "مشاريع الثروة النباتية")), 4)
        self.assertGreaterEqual(len(service_questions("طلب عمالة زراعية", "خدمات العمالة الزراعية")), 3)

    def test_exclusions_prevent_wrong_conditions(self):
        organic_grant = service_questions("طلب دعم المزارع العضوية للمزارعين", "خدمات الزراعة العضوية")
        self.assertNotIn("defaulted_loans", organic_grant)
        self.assertIn("local_bank_account", organic_grant)
        self.assertNotIn("product_registered", service_questions("طلب فسح شتلات زراعية للتجارب", "خدمات الفسح"))

    def test_unmatched_service_falls_back_to_documents_question(self):
        self.assertEqual(service_questions("خدمة غير معروفة", ""), FALLBACK_QUESTIONS)

    def test_questions_are_unique(self):
        questions = service_questions("إذن استيراد حيوانات شرسة (كلاب)", "خدمات الاستيراد")
        self.assertEqual(len(questions), len(set(questions)))


class ActionQuestionsTests(unittest.TestCase):
    def test_license_stage_prerequisites(self):
        self.assertEqual(action_questions("construction", NEW_ISSUE), ["has_initial_license"])
        self.assertIn("has_construction_license", action_questions("operational", NEW_ISSUE))
        self.assertEqual(action_questions("initial", NEW_ISSUE), [])

    def test_operations_apply_to_any_stage(self):
        self.assertEqual(action_questions("operational", "تجديد"), action_questions(GENERAL_STAGE, "تجديد"))
        self.assertIn("renewal_window", action_questions("operational", "تجديد"))
        self.assertIn("new_owner_consent", action_questions("operational", "نقل ملكية"))

    def test_negative_conditions_expect_no(self):
        for question_id in ("unpaid_violations", "water_dues", "well_restricted_zone", "duplicate_report"):
            self.assertIs(QUESTIONS[question_id]["expect"], False, question_id)

    def test_label_shows_arabic_type_names(self):
        self.assertIn("[شركة", question_label("commercial_register"))
        self.assertNotIn("[", question_label("land_document"))


if __name__ == "__main__":
    unittest.main()
