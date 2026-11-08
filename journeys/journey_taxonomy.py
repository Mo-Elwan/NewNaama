"""
هيكل رحلات المستفيد لخدمات نما.

المستوى 1: نوع المستفيد (فرد، منشأة، جهة حكومية، جمعية، زائر)
المستوى 2: فئة المستفيد (مزارع، صياد، مستورد ...)
المستوى 3: مجموعة الاحتياج (خدمات الآبار، العمالة ...)
المستوى 4: الخدمة نفسها (وإجراءاتها الفرعية مثل الإصدار والتجديد والإلغاء)

يُشار إلى أي مجموعة بمسار نصي بالشكل "type/persona/group".
البادئة "ALL" تعني أن المسار يُكرَّر لكل أنواع المستفيدين (الخدمات العامة).
"""

GENERAL_PERSONA_KEY = "general"
ALL_TYPES = "ALL"

_GENERAL_GROUPS = {
    "contact": "التواصل والبلاغات والشكاوى",
    "inquiries": "الاستعلام عن الطلبات والمعاملات",
    "appointments": "حجز المواعيد",
    "objections": "الاعتراض على المخالفات",
}


def _general_persona(extra_groups=None):
    """فئة "خدمات عامة" المشتركة بين جميع أنواع المستفيدين."""
    return {"label": "خدمات عامة", "groups": {**_GENERAL_GROUPS, **(extra_groups or {})}}


