"""اختبارات تنظيف روابط الخدمات. التشغيل: python -m unittest test_clean_url"""

import unittest

from build_journeys import clean_url


class CleanUrlTests(unittest.TestCase):
    def test_valid_urls_are_kept(self):
        self.assertEqual(clean_url(" https://naama.sa/x?id=1 "), "https://naama.sa/x?id=1")
        self.assertEqual(clean_url("http://hsr.mewa.gov.sa/HSR"), "http://hsr.mewa.gov.sa/HSR")

    def test_broken_scheme_is_repaired(self):
        self.assertEqual(clean_url("https:/ui.naama.sa/wells"), "https://ui.naama.sa/wells")
        self.assertEqual(clean_url("HTTPS:///ui.naama.sa"), "https://ui.naama.sa")

    def test_bare_domain_gets_https(self):
        self.assertEqual(clean_url("naama.sa"), "https://naama.sa")
        self.assertEqual(clean_url("ui.naama.sa/path"), "https://ui.naama.sa/path")

    def test_non_urls_become_empty(self):
        for value in ("", None, "   ", "javascript:alert(1)", "لا يوجد", "data:text/html,x"):
            self.assertEqual(clean_url(value), "", value)


if __name__ == "__main__":
    unittest.main()
