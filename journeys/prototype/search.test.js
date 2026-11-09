// اختبارات البحث الذكي. التشغيل: node --test prototype/search.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { tokenize, matchesText, createIndex, search, popularQueries, recordSearch, missedQueries } = require("./search.js");

let cachedData;
function loadData() {
  if (!cachedData) {
    global.window = global.window || {};
    require(path.join(__dirname, "data.js"));
    cachedData = global.window.NAAMA_DATA;
  }
  return cachedData;
}

function indexOfPublished() {
  const services = loadData().services.filter((s) => s.published);
  return { services, index: createIndex(services) };
}

function namesFor(query) {
  const { index } = indexOfPublished();
  return search(index, query).map((hit) => hit.service.name);
}

test("tokenize strips the definite article and ignores stopwords", () => {
  assert.deepEqual(tokenize("في الآبار"), ["ابار"]);
  assert.deepEqual(tokenize("من"), []);
});

test("رخصة بئر still finds well-drilling licenses", () => {
  assert.ok(namesFor("رخصة بئر").includes("رخصة حفر بئر جديدة"));
});

test("colloquial بير matches official بئر and آبار services", () => {
  const names = namesFor("بير");
  assert.ok(names.includes("رخصة حفر بئر جديدة"));
  assert.ok(names.some((name) => name.includes("آبار") || name.includes("ابار") || name.includes("بئر")));
});

test("غنم as a synonym finds livestock services", () => {
  const names = namesFor("غنم");
  assert.ok(names.includes("طلب ترقيم الماشية"));
});

test("فرخ as a synonym finds poultry services", () => {
  const names = namesFor("فرخ");
  assert.ok(names.some((name) => name.includes("دجاج") || name.includes("دواجن")));
});

test("a one-letter typo in a known word still matches", () => {
  const names = namesFor("ماشيهه");
  assert.ok(names.includes("طلب ترقيم الماشية"));
});

test("services rank higher when the query appears in the name", () => {
  const { index } = indexOfPublished();
  const hits = search(index, "سجل مربي");
  assert.equal(hits[0].service.name, "إصدار سجل مربي");
  assert.ok(hits[0].score > hits[hits.length - 1].score);
});

test("unrelated letter salad returns no hits", () => {
  assert.deepEqual(namesFor("xyzقكظ"), []);
});

test("matchesText without a query matches everything", () => {
  assert.equal(matchesText("أي نص", "  ", []), true);
});

test("popularQueries starts from the curated agricultural set", () => {
  assert.ok(popularQueries().includes("رخصة بئر"));
  assert.ok(popularQueries().includes("سجل مربي"));
});

test("recordSearch stores zero-result queries for later review", () => {
  const previous = missedQueries().length;
  recordSearch("خدمة غير موجودة زززز", 0);
  const missed = missedQueries();
  assert.ok(missed.length >= previous);
  assert.equal(missed[0].q, "خدمة غير موجودة زززز");
});
