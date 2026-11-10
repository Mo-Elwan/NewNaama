// اختبارات رحلات أحداث الحياة والأعمال. التشغيل: node --test prototype/life-events.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { LIFE_EVENTS, resolveLifeEvent, eventsForType, progress, feeTotals, stepsLabel } = require("./life-events.js");

// data.js يُسند إلى window ولا يعيد قيمة، وrequire يخزنه مؤقتًا، لذا نحمّله مرة واحدة.
let cachedData;
function loadData() {
  if (!cachedData) {
    global.window = {};
    require(path.join(__dirname, "data.js"));
    cachedData = global.window.NAAMA_DATA;
  }
  return cachedData;
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
  assert.equal(stepsLabel(0), "0 خطوة");
});

test("feeTotals sums fixed fees and counts free and unknown ones separately", () => {
  const steps = [{ fee: { kind: "fixed", amount: 100 } }, { fee: { kind: "fixed", amount: 50 } },
    { fee: { kind: "free" } }, { fee: { kind: "study" } }, {}].map((service) => ({ service }));
  assert.deepEqual(feeTotals(steps), { fixedTotal: 150, freeCount: 1, unknownCount: 2 });
});

test("eventsForType returns only that beneficiary type's events", () => {
  assert.ok(eventsForType("company").length > 0);
  assert.ok(eventsForType("company").every((e) => e.type === "company"));
  assert.deepEqual(eventsForType("unknown"), []);
});

test("every configured life event is valid against the real services data", () => {
  const data = loadData();
  const ids = new Set();
  for (const event of LIFE_EVENTS) {
    assert.ok(!ids.has(event.id), `معرّف مكرر: ${event.id}`);
    ids.add(event.id);
    assert.ok(data.taxonomy[event.type], `نوع مستفيد غير معروف في "${event.title}": ${event.type}`);
    assert.ok(event.steps.some((s) => !s.optional), `"${event.title}" يحتاج خطوة إلزامية واحدة على الأقل`);
    const { steps, errors } = resolveLifeEvent(event, data.services);
    assert.deepEqual(errors, [], event.title);
    for (const { service } of steps) {
      assert.ok(service.paths.some((p) => p.startsWith(`${event.type}/`)),
        `الخدمة "${service.name}" غير متاحة لنوع المستفيد ${event.type} في "${event.title}"`);
    }
  }
});

test("every beneficiary type has at least one life event", () => {
  const data = loadData();
  for (const typeKey of Object.keys(data.taxonomy)) assert.ok(eventsForType(typeKey).length, typeKey);
});
