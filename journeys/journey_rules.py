"""
قواعد توزيع خدمات نما على رحلات المستفيد.

كل قاعدة تتكون من:
- name: نمط (regex) يُطابق اسم الخدمة.
- cat:  نمط يُطابق التصنيف الحالي للخدمة (CATEGUERYNAME).
- not_name: نمط يستثني الخدمة إذا طابق اسمها.
- paths: المسارات التي تُضاف إليها الخدمة عند المطابقة.

تُطبَّق جميع القواعد المطابقة وتتراكم مساراتها، لأن الخدمة الواحدة قد
تخدم أكثر من فئة (مثل إذن استيراد الصقور: مستورد + مالك صقور).
تُوحَّد الحروف (أ/إ/آ، ة/ه، ى/ي) في الأسماء والأنماط قبل المطابقة،
لذلك يمكن كتابة الأنماط بأي صيغة إملائية.

المسار الخاص EXCLUDE يعني أن الخدمة داخلية ولا تُعرض للمستفيد.
"""

import re

EXCLUDE = "EXCLUDE"

_ARABIC_DIACRITICS = re.compile(r"[\u064B-\u0652\u0640\u200e\u200f]")
_LETTER_VARIANTS = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ة": "ه", "ى": "ي"})


def normalize_arabic(text):
    """يوحّد صيغ الحروف ويزيل التشكيل والمسافات الزائدة لتسهيل المطابقة."""
    text = _ARABIC_DIACRITICS.sub("", text or "")
    return " ".join(text.translate(_LETTER_VARIANTS).split())


def _rule(paths, name=None, cat=None, not_name=None):
    if not (name or cat):
        raise ValueError(f"القاعدة يجب أن تحتوي على name أو cat، المسارات: {paths}")
    compile_ = lambda p: re.compile(normalize_arabic(p)) if p else None
    return {"name": compile_(name), "cat": compile_(cat), "not_name": compile_(not_name), "paths": paths}


TRADE_ALL = ["individual/trader/{0}", "company/trader/{0}"]


def _trade(kind):
    return [p.format(kind) for p in TRADE_ALL]


PETS = r"قطط|كلاب|حيوانات اليفه|حيوانات أليفة|الحيوانات الأليفة"

