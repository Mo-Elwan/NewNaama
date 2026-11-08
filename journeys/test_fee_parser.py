"""اختبارات تحليل الرسوم. التشغيل: python -m unittest test_fee_parser"""

import unittest

from fee_parser import fee_summary, parse_fee


class ParseFeeTests(unittest.TestCase):
    def test_empty_cost_is_unknown(self):
        self.assertEqual(parse_fee("أي خدمة", "")["kind"], "unknown")
        self.assertEqual(parse_fee("أي خدمة", None)["kind"], "unknown")

    def test_free_variants(self):
        for text in ("مجاناً", "لا يوجد ", "بدون رسوم"):
            self.assertEqual(parse_fee("خدمة", text)["kind"], "free", text)

    def test_fixed_amounts_with_or_without_currency(self):
        self.assertEqual(parse_fee("خدمة", "500")["amount"], 500)
        self.assertEqual(parse_fee("خدمة", " 500 ريال ")["amount"], 500)
        self.assertEqual(parse_fee("خدمة", "1500 رياب ")["amount"], 1500)  # خطأ إملائي موجود في المصدر
        self.assertEqual(parse_fee("خدمة", "11500.00"), {"kind": "fixed", "text": "11500.00", "amount": 11500})

    def test_study_with_and_without_opening_fee(self):
        with_fee = parse_fee("خدمة", "يتم تحديد الرسوم بعد دراسة الطلب يوجد مبلغ 500 ريال رسوم فتح طلب")
        self.assertEqual((with_fee["kind"], with_fee["amount"]), ("study", 500))
        without_fee = parse_fee("خدمة", "يتم تقدير تكاليف تنفيذ الخدمة بعد دراسة المتطلبات")
        self.assertEqual((without_fee["kind"], without_fee["amount"]), ("study", None))

    def test_configured_calculator_takes_priority_over_text(self):
        fee = parse_fee("خدمة كشف التسربات و التدقيق المائي", "تبدأ من 150 ريال")
        self.assertEqual(fee["kind"], "calculator")
        self.assertTrue(any(option["per_unit"] for option in fee["calculator"]["options"]))

    def test_summary_is_readable_for_every_kind(self):
        self.assertEqual(fee_summary(parse_fee("خدمة", "")), "غير محددة في الدليل")
        self.assertEqual(fee_summary(parse_fee("خدمة", "200")), "200 ريال")
        self.assertIn("فتح طلب 500", fee_summary(parse_fee("خدمة", "بعد دراسة الطلب 500 ريال رسوم فتح طلب")))


if __name__ == "__main__":
    unittest.main()
