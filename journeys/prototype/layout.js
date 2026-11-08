/**
 * الترويسة والتذييل المشتركان بين صفحات النموذج، بنفس تصميم منصة نما.
 * الصفحة تحدد العنصر النشط في القائمة عبر <body data-page="guide|journey">.
 * القوالب هنا نصوص ثابتة لا تحتوي على أي بيانات من ملف الخدمات، لذا لا خطر من innerHTML.
 */
(function () {
  "use strict";

  const NAAMA = "https://naama.sa";
  const EXTERNAL = 'target="_blank" rel="noopener noreferrer"';
  const NAV_ITEMS = [
    { label: "الرئيسية", href: NAAMA, external: true },
    { label: "دليل الخدمات الإلكترونية", href: "index.html", page: "guide" },
    { label: "رحلة المستفيد", href: "journey.html", page: "journey", isNew: true },
    { label: "الأخبار و الأحداث", href: NAAMA, external: true },
    { label: "الأسئلة الشائعة", href: NAAMA, external: true },
    { label: "تواصل معنا", href: NAAMA, external: true },
  ];
  const FEATURED = {
    "أبرز خدمات الأفراد": ["إصدار سجل مربي", "طلب ترقيم الماشية", "برنامج دعم صغار مربي الماشية", "تسجيل موقع زراعي جديد"],
    "أبرز خدمات الأعمال": ["طلب عمالة زراعية", "إذن استيراد خضار وفواكه", "تسجيل موقع زراعي جديد", "حجز موعد مسلخ"],
  };
  const USEFUL_LINKS = [
    ["ميثاق العملاء", NAAMA],
    ["المنصة الوطنية الموحدة", "https://my.gov.sa"],
    ["وزارة البيئة والمياه والزراعة", "https://www.mewa.gov.sa"],
    ["دليل منصة نما", NAAMA],
  ];
  const SEARCH_ICON = '<svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>';

  function navItem(item, activePage) {
    const isActive = item.page === activePage;
    const attrs = [
      `href="${item.href}"`,
      isActive ? 'class="active" aria-current="page"' : "",
      item.external ? EXTERNAL : "",
    ].join(" ");
    return `<a ${attrs}>${item.label}${item.isNew ? '<span class="nav-new">جديد</span>' : ""}</a>`;
  }

  function headerHtml(activePage) {
    return `
      <div class="gov-stamp">
        <div class="container gov-stamp-inner">
          <span class="flag" aria-hidden="true"></span>
          <span>موقع حكومي مسجل لدى هيئة الحكومة الرقمية</span>
        </div>
      </div>
      <div class="top-bar">
        <div class="container top-bar-inner">
          <a href="${NAAMA}" ${EXTERNAL}>English</a>
          <a href="${NAAMA}" ${EXTERNAL}>تسجيل الدخول</a>
        </div>
      </div>
      <div class="site-header">
        <div class="container header-inner">
          <a class="brand" href="index.html" aria-label="نما - دليل الخدمات">
            <img src="assets/naama-logo.svg" alt="نما" width="84" height="40">
          </a>
          <nav class="main-nav" aria-label="القائمة الرئيسية">
            ${NAV_ITEMS.map((item) => navItem(item, activePage)).join("")}
          </nav>
          <form class="header-search" action="index.html" method="get" role="search">
            ${SEARCH_ICON}
            <input type="search" name="q" placeholder="ابحث هنا ..." aria-label="ابحث في الخدمات">
          </form>
        </div>
      </div>`;
  }

  function linkList(items) {
    return `<ul>${items.map(([label, href, external]) =>
      `<li><a href="${href}" ${external ? EXTERNAL : ""}>${label}</a></li>`).join("")}</ul>`;
  }

  function footerHtml() {
    const featuredColumns = Object.entries(FEATURED).map(([title, names]) => `
      <div class="footer-col">
        <h2>${title}</h2>
        ${linkList(names.map((name) => [name, `journey.html?q=${encodeURIComponent(name)}`, false]))}
      </div>`).join("");
    return `
      <section class="page-feedback container" aria-label="تقييم الصفحة">
        <div class="feedback-box">
          <span>هل كانت الصفحة مفيدة؟</span>
          <div class="feedback-actions">
            <button type="button" class="btn btn-primary" data-feedback>نعم</button>
            <button type="button" class="btn btn-primary" data-feedback>لا</button>
          </div>
          <span class="feedback-thanks" hidden>شكرًا لمشاركتك رأيك.</span>
        </div>
      </section>
      <div class="footer-main">
        <div class="container footer-grid">
          <div class="footer-col">
            <h2>روابط تهمك</h2>
            ${linkList(USEFUL_LINKS.map(([label, href]) => [label, href, true]))}
          </div>
          ${featuredColumns}
          <div class="footer-col">
            <h2>تواصل معنا</h2>
            <p>الرقم الموحد: 939</p>
            <p>تطبيق وزارة البيئة والمياه والزراعة (798000+)</p>
          </div>
        </div>
        <div class="container footer-bottom">
          <span>جميع الحقوق محفوظة لوزارة البيئة والمياه والزراعة - نموذج أولي للمراجعة الداخلية</span>
          <img src="assets/naama-logo.svg" alt="نما" width="70" height="34">
        </div>
      </div>`;
  }

  function bindFeedback(footer) {
    const thanks = footer.querySelector(".feedback-thanks");
    footer.querySelectorAll("[data-feedback]").forEach((button) => button.addEventListener("click", () => {
      footer.querySelector(".feedback-actions").hidden = true;
      thanks.hidden = false;
    }));
  }

  const header = document.getElementById("site-header");
  const footer = document.getElementById("site-footer");
  if (header) header.innerHTML = headerHtml(document.body.dataset.page);
  if (footer) {
    footer.innerHTML = footerHtml();
    bindFeedback(footer);
  }
})();
