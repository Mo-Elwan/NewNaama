/**
 * أدوات واجهة مشتركة بين صفحات النموذج.
 * النصوص القادمة من البيانات تُضاف عبر textContent دائمًا لتجنب حقن HTML.
 */
(function (root) {
  "use strict";

  const NAAMA_PLATFORM_URL = "https://naama.sa";

  function createElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /** يقبل روابط http/https فقط لتجنب حقن روابط javascript: أو data: من البيانات. */
  function safeUrl(url) {
    return typeof url === "string" && /^https?:\/\/[^\s/]/i.test(url.trim()) ? url.trim() : null;
  }

  /** رابط الخدمة إن كان صالحًا، وإلا منصة نما. */
  function urlOrPlatform(url) {
    return safeUrl(url) || NAAMA_PLATFORM_URL;
  }

  function externalLink(className, text, url) {
    const link = createElement("a", className, text);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }

  /** توحيد الحروف العربية وإزالة التشكيل حتى يطابق البحث "الآبار" و"الابار". */
  function normalizeArabic(text) {
    return (text || "")
      .replace(/[\u064B-\u0652\u0640]/g, "")
      .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
      .toLowerCase();
  }

  const ICON_PATHS = {
    individual: "M16 8a4 4 0 1 1-8 0a4 4 0 1 1 8 0 M4 20c0-4 4-6 8-6s8 2 8 6",
    company: "M4 21V5l8-3v19 M12 21h8V9l-8-3 M7 8h2 M7 12h2 M7 16h2 M15 12h2 M15 16h2",
    government: "M3 21h18 M4 10h16 M12 3l9 5H3z M6 10v8 M10 10v8 M14 10v8 M18 10v8",
    nonprofit: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
    visitor: "M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0 M15.5 8.5l-2 5-5 2 2-5z",
    general: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
    service: "M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h4",
    category: "M12 21v-9 M12 12C12 7 8 5 4 5c0 5 3 7 8 7z M12 14c0-4 3-6 8-6 0 4-3 6-8 6z",
    journey: "M5 19a2 2 0 1 0 0-4a2 2 0 0 0 0 4z M19 9a2 2 0 1 0 0-4a2 2 0 0 0 0 4z M7 17h6a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h6",
    bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 20a2 2 0 0 0 4 0",
  };

  function icon(iconKey, className) {
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    if (className) svg.setAttribute("class", className);
    const path = document.createElementNS(svgNs, "path");
    path.setAttribute("d", ICON_PATHS[iconKey] || ICON_PATHS.category);
    svg.append(path);
    return svg;
  }

  function iconCircle(iconKey) {
    const circle = createElement("span", "icon-circle");
    circle.append(icon(iconKey));
    return circle;
  }

  root.NaamaDom = {
    NAAMA_PLATFORM_URL, createElement, safeUrl, urlOrPlatform, externalLink, normalizeArabic, icon, iconCircle,
  };
})(window);
