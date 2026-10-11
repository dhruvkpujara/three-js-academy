import test from "node:test";
import assert from "node:assert/strict";
import {
  createCircuitDocument,
  validateCircuitDocument,
  createChallengeCollection,
  validateChallengeCollection
} from "../src/core/CircuitIO.js";

const sampleStore = {
  parts: [
    { id: 1, type: "Battery", x: 20, y: 30 },
    { id: 2, type: "Switch", x: 140, y: 30, closed: false },
    { id: 3, type: "Lamp", x: 260, y: 30, current: 0 }
  ],
  wires: [
    { a: { id: 1, side: "a" }, b: { id: 2, side: "a" } },
    { a: { id: 2, side: "b" }, b: { id: 3, side: "a" } }
  ]
};

test("circuit export format validates and preserves editable data", () => {
  const exported = createCircuitDocument(sampleStore, 4);
  const imported = validateCircuitDocument(exported);
  assert.equal(imported.levelNumber, 4);
  assert.equal(imported.parts.length, 3);
  assert.equal(imported.parts[1].closed, false);
  assert.equal(imported.wires.length, 2);
  assert.deepEqual(imported.wires[0].a, { id: 1, side: "a" });
});

test("circuit import rejects duplicate component IDs", () => {
  const data = createCircuitDocument(sampleStore, 1);
  data.parts[1].id = data.parts[0].id;
  assert.throws(() => validateCircuitDocument(data), /unique positive integer ID/);
});

test("circuit import rejects unsupported component types", () => {
  const data = createCircuitDocument(sampleStore, 1);
  data.parts[0].type = "Script";
  assert.throws(() => validateCircuitDocument(data), /Unsupported component type/);
});

test("circuit import rejects wires referencing missing parts", () => {
  const data = createCircuitDocument(sampleStore, 1);
  data.wires[0].b.id = 999;
  assert.throws(() => validateCircuitDocument(data), /missing component or invalid terminal/);
});

test("circuit import rejects invalid terminal sides and duplicate wires", () => {
  const invalidSide = createCircuitDocument(sampleStore, 1);
  invalidSide.wires[0].a.side = "top";
  assert.throws(() => validateCircuitDocument(invalidSide), /missing component or invalid terminal/);

  const duplicate = createCircuitDocument(sampleStore, 1);
  duplicate.wires.push(structuredClone(duplicate.wires[0]));
  assert.throws(() => validateCircuitDocument(duplicate), /duplicate wires/);
});

test("custom challenge collection round-trips supported level rules", () => {
  const level = {
    title: "Practice parallel lamps",
    prompt: "Connect two lamps in parallel.",
    instructions: "Connect both lamps across the same two battery rails.",
    parts: { Battery: 1, Lamp: 2 },
    points: 25,
    topology: "parallel"
  };
  const collection = createChallengeCollection([level]);
  assert.deepEqual(validateChallengeCollection(collection), [level]);
});

test("custom challenges require a battery and topology-compatible components", () => {
  const noBattery = {
    format: "circuit-challenge-level-collection",
    schemaVersion: 1,
    levels: [{
      title: "No battery",
      prompt: "Try a circuit.",
      instructions: "Add a source.",
      parts: { Lamp: 2 },
      points: 10,
      topology: "parallel"
    }]
  };
  assert.throws(() => validateChallengeCollection(noBattery), /exactly one battery/);

  const noSwitch = {
    format: "circuit-challenge-level-collection",
    schemaVersion: 1,
    levels: [{
      title: "Missing switch",
      prompt: "Control two lamps.",
      instructions: "Use a switch.",
      parts: { Battery: 1, Lamp: 2 },
      points: 10,
      topology: "parallel-switched"
    }]
  };
  assert.throws(() => validateChallengeCollection(noSwitch), /one switch and at least two lamps/);
});

test("custom challenge collection rejects unsupported rules and excessive counts", () => {
  const base = {
    title: "Unsafe rule",
    prompt: "Build a circuit.",
    instructions: "Connect the components.",
    parts: { Battery: 1, Lamp: 1 },
    points: 10,
    topology: "javascript"
  };
  assert.throws(() => validateChallengeCollection(createChallengeCollection([base])), /unsupported validation rule/);

  const tooMany = {
    format: "circuit-challenge-level-collection",
    schemaVersion: 1,
    levels: Array.from({ length: 101 }, (_, index) => ({
      ...base,
      title: "Challenge " + index,
      topology: "series"
    }))
  };
  assert.throws(() => validateChallengeCollection(tooMany), /between 1 and 100 levels/);
});
