const test = require("node:test");
const assert = require("node:assert/strict");
const { positiveInteger, registrationIsOpen, cancellationIsAllowed } = require("../src/utils");

test("RN-02: solo acepta identificadores enteros positivos", () => {
  assert.equal(positiveInteger(1), true);
  assert.equal(positiveInteger("25"), true);
  assert.equal(positiveInteger(0), false);
  assert.equal(positiveInteger(-1), false);
  assert.equal(positiveInteger("abc"), false);
  assert.equal(positiveInteger(1.5), false);
});

test("RN-06: inscripción cierra exactamente dos horas antes", () => {
  const start = new Date("2026-11-30T15:00:00Z");
  assert.equal(registrationIsOpen(start, new Date("2026-11-30T12:59:59Z")), true);
  assert.equal(registrationIsOpen(start, new Date("2026-11-30T13:00:00Z")), false);
});

test("RN-07: cancelación se permite hasta el límite de 24 horas", () => {
  const start = new Date("2026-11-30T15:00:00Z");
  assert.equal(cancellationIsAllowed(start, new Date("2026-11-29T14:59:59Z")), true);
  assert.equal(cancellationIsAllowed(start, new Date("2026-11-29T15:00:00Z")), true);
  assert.equal(cancellationIsAllowed(start, new Date("2026-11-29T15:00:01Z")), false);
});

test("Fechas inválidas se rechazan de forma segura", () => {
  assert.equal(registrationIsOpen("no-es-fecha"), false);
  assert.equal(cancellationIsAllowed("no-es-fecha"), false);
});
