// اختبارات رحلات أحداث الحياة والأعمال. التشغيل: node --test prototype/life-events.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { LIFE_EVENTS, resolveLifeEvent, progress, stepsLabel } = require("./life-events.js");

function loadServices() {
  global.window = {};
  require(path.join(__dirname, "data.js"));
  return global.window.NAAMA_DATA.services;
}

const SERVICES = [
  { name: "خدمة أ", published: true, actions: [{ stage: "initial", operation: "إصدار جديد", name: "إصدار مبدئي أ" }] },
  { name: "خدمة مكررة", published: true, actions: [] },
  { name: "خدمة مكررة", published: true, actions: [] },
  { name: "خدمة مخفية", published: false, actions: [] },
];

test("resolveLifeEvent links each step to its service and requested action", () => {
  const event = { steps: [{ service: "خدمة أ", stage: "initial", operation: "إصدار جديد" }] };
  const { steps, errors } = resolveLifeEvent(event, SERVICES);
  assert.deepEqual(errors, []);
  assert.equal(steps[0].action.name, "إصدار مبدئي أ");
});

test("resolveLifeEvent reports missing, duplicated, unpublished services and missing actions", () => {
  const event = { steps: [
    { service: "غير موجودة" }, { service: "خدمة مكررة" }, { service: "خدمة مخفية" },
    { service: "خدمة أ", stage: "operational", operation: "إصدار جديد" },
  ] };
  const { steps, errors } = resolveLifeEvent(event, SERVICES);
  assert.equal(steps.length, 0);
  assert.equal(errors.length, 4);
});

test("progress counts only required steps", () => {
  const event = { steps: [{}, { optional: true }, {}] };
  assert.deepEqual(progress(event, [1]), { requiredDone: 0, requiredTotal: 2, complete: false });
  assert.deepEqual(progress(event, [0, 2]), { requiredDone: 2, requiredTotal: 2, complete: true });
});

test("stepsLabel follows Arabic number agreement", () => {
  assert.equal(stepsLabel(1), "خطوة واحدة");
  assert.equal(stepsLabel(2), "خطوتان");
  assert.equal(stepsLabel(5), "5 خطوات");
  assert.equal(stepsLabel(12), "12 خطوة");
});

test("every configured life event resolves against the real services data", () => {
  const services = loadServices();
  const ids = new Set();
  for (const event of LIFE_EVENTS) {
    assert.ok(!ids.has(event.id), `معرّف مكرر: ${event.id}`);
    ids.add(event.id);
    assert.deepEqual(resolveLifeEvent(event, services).errors, [], event.title);
  }
});