RULES = [
    # ---------- خدمات عامة لكل أنواع المستفيدين ----------
    _rule(["ALL/general/contact"], cat="البلاغات والاستفسارات"),
    _rule(["ALL/general/contact"], name=r"اتصل بنا|نسمعك|تصعيد الشكاوى|تواصل مع الهيئة"),
    _rule(["ALL/general/inquiries"], name=r"الاستعلام عن المعاملات|الاستعلام عن بلاغ|الاستعلام عن الشكوى"),
    _rule(["ALL/general/appointments"], cat="حجز المواعيد"),
    _rule(["ALL/general/objections"], name=r"الاعتراض على المخالفات"),
    _rule([EXCLUDE], name=r"بطاقة الموظف"),

    # ---------- الأرصاد ----------
    _rule(["company/met/stations"], cat="ارصادي", not_name=r"مهنة|غير ربحية|عواصف|نشر بيانات"),
    _rule(["individual/professional/met"], cat="ارصادي", name=r"مهنة"),
    _rule(["nonprofit/science/met"], cat="ارصادي", name=r"غير ربحية"),
    _rule(["company/met/data", "government/research/data"], name=r"نشر بيانات ومعلومات الارصاد"),
    _rule(["visitor/aware/weather", "government/research/data"], name=r"عواصف الغبارية"),
    _rule(["visitor/aware/weather"], name=r"تنبيهات الأرصاد"),

    # ---------- الخيل والهجن ----------
    _rule(["individual/horse/registry"], cat="اصيل", not_name=r"استيراد|تصدير|جواز سفر"),
    _rule(["individual/horse/travel"], cat="اصيل", name=r"استيراد|تصدير|جواز سفر"),
    _rule(["individual/horse/equestrian"], cat="خدمات الفروسية"),
    _rule(["individual/horse/travel"], name=r"خيل|خيول", cat=r"الاستيراد|التصدير|الترانزيت"),
    _rule(["individual/horse/camels"], name=r"الهجن"),
    _rule(["individual/horse/equestrian", "individual/pet/falcons"], name=r"المسابقات والمنافسات"),

    # ---------- الحيوانات الأليفة والصقور ----------
    _rule(["individual/pet/travel", "visitor/pet_traveler/travel"], cat="خدمات الدخول أو الخروج",
          not_name=r"المسابقات"),
    _rule(["individual/pet/travel", "visitor/pet_traveler/travel"], name=PETS,
          cat=r"الاستيراد|التصدير|الترانزيت"),
    _rule(["individual/pet/falcons"], name=r"الصقور", not_name=r"مركز العناية"),

    # ---------- الاستيراد والتصدير والعبور والفسح ----------
    _rule(_trade("import"), cat="^خدمات الاستيراد$",
          not_name=r"تأهيل مستورد|خطط استيراد|محطات تخزين|مخزون شعير|نفايات"),
    _rule(["company/trader/barley"], name=r"تأهيل مستورد|خطط استيراد|محطات تخزين|مخزون شعير|استيراد شعير"),
    _rule(["company/trader/qualify"], cat="خدمات الاستيراد والتصدير والفسح"),
    _rule(["company/trader/qualify"], name=r"تأهيل مستورد سلع"),
    _rule(_trade("export"), cat="خدمات التصدير", not_name=r"عودة إبل"),
    _rule(_trade("transit"), cat="خدمات الترانزيت"),
    _rule(_trade("clearance"), cat="خدمات الفسح", not_name=r"عينات تجارب"),
    _rule(["company/inputs/registration"], cat="خدمات الفسح", name=r"عينات تجارب"),
    _rule(["individual/beekeeper/trade"], name=r"النحل", cat=r"الاستيراد|التصدير"),
    _rule(["individual/livestock/grazing"], name=r"عودة إبل ومواشي الرعي|الرعي الموسمي|عبور الإبل"),
    _rule(["company/trader/cards"], name=r"بطاقة منتجات|شهادة امتثال|بطاقات المنتجات"),
    _rule(["company/trader/import"], cat="رخص الاستيراد والتصدير", name=r"استيراد"),
    _rule(["company/trader/export", "individual/farmer/marketing"], cat="رخص الاستيراد والتصدير",
          name=r"تصدير الخضروات|تصدير محاصيل"),
    _rule(["company/inputs/trade"], cat="رخص الاستيراد والتصدير", name=r"المبيدات|البذور|الشتلات"),
    _rule(["government/research/research", "nonprofit/science/research"],
          name=r"لأغراض علمية|للتجارب|البحث العلمي"),

    # ---------- الثروة الحيوانية ----------
    _rule(["individual/livestock/register"], cat="طلب ترقيم الثروة الحيوانية", not_name=r"الهجن"),
    _rule(["individual/livestock/register"], name=r"جواز سفر الإبل|سجل المربي|سجل مربي|نشاط خارج حيازة لمربي"),
    _rule(["individual/livestock/vet"], cat="خدمات العيادة البيطرية",
          not_name=r"سجل المربي|سجل مربي|مهرجان"),
    _rule(["individual/horse/camels"], name=r"مهرجان ولي العهد للهجن"),
    _rule(["individual/livestock/vet"], cat="قطاع الصحة الحيوانية", name=r"تطهير|تحصين"),
    _rule(["company/animal/health"], cat="قطاع الصحة الحيوانية", name=r"الدواجن|الدجاج"),
    _rule(["individual/livestock/rural"], name=r"التربية الريفية"),
    _rule(["individual/livestock/support"], name=r"صغار مربي الماشية|التنمية الريفية"),
    _rule(["individual/livestock/marketing", "individual/general/slaughter"], name=r"حجز موعد مسلخ"),
    _rule(["company/animal/livestock"], cat="خدمات مشاريع الإنتاج الحيواني"),
    _rule(["company/animal/livestock"], name=r"إذن تأجير مشروع حيوان"),
    _rule(["company/animal/poultry"], cat="خدمات مشاريع الدواجن"),
    _rule(["company/animal/feed"], cat="خدمات مطاحن"),
    _rule(["company/animal/feed"], name=r"إتاحة منتج علف"),

    # ---------- النحل ----------
    _rule(["company/animal/bees"], name=r"^تربية النحل و ?إنتاج العسل$|البيع بالجملة للنحل"),
    _rule(["individual/beekeeper/license"], name=r"تصريح نحال|رخصة منحل|تراخيص تربية النحل|نشاط خارج حيازة تربية نحل"),
    _rule(["individual/beekeeper/organic"], cat="خدمات الزراعة العضوية", name=r"للنحالين"),
    _rule(["individual/beekeeper/support", "individual/fisher/support"], name=r"التنمية الريفية"),

    # ---------- الصيد والثروة السمكية ----------
    _rule(["individual/fisher/fishing"], cat="رخص الصيادين",
          not_name=r"واسطة بحرية|الرسو|تصريح|مستثمر"),
    _rule(["individual/fisher/boats"], cat="رخص الصيادين", name=r"واسطة بحرية|الرسو"),
    _rule(["individual/fisher/permits"], cat="رخص الصيادين", name=r"تصريح"),
    _rule(["company/fish/fishing"], cat="رخص الصيادين", name=r"مستثمر|أعالي البحار"),
    _rule(["individual/fisher/fishing"], name=r"نشاط خارج حيازة صياد"),
    _rule(["company/fish/aquaculture"], cat="الثروة السمكية"),

    # ---------- المزارع: السجل والعمالة والدعم ----------
    _rule(["individual/farmer/records"], cat="خدمات السجل الزراعي",
          not_name=r"صياد|تربية نحل|مربي الماشية|المحاصيل المقيدة|محاصيل مقيدة"),
    _rule(["individual/farmer/restricted"], name=r"المحاصيل المقيدة|محاصيل مقيدة"),
    _rule(["individual/farmer/records"], name=r"قطع زراعية|قطعة زراعية|ممارسة نشاط زراعة المحاصيل|تأجير أرض بور"),
    _rule(["individual/farmer/labor", "company/plant/labor"], cat="خدمات العمالة الزراعية"),
    _rule(["individual/farmer/labor", "company/plant/labor"], name=r"العمالة الزراعية لقطاع النخيل"),
    _rule(["individual/farmer/support", "company/plant/finance"],
          name=r"قرض|صرف دفعة|إخلاء طرف|اخلاء طرف|الحساب البنكي|الحالة المالية|سجلات الوكالات|إزاحة الوقود"),
    _rule(["individual/farmer/support"], cat="خدمات الدعم المالي", not_name=r"صغار مربي الماشية"),
    _rule(["individual/farmer/organic"], cat="خدمات الزراعة العضوية", name=r"للمزارعين"),
    _rule(["company/plant/organic"], cat="خدمات الزراعة العضوية", name=r"للمسوقين|للشركات"),
    _rule(["company/inputs/registration"], cat="خدمات الزراعة العضوية", name=r"مدخلات الإنتاج العضوي"),
    _rule(["visitor/aware/info", "individual/farmer/organic"], name=r"استعلام عن المنتجات والمدخلات العضوية"),

    # ---------- المزارع: النخيل والتمور ----------
    _rule(["individual/farmer/palm", "company/plant/palm"],
          name=r"النخيل|التمور", not_name=r"العمالة|زراعة النخيل وإنتاج التمور|أنسجة"),
    _rule(["company/plant/palm"], name=r"زراعة النخيل وإنتاج التمور"),
    _rule(["company/trader/export"], name=r"شهادة التصدير|شهادة تصدير التمور"),
    _rule(["individual/farmer/palm"], name=r"شهادة التصدير"),

    # ---------- المزارع: المياه والري والآبار ----------
    _rule(["individual/farmer/water"], cat="خدمات المياه",
          not_name=r"تصعيد الشكاوى|بطاقة الموظف"),
    _rule(["individual/farmer/water"], cat="خدمات الصيانة"),
    _rule(["individual/farmer/water"], name=r"بئر غير مرخصة"),
    _rule(["individual/farmer/water", "company/water/wells"], cat="رخص مصادر المياه الجوفية",
          name=r"رخصة حفر|رخصة ردم|رخصة تعميق|رخصة تنظيف|طباعة رخصة|تغيير غرض|نقل ملكية|كمية المياه"),
    _rule(["company/water/drilling"], cat="رخص مصادر المياه الجوفية",
          name=r"معدات|معدة|أمر عمل|الحفار|سائقي|اتفاقيات المقاولين|تقرير إنهاء"),
    _rule(["company/water/wells", "government/water/utilities"], name=r"الحقن والتغذية"),
    _rule(["individual/farmer/water", "company/water/wells"], cat="رخص استخدام مصادر المياه",
          name=r"الآبار|الابار"),

    # ---------- المزارع: الإرشاد والشهادات والتسويق ----------
    _rule(["individual/farmer/extension"], cat=r"خدمات استشارات|قطاع الصحة النباتية|مركز استدامة|خدمات المختبر",
          not_name=r"اختبار منتج"),
    _rule(["individual/farmer/palm"], name=r"سوسة النخيل"),
    _rule(["nonprofit/agri/training"], cat="مركز استدامة"),
    _rule(["company/inputs/services"], cat="مركز استدامة", name=r"اختبار منتج"),
    _rule(["company/business/lab"], cat="خدمات المختبر"),
    _rule(["individual/farmer/extension"], name=r"الزيارات الحقلية|نثر البذور"),
    _rule(["individual/farmer/certs"], cat=r"خدمات الشهادات والوثائق للمزارع|^خدمات الشهادات والوثائق$"),
    _rule(["individual/farmer/certs"], name=r"تأهيل المزارع للأسواق العالمية|شهادة سعودي جاب"),
    _rule(["individual/farmer/marketing"], name=r"المنتجات الريفية|المزارع الريفية|نافذة عرض المنتجات|^أسواق النفع العام$"),
    _rule(["nonprofit/agri/marketing"], name=r"المنتجات الريفية"),
    _rule(["nonprofit/agri/support"], name=r"التنمية الريفية"),
    _rule(["individual/farmer/farm_services"], name=r"الحاوية مع نقل المخلفات"),

    # ---------- المستثمر في الإنتاج النباتي ----------
    _rule(["company/plant/crops"], cat="مشاريع الثروة النباتية",
          not_name=r"النخيل|مزاولة المهن|المنتجات الريفية|تداول|بيع وتداول|تركيب البيوت|السماد|المبيدات|الاستشارات"),
    _rule(["company/plant/greenhouses"], cat="مشاريع البيوت المحمية"),
    _rule(["company/plant/nurseries"], cat="زراعة نباتات الزينة والشتلات"),
    _rule(["company/plant/nurseries"], name=r"البيع بالتجزئة للشتلات|نباتات الداخلية|نباتات الخارجية|للزهور"),
    _rule(["company/plant/nurseries", "company/plant/crops"], name=r"زراعة أنسجة"),
    _rule(["company/plant/processing"], cat="الخدمات التسويقية"),
    _rule(["company/plant/processing"], name=r"مصانع التحويلية"),
    _rule(["company/plant/certs"], name=r"سعودي جاب|سعودي قاب|المؤهلين الزراعين|شركات التوثيق"),
    _rule(["individual/professional/agri"], name=r"المؤهلين الزراعين|مزاولة المهن الزراعية"),

    # ---------- مدخلات الإنتاج والخدمات الزراعية ----------
    _rule(["company/inputs/registration"], cat="تسجيل مدخلات الانتاج الزراعي"),
    _rule(["company/inputs/trade"], name=r"نشاط تداول المبيدات|تداول الأسمدة|بيع وتداول البذور|السماد من المواد العضوية"),
    _rule(["individual/professional/pesticides"], name=r"مهنة تداول المبيدات"),
    _rule(["company/inputs/equipment"], name=r"الآلات|للآلات|المعدات|معدات الزراعة|أدوات ومستلزمات المناحل"),
    _rule(["company/inputs/services"],
          name=r"معالجة البذور|تركيب البيوت|مركبة تلقيح|مركبة لخدمات|الاستشارات البيطرية|الاستشارات الزراعية|وكلاء البيع"),

    # ---------- المنشآت والمهن البيطرية ----------
    _rule(["company/vet/facilities"], cat="تراخيص المنشأت البيطرية",
          not_name=r"مزاولة مهنة بيطرية|ممارس صحي بيطري"),
    _rule(["individual/professional/vet"], name=r"مزاولة مهنة بيطرية|ممارس صحي بيطري"),

    # ---------- قطاع المياه ----------
    _rule(["company/water/drilling"], cat=r"رخص مزاولة نشاط"),
    _rule(["company/water/consult"], cat="الخدمات المساندة لمصادر المياه", not_name=r"مياه شرب معبأة"),
    _rule(["company/water/bottled"], name=r"معبأة"),
    _rule(["company/water/surface"], cat="رخص مصادر المياه السطحية"),
    _rule(["individual/farmer/water"], cat="رخص مصادر المياه السطحية",
          name=r"البرك|الخزانات|خزان|الحواجز|حاجز|العقوم|الخلجان|البحيرات|بحيرة"),
    _rule(["government/water/utilities"], cat="رخص مصادر المياه السطحية", name=r"سد|محطات تنقية"),
    _rule(["government/water/utilities", "company/water/surface"], cat="رخص مصادر المياه واستخداماتها"),
    _rule(["company/water/efficiency"], cat=r"خدمات تراخيص المياه|ترخيص حضري|ترخيص صناعي"),
    _rule(["individual/professional/water"], name=r"مدقق"),
    _rule(["government/water/utilities"], name=r"شبكات النقل و ?التوزيع"),
    _rule(["company/water/efficiency"], name=r"كشف التسربات|التسعيرات|المواقع الجغرافية وفترات العمل"),

    # ---------- البيئة والغطاء النباتي ----------
    _rule(["company/environment/waste"], name=r"نفايات|إعادة التدوير"),
    _rule(["company/environment/permits", "government/projects/permits"], name=r"إصدار تصاريح بيئية"),
    _rule(["company/environment/permits"], name=r"ضمانات القروض"),
    _rule(["nonprofit/env/grants"], name=r"المنظمات غير الربحية"),
    _rule(["visitor/aware/report"], name=r"احمي بيئتي|^بلغ$"),
    _rule(["company/environment/firewood"], name=r"الحطب|الفحم|المخلفات الشجرية", not_name=r"للأفراد|بطاقة منتجات"),
    _rule(["individual/seller/firewood"], name=r"الحطب|الفحم", cat="خدمات التراخيص",
          not_name=r"للمؤسسات|جملة|تخزين|إعادة تصدير|الصناعي"),
    _rule(["company/environment/vegetation"],
          name=r"الغطاء النباتي|بنوك البذور|نباتات البرية|البذور البر|جمع البذور|غابة|أشجار|مختبرات جودة البذور",
          not_name=r"التخييم|الكرافانات|المرافق العامة والنطاق|^زراعة"),
    _rule(["government/projects/approvals"],
          name=r"مواقع مجمعات صناعية|مخطط سكني|إنشاء المرافق العامة|المرافق العامة والنطاق العمراني|استغلال أي مصدر للمياه"),
    _rule(["nonprofit/env/initiatives"], name=r"الإرشاد البيئي|غابة|نثر البذور|بنوك البذور"),
    _rule(["individual/general/green", "nonprofit/env/initiatives"], name=r"طلب الشتلات النباتية"),
    _rule(["visitor/outdoor/camping"], name=r"التخييم|الكرافانات|دخول سيارة لمتنزه|الأنشطة والفعاليات"),

    # ---------- الأسواق والتسويق والبائعون ----------
    _rule(["company/markets/markets"], cat="النفع العام", not_name=r"بطاقة منتجات|شهادة امتثال"),
    _rule(["company/markets/markets"], name=r"حركة بيع بسوق النفع العام"),
    _rule(["company/markets/logistics"], name=r"وسيلة نقل|وسائل النقل|بيان حمولة|الحمولات|المستودعات|مستودع"),
    _rule(["company/markets/ecommerce"], name=r"منصات التسويق الإلكتروني"),
    _rule(["individual/seller/ecommerce"], name=r"المتاجر الالكترونية للأفراد"),
    _rule(["individual/seller/markets"], name=r"البيع المتنقل|حجز موقع بيع مؤقت"),

    # ---------- قطاع الأعمال والجهات الحكومية ----------
    _rule(["company/business/investment"], name=r"العقود الاستثمارية|الاستثمار الزراعي في الخارج|تأجير أرض بور"),
    _rule(["company/business/business"], name=r"بوابة الموردين|تصريح تنفيذ اعمال|اعتماد البرامج التدريبية"),
    _rule(["government/projects/permits"], name=r"تصريح تنفيذ اعمال"),
    _rule(["government/general/correspondence"], name=r"اتصالات ادارية|منصة المنقولات"),
    _rule(["visitor/jobseeker/jobs"], cat="التوظيف"),
]