TAXONOMY = {
    "individual": {
        "label": "فرد",
        "personas": {
            "farmer": {
                "label": "مزارع",
                "groups": {
                    "records": "السجل الزراعي والحيازات",
                    "restricted": "المحاصيل المقيدة (القمح والأعلاف)",
                    "labor": "العمالة الزراعية",
                    "water": "الآبار والمياه والري",
                    "support": "الدعم والقروض الزراعية",
                    "organic": "الزراعة العضوية",
                    "palm": "النخيل والتمور",
                    "extension": "الإرشاد والتحاليل وصحة النبات",
                    "certs": "الشهادات والوثائق",
                    "marketing": "التسويق والمنتجات الريفية",
                    "farm_services": "خدمات المزرعة الميدانية",
                },
            },
            "livestock": {
                "label": "مربي ماشية وإبل ودواجن",
                "groups": {
                    "register": "ترقيم وتسجيل الماشية والإبل",
                    "vet": "الرعاية البيطرية والتحصين",
                    "rural": "التربية الريفية",
                    "grazing": "الرعي والتنقل",
                    "support": "الدعم والإعانات",
                    "marketing": "البيع والمسالخ",
                },
            },
            "beekeeper": {
                "label": "نحّال",
                "groups": {
                    "license": "تراخيص وتصاريح المناحل",
                    "organic": "الإنتاج العضوي للنحالين",
                    "trade": "استيراد وتصدير النحل",
                    "support": "الدعم والإعانات",
                },
            },
            "fisher": {
                "label": "صياد",
                "groups": {
                    "fishing": "رخص الصيد والبحارة",
                    "boats": "رخص الوسائط البحرية",
                    "permits": "تصاريح الصيد الموسمي والقراقير",
                    "support": "الدعم والإعانات",
                },
            },
            "horse": {
                "label": "مالك خيل وهجن",
                "groups": {
                    "registry": "تسجيل الخيل العربية الأصيلة",
                    "equestrian": "الفروسية والمشاركات",
                    "travel": "استيراد وتصدير وتنقل الخيل",
                    "camels": "الهجن",
                },
            },
            "pet": {
                "label": "مالك حيوانات أليفة وصقور",
                "groups": {
                    "travel": "سفر الحيوانات الأليفة",
                    "falcons": "الصقور",
                },
            },
            "professional": {
                "label": "ممارس مهني",
                "groups": {
                    "vet": "المهن البيطرية",
                    "agri": "المهن الزراعية",
                    "pesticides": "مهنة تداول المبيدات",
                    "met": "مهن الأرصاد",
                    "water": "تدقيق وترشيد المياه",
                },
            },
            "trader": {
                "label": "مستورد أو مصدر",
                "groups": {
                    "import": "الاستيراد",
                    "export": "التصدير",
                    "transit": "العبور (الترانزيت)",
                    "clearance": "الفسح",
                },
            },
            "seller": {
                "label": "بائع أو صاحب نشاط تجاري",
                "groups": {
                    "firewood": "بيع ونقل الحطب والفحم",
                    "ecommerce": "المتاجر الإلكترونية",
                    "markets": "مواقع البيع والأسواق",
                },
            },
            GENERAL_PERSONA_KEY: _general_persona({
                "green": "التشجير والشتلات",
                "slaughter": "الأضاحي والمسالخ",
            }),
        },
    },
    "company": {
        "label": "شركة أو منشأة",
        "personas": {
            "plant": {
                "label": "مستثمر في الإنتاج النباتي",
                "groups": {
                    "crops": "مشاريع زراعة المحاصيل والأشجار",
                    "greenhouses": "البيوت المحمية والزراعة المائية",
                    "nurseries": "المشاتل وبيع النباتات والزهور",
                    "processing": "التصنيع والخدمات التسويقية",
                    "palm": "النخيل والتمور",
                    "organic": "الزراعة العضوية",
                    "certs": "شهادات الجودة (سعودي جاب)",
                    "labor": "العمالة الزراعية",
                    "finance": "التمويل والقروض",
                },
            },
            "animal": {
                "label": "مستثمر في الإنتاج الحيواني والدواجن",
                "groups": {
                    "livestock": "مشاريع الإنتاج الحيواني",
                    "poultry": "مشاريع الدواجن",
                    "health": "الصحة الحيوانية للمشاريع",
                    "bees": "مشاريع النحل والعسل",
                    "feed": "المطاحن والأعلاف",
                },
            },
            "fish": {
                "label": "مستثمر في الثروة السمكية",
                "groups": {
                    "aquaculture": "الاستزراع المائي",
                    "fishing": "رخص الصيد الاستثمارية",
                },
            },
            "trader": {
                "label": "مستورد ومصدر",
                "groups": {
                    "qualify": "التأهيل وتحديث بيانات المنشأة",
                    "import": "الاستيراد",
                    "export": "التصدير",
                    "transit": "العبور (الترانزيت)",
                    "clearance": "الفسح",
                    "barley": "الشعير والمخزون",
                    "cards": "بطاقات المنتجات وشهادات الامتثال",
                },
            },
            "inputs": {
                "label": "مدخلات الإنتاج والخدمات الزراعية",
                "groups": {
                    "registration": "تسجيل البذور والمبيدات والأسمدة",
                    "trade": "تداول وبيع المدخلات الزراعية",
                    "equipment": "بيع وتأجير المعدات والآلات",
                    "services": "الخدمات الزراعية المساندة",
                },
            },
            "vet": {
                "label": "منشأة بيطرية",
                "groups": {
                    "facilities": "تراخيص المنشآت البيطرية",
                },
            },
            "water": {
                "label": "قطاع المياه",
                "groups": {
                    "drilling": "حفر الآبار ومعداتها",
                    "wells": "رخص الآبار والمياه الجوفية",
                    "surface": "المياه السطحية والسدود والتحلية",
                    "bottled": "المياه المعبأة",
                    "consult": "المكاتب الاستشارية والمختبرات والمسح",
                    "efficiency": "كفاءة وترشيد المياه",
                },
            },
            "environment": {
                "label": "البيئة والغطاء النباتي",
                "groups": {
                    "waste": "إدارة النفايات",
                    "permits": "التصاريح والتمويل البيئي",
                    "vegetation": "الأنشطة في أراضي الغطاء النباتي",
                    "firewood": "تجارة الحطب والفحم",
                },
            },
            "markets": {
                "label": "الأسواق والتسويق",
                "groups": {
                    "markets": "أسواق النفع العام",
                    "logistics": "النقل والمستودعات والحمولات",
                    "ecommerce": "منصات التسويق الإلكتروني",
                },
            },
            "met": {
                "label": "خدمات الأرصاد",
                "groups": {
                    "stations": "المحطات وأعمال الأرصاد",
                    "data": "بيانات ومعلومات الأرصاد",
                },
            },
            "business": {
                "label": "خدمات قطاع الأعمال",
                "groups": {
                    "business": "الموردين والتصاريح والتدريب",
                    "investment": "الاستثمار والأراضي",
                    "lab": "التحاليل المخبرية",
                },
            },
            GENERAL_PERSONA_KEY: _general_persona(),
        },
    },
    "government": {
        "label": "جهة حكومية",
        "personas": {
            "projects": {
                "label": "مشاريع البنية التحتية والتخطيط",
                "groups": {
                    "approvals": "الموافقات في أراضي الغطاء النباتي",
                    "permits": "التصاريح البيئية وتصاريح الأعمال",
                },
            },
            "water": {
                "label": "مرافق المياه",
                "groups": {
                    "utilities": "محطات التحلية والسدود وشبكات المياه",
                },
            },
            "research": {
                "label": "البحث العلمي والبيانات",
                "groups": {
                    "research": "البحث العلمي والأغراض البحثية",
                    "data": "بيانات الأرصاد والبيئة",
                },
            },
            GENERAL_PERSONA_KEY: _general_persona({
                "correspondence": "المراسلات والتنسيق بين الجهات",
            }),
        },
    },
    "nonprofit": {
        "label": "جمعية أو منظمة غير ربحية",
        "personas": {
            "env": {
                "label": "جمعية بيئية",
                "groups": {
                    "grants": "المنح والدعم",
                    "initiatives": "التشجير والإرشاد البيئي",
                },
            },
            "agri": {
                "label": "جمعية تعاونية زراعية",
                "groups": {
                    "support": "برامج الدعم الزراعي",
                    "training": "التدريب والاستشارات",
                    "marketing": "تسويق المنتجات",
                },
            },
            "science": {
                "label": "جمعية علمية أو بحثية",
                "groups": {
                    "research": "البحث العلمي",
                    "met": "خدمات الأرصاد غير الربحية",
                },
            },
            GENERAL_PERSONA_KEY: _general_persona(),
        },
    },
    "visitor": {
        "label": "زائر",
        "personas": {
            "outdoor": {
                "label": "متنزّه ومخيّم",
                "groups": {
                    "camping": "التخييم والمتنزهات",
                },
            },
            "pet_traveler": {
                "label": "مسافر مع حيوان أليف",
                "groups": {
                    "travel": "دخول وخروج الحيوانات الأليفة",
                },
            },
            "aware": {
                "label": "مهتم بالبيئة والطقس",
                "groups": {
                    "weather": "الطقس والتنبيهات",
                    "report": "الإبلاغ عن المخالفات البيئية",
                    "info": "معلومات عن المنتجات العضوية",
                },
            },
            "jobseeker": {
                "label": "باحث عن عمل",
                "groups": {
                    "jobs": "التوظيف",
                },
            },
            GENERAL_PERSONA_KEY: _general_persona(),
        },
    },
}


def expand_path(path):
    """يحوّل المسار ذي البادئة ALL إلى مسار لكل نوع مستفيد."""
    type_key, rest = path.split("/", 1)
    if type_key != ALL_TYPES:
        return [path]
    return [f"{t}/{rest}" for t in TAXONOMY]


def resolve_labels(path):
    """
    يعيد أسماء المستويات الثلاثة للمسار.

    يرفع ValueError إذا لم يكن المسار معرّفًا في الهيكل، حتى لا تمر
    قاعدة مكتوبة بشكل خاطئ دون أن تُكتشف.
    """
    try:
        type_key, persona_key, group_key = path.split("/")
        type_node = TAXONOMY[type_key]
        persona_node = type_node["personas"][persona_key]
        group_label = persona_node["groups"][group_key]
    except (ValueError, KeyError) as error:
        raise ValueError(f"مسار غير معرّف في الهيكل: '{path}'") from error
    return type_node["label"], persona_node["label"], group_label
