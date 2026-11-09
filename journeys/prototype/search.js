/**
 * بحث ذكي في خدمات نما: مرادفات وكلمات دارجة، تصحيح خطأ إملائي بمسافة 1،
 * وترتيب حسب ظهور الكلمات في اسم الخدمة. يُستخدم في الدليل ورحلة المستفيد.
 */
(function (root) {
  "use strict";

  const HITS_KEY = "naama.search.hits";
  const MISSED_KEY = "naama.search.missed";
  const RECORD_DELAY_MS = 800;
  const MAX_MISSED = 50;
  const POPULAR_LIMIT = 8;

  const STOPWORDS = new Set(
    ["في", "من", "على", "الى", "إلي", "عن", "هذا", "هذه", "هل", "او", "أو", "مع", "كل"]
      .map((word) => stripAl(normalizeArabic(word)))
  );

  /**
   * مجموعات مترادفة بعد توحيد الحروف. الكلمة الدارجة في المجموعة
   * تُعامل كأي كلمة رسمية فيها، مثل «بير» و«بئر» و«آبار».
   */
  const SYNONYM_GROUPS = [
    ["بئر", "بير", "آبار", "ابار"],
    ["ماشية", "مواشي", "غنم", "أغنام", "اغنام", "خراف", "بقر", "أبقار", "ابقار", "إبل", "ابل"],
    ["دواجن", "دجاج", "فرخ", "فراخ", "فروج"],
    ["منحل", "نحل", "نحال", "عسل"],
    ["صيد", "صياد", "سمك", "أسماك", "اسماك", "قارب", "لنش", "مركب"],
    ["عمالة", "عمال", "عمالة زراعية"],
    ["عضوي", "اورجانيك", "أورجانيك"],
    ["بيطري", "بيطرة", "تحصين", "تطعيم"],
    ["خيل", "حصان", "أفراس", "افراس", "مربط"],
    ["نخيل", "تمر", "تمور"],
    ["حطب", "فحم", "احتطاب"],
    ["استيراد", "شحنة", "فسح"],
    ["سجل", "كرت", "كارت"],
    ["ترقيم", "شريحة"],
    ["واسطة", "واسطه"],
  ];

  const POPULAR_QUERIES = [
    "رخصة بئر",
    "سجل مربي",
    "ترقيم الماشية",
    "رخصة صيد",
    "عمالة زراعية",
    "إذن استيراد",
    "تجديد رخصة",
    "زراعة عضوية",
  ];

  /** نفس توحيد الحروف في dom.js حتى تتطابق فهارس البحث مع العرض. */
  function normalizeArabic(text) {
    return (text || "")
      .replace(/[\u064B-\u0652\u0640]/g, "")
      .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
      .toLowerCase();
  }

  function stripAl(word) {
    return word.replace(/^ال/, "") || word;
  }

  function tokenize(text) {
    return normalizeArabic(text)
      .replace(/[^\u0600-\u06FFa-z0-9\s]/g, " ")
      .split(/\s+/)
      .map(stripAl)
      .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
  }

  const synonymMap = (() => {
    const map = new Map();
    for (const group of SYNONYM_GROUPS) {
      const terms = [...new Set(group.map((word) => stripAl(normalizeArabic(word))).filter(Boolean))];
      for (const term of terms) {
        const set = map.get(term) || new Set();
        terms.forEach((item) => set.add(item));
        map.set(term, set);
      }
    }
    return map;
  })();

  /** مسافة 1: استبدال حرف، أو زيادة/حذف حرف واحد. */
  function isDistanceOne(a, b) {
    if (a === b) return false;
    const lengthDiff = a.length - b.length;
    if (lengthDiff < -1 || lengthDiff > 1) return false;
    if (lengthDiff === 0) {
      let diffs = 0;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i] && ++diffs > 1) return false;
      }
      return diffs === 1;
    }
    const shorter = lengthDiff < 0 ? a : b;
    const longer = lengthDiff < 0 ? b : a;
    let skips = 0;
    for (let i = 0, j = 0; i < shorter.length && j < longer.length;) {
      if (shorter[i] === longer[j]) { i += 1; j += 1; }
      else if (++skips > 1) return false;
      else j += 1;
    }
    return true;
  }

  function isKnownToken(term, vocabulary) {
    return vocabulary.some((word) => word === term || (term.length >= 3 && word.startsWith(term)));
  }

  function expandTerm(term, vocabulary) {
    const expansions = new Set([term]);
    const synonyms = synonymMap.get(term);
    if (synonyms) synonyms.forEach((item) => expansions.add(item));
    if (vocabulary && vocabulary.length && term.length >= 4 && !isKnownToken(term, vocabulary)) {
      for (const word of vocabulary) {
        if (isDistanceOne(term, word)) expansions.add(word);
      }
    }
    return expansions;
  }

  function tokenMatches(docTokens, expansions) {
    for (const token of docTokens) {
      for (const expansion of expansions) {
        if (token === expansion) return true;
        if (expansion.length >= 3 && token.startsWith(expansion)) return true;
        if (token.length >= 3 && expansion.startsWith(token)) return true;
      }
    }
    return false;
  }

  function prepareQuery(query, vocabulary) {
    const terms = tokenize(query);
    return {
      terms,
      expanded: terms.map((term) => expandTerm(term, vocabulary)),
      raw: normalizeArabic(query),
    };
  }

  function matchesPrepared(text, prepared) {
    if (!prepared.terms.length) return true;
    const docTokens = tokenize(text);
    return prepared.expanded.every((expansions) => tokenMatches(docTokens, expansions));
  }

  function matchesText(text, query, vocabulary) {
    return matchesPrepared(text, prepareQuery(query, vocabulary));
  }

  function scorePrepared(entry, prepared) {
    if (!prepared.terms.length) return 0;
    let score = 0;
    for (const expansions of prepared.expanded) {
      if (tokenMatches(entry.nameTokens, expansions)) score += 4;
      else if (tokenMatches(entry.allTokens, expansions)) score += 1;
      else return 0;
    }
    if (prepared.raw && entry.nameNorm.includes(prepared.raw)) score += 5;
    return score;
  }

  function scoreMatch(name, allText, query, vocabulary) {
    return scorePrepared({
      nameTokens: tokenize(name),
      allTokens: tokenize(allText),
      nameNorm: normalizeArabic(name),
    }, prepareQuery(query, vocabulary));
  }

  function createIndex(services, extraText) {
    const extraOf = extraText || (() => "");
    const entries = services.map((service) => {
      const name = service.name || "";
      const all = [name, service.desc, service.category, extraOf(service)]
        .concat((service.actions || []).map((action) => action.name))
        .filter(Boolean)
        .join(" ");
      return {
        service, name, all,
        nameTokens: tokenize(name),
        allTokens: tokenize(all),
        nameNorm: normalizeArabic(name),
      };
    });
    const vocabulary = [...new Set(entries.flatMap((entry) => entry.allTokens.filter((token) => token.length >= 4)))];
    const byId = new Map(entries.map((entry) => [entry.service.id, entry]));
    return { entries, vocabulary, byId };
  }

  function search(index, query) {
    const prepared = prepareQuery(query, index.vocabulary);
    if (!prepared.terms.length) {
      return index.entries.map((entry) => ({ service: entry.service, score: 0 }));
    }
    const results = [];
    for (const entry of index.entries) {
      const score = scorePrepared(entry, prepared);
      if (score) results.push({ service: entry.service, score });
    }
    results.sort((a, b) => b.score - a.score || a.service.name.localeCompare(b.service.name, "ar"));
    return results;
  }

  const memoryStore = {};

  function storageGet(key) {
    try {
      if (typeof localStorage !== "undefined") return localStorage.getItem(key);
    } catch (err) {
      // وضع التصفح الخاص: نستخدم الذاكرة المؤقتة لنفس الجلسة فقط.
    }
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  }

  function storageSet(key, value) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, value);
        return;
      }
    } catch (err) {
      // امتلاء التخزين لا يمنع البحث، نكتفي بنسخة الجلسة.
    }
    memoryStore[key] = value;
  }

  function readJson(key, fallback) {
    try {
      const raw = storageGet(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    storageSet(key, JSON.stringify(value));
  }

  function recordSearch(query, resultCount) {
    const trimmed = (query || "").trim();
    if (tokenize(trimmed).length < 1) return;
    if (resultCount === 0) {
      const missed = readJson(MISSED_KEY, []);
      missed.unshift({ q: trimmed, at: Date.now() });
      writeJson(MISSED_KEY, missed.slice(0, MAX_MISSED));
      return;
    }
    const hits = readJson(HITS_KEY, {});
    hits[trimmed] = (hits[trimmed] || 0) + 1;
    writeJson(HITS_KEY, hits);
  }

  let recordTimer = 0;
  function trackQuery(query, resultCount) {
    if (typeof setTimeout !== "function") {
      recordSearch(query, resultCount);
      return;
    }
    clearTimeout(recordTimer);
    recordTimer = setTimeout(() => recordSearch(query, resultCount), RECORD_DELAY_MS);
  }

  function popularQueries(limit) {
    const max = limit || POPULAR_LIMIT;
    const local = Object.entries(readJson(HITS_KEY, {}))
      .sort((a, b) => b[1] - a[1])
      .map(([query]) => query);
    const merged = [];
    const seen = new Set();
    for (const query of [...POPULAR_QUERIES, ...local]) {
      const key = normalizeArabic(query);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(query);
      if (merged.length >= max) break;
    }
    return merged;
  }

  function missedQueries() {
    return readJson(MISSED_KEY, []);
  }

  /** شرائح «الأكثر بحثًا»؛ تُستدعى من صفحات الواجهة فقط. */
  function renderPopularChips(container, onPick) {
    if (!container || !root.NaamaDom) return;
    const { createElement } = root.NaamaDom;
    container.replaceChildren();
    container.append(createElement("span", "search-suggestions-label", "الأكثر بحثًا"));
    for (const query of popularQueries()) {
      const chip = createElement("button", "search-chip", query);
      chip.type = "button";
      chip.addEventListener("click", () => onPick(query));
      container.append(chip);
    }
    container.hidden = false;
  }

  const api = {
    tokenize, expandTerm, prepareQuery, matchesPrepared, matchesText, scorePrepared, scoreMatch, createIndex, search,
    trackQuery, recordSearch, popularQueries, missedQueries, renderPopularChips,
    POPULAR_QUERIES, SYNONYM_GROUPS,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NaamaSearch = api;
})(typeof window !== "undefined" ? window : globalThis);
