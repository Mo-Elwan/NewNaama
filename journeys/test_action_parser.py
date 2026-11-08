"""اختبارات تحليل الإجراءات. التشغيل: python -m unittest test_action_parser"""

import unittest

from action_parser import GENERAL_STAGE, NEW_ISSUE, parse_action, sort_key

SERVICE = "زراعة الزيتون"


class ParseActionTests(unittest.TestCase):
    def test_license_name_alone_means_new_issue(self):
        self.assertEqual(parse_action(f"ترخيص تشغيلي {SERVICE}", SERVICE), ("operational", NEW_ISSUE))
        self.assertEqual(parse_action(f"ترخيص إنشائي {SERVICE}", SERVICE), ("construction", NEW_ISSUE))
        self.assertEqual(parse_action(f"تصريح مبدئي {SERVICE}", SERVICE), ("initial", NEW_ISSUE))

    def test_operations_are_detected_per_stage(self):
        self.assertEqual(parse_action(f"تجديد ترخيص إنشائي {SERVICE}", SERVICE), ("construction", "تجديد"))
        self.assertEqual(parse_action(f"نقل ملكية ترخيص تشغيلي {SERVICE}", SERVICE), ("operational", "نقل ملكية"))
        self.assertEqual(parse_action(f"توسعة مشروع ترخيص تشغيلي {SERVICE}", SERVICE), ("operational", "توسعة مشروع"))
        self.assertEqual(parse_action(f"خدمة تغيير نشاط ترخيص تشغيلي {SERVICE}", SERVICE), ("operational", "تغيير نشاط"))

    def test_actions_without_stage_are_general(self):
        self.assertEqual(parse_action(f"إلغاء ترخيص {SERVICE}", SERVICE), (GENERAL_STAGE, "إلغاء"))
        self.assertEqual(parse_action(f"تحويل رخصة ورقية إلى الكترونية {SERVICE}", SERVICE)[0], GENERAL_STAGE)

    def test_stage_word_inside_service_name_is_ignored(self):
        service = "تشغيل مفارخ الدجاج"
        self.assertEqual(parse_action(f"إلغاء ترخيص {service}", service), (GENERAL_STAGE, "إلغاء"))
        self.assertEqual(parse_action(f"ترخيص إنشائي {service}", service), ("construction", NEW_ISSUE))

    def test_unknown_operation_falls_back_to_short_name(self):
        self.assertEqual(parse_action(f"طلب - (مزاولة مهنة) {SERVICE}", SERVICE), (GENERAL_STAGE, "طلب - (مزاولة مهنة)"))

    def test_sort_puts_stages_in_license_order_and_new_issue_first(self):
        keys = [sort_key("operational", "تجديد"), sort_key("initial", NEW_ISSUE),
                sort_key(GENERAL_STAGE, "إلغاء"), sort_key("operational", NEW_ISSUE)]
        self.assertEqual(sorted(keys), [keys[1], keys[3], keys[0], keys[2]])


if __name__ == "__main__":
    unittest.main()
