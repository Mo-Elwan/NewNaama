// اختبارات توجيه المساعد الذهبي (مسار وليس بحثًا).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { replyTo } = require("./assistant.js");
const { LIFE_EVENTS } = require("./life-events.js");

let cached;
function loadData() {
  if (!cached) {
    global.window = global.window || {};
    require(path.join(__dirname, "data.js"));
    cached = global.window.NAAMA_DATA;
  }
  return cached;
}

function ctx() {
  return {
    services: loadData().services,
    events: LIFE_EVENTS,
    hrefOf: (service) => `service.html?id=${service.id}`,
    session: {},
  };
}

test("greeting explains the assistant is a guide not a search list", () => {
  const reply = replyTo("مرحبا", ctx());
  assert.match(reply.text, /مسار/);
  assert.equal(reply.kind, "greet");
  assert.equal(reply.steps.length, 0);
});

test("labor request returns a two-step path not similar labor listings", () => {
  const reply = replyTo("عايز عمالة زراعية", ctx());
  assert.equal(reply.kind, "guide");
  assert.ok(reply.steps.length >= 2);
  assert.match(reply.steps[0].title, /سجّل|سجل/);
  assert.match(reply.steps[1].title, /عمال/);
  assert.equal(reply.primary && reply.primary.title, "طلب عمالة زراعية");
  assert.equal(reply.steps.filter((s) => /عمالة زراعية مؤقتة|قطاع النخيل/.test(s.title)).length, 0);
});

test("well request asks for the purpose instead of listing licenses", () => {
  const reply = replyTo("بير", ctx());
  assert.equal(reply.kind, "ask");
  assert.ok(reply.questions.some((q) => q.includes("حفر")));
  assert.equal(reply.steps.length, 0);
});

test("farm start opens a life-event path", () => {
  const reply = replyTo("أبي أسجل مزرعة", ctx());
  assert.equal(reply.kind, "guide");
  assert.match(reply.primary.href, /events.html#\/individual\/new-farmer/);
  assert.ok(reply.steps.length >= 1);
});

test("choosing drill after a well question goes to the new-well license", () => {
  const session = {};
  const shared = { ...ctx(), session };
  replyTo("رخصة بئر", shared);
  const reply = replyTo("حفر بئر جديدة", shared);
  assert.equal(reply.kind, "guide");
  assert.match(reply.primary.title, /حفر بئر/);
});

test("unknown text offers goals instead of an empty catalog dump", () => {
  const reply = replyTo("asdfqwer", ctx());
  assert.equal(reply.kind, "ask");
  assert.ok(reply.questions.length >= 3);
});
