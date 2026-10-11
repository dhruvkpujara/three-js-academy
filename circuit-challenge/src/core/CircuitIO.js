/**
 * File IO boundary for the Circuit Challenge.
 * Imported data is treated as untrusted: only known component types, terminal
 * sides, bounded coordinates, and supported level rules are accepted.
 */
const SCHEMA_VERSION = 1;
const COMPONENT_TYPES = new Set(["Battery", "Lamp", "Switch", "Resistor", "Buzzer", "Ammeter", "Voltmeter"]);
const TOPOLOGIES = new Set(["series", "parallel", "parallel-switched"]);
const MAX_PARTS = 100;
const MAX_WIRES = 300;
const MAX_LEVELS = 100;
const MAX_FILE_BYTES = 2_000_000;

export function createCircuitDocument(store, levelNumber) {
  return {
    format: "circuit-challenge-circuit",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    levelNumber: Number(levelNumber) || 1,
    parts: store.parts.map(part => ({
      id: part.id,
      type: part.type,
      x: part.x,
      y: part.y,
      ...(part.type === "Switch" ? { closed: part.closed !== false } : {})
    })),
    wires: store.wires.map(wire => ({
      a: { id: wire.a.id, side: wire.a.side },
      b: { id: wire.b.id, side: wire.b.side }
    }))
  };
}

export function validateCircuitDocument(input) {
  if (!isRecord(input) || input.format !== "circuit-challenge-circuit" || input.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("This is not a supported Circuit Challenge circuit file.");
  }
  if (!Array.isArray(input.parts) || input.parts.length > MAX_PARTS || !Array.isArray(input.wires) || input.wires.length > MAX_WIRES) {
    throw new Error("Circuit file has invalid or excessive component/wire lists.");
  }
  const ids = new Set();
  const parts = input.parts.map((part, index) => {
    if (!isRecord(part) || !Number.isSafeInteger(part.id) || part.id < 1 || ids.has(part.id)) {
      throw new Error("Each component must have a unique positive integer ID.");
    }
    if (!COMPONENT_TYPES.has(part.type)) throw new Error("Unsupported component type in imported circuit.");
    if (!isFiniteBounded(part.x, -1000, 10000) || !isFiniteBounded(part.y, -1000, 10000)) {
      throw new Error("Component positions must be finite numbers in a safe range.");
    }
    ids.add(part.id);
    const clean = { id: part.id, type: part.type, x: part.x, y: part.y };
    if (part.type === "Switch") {
      if (part.closed !== undefined && typeof part.closed !== "boolean") throw new Error("Switch state must be true or false.");
      clean.closed = part.closed !== false;
    }
    return clean;
  });
  const wires = input.wires.map(wire => {
    if (!isRecord(wire) || !isTerminal(wire.a, ids) || !isTerminal(wire.b, ids)) {
      throw new Error("A wire refers to a missing component or invalid terminal.");
    }
    if (wire.a.id === wire.b.id) throw new Error("Wires must connect two different components.");
    return { a: { id: wire.a.id, side: wire.a.side }, b: { id: wire.b.id, side: wire.b.side } };
  });
  const seen = new Set();
  for (const wire of wires) {
    const a = wire.a.id + ":" + wire.a.side;
    const b = wire.b.id + ":" + wire.b.side;
    const key = [a, b].sort().join("|");
    if (seen.has(key)) throw new Error("Circuit file contains duplicate wires.");
    seen.add(key);
  }
  return {
    parts,
    wires,
    levelNumber: Number.isInteger(input.levelNumber) && input.levelNumber > 0 ? input.levelNumber : 1
  };
}

export function createChallengeCollection(levels) {
  return {
    format: "circuit-challenge-level-collection",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    levels: levels.map(level => ({
      title: level.title,
      prompt: level.prompt,
      instructions: level.instructions,
      parts: { ...level.parts },
      points: level.points,
      topology: level.topology,
      ...(level.targetResistance !== undefined ? { targetResistance: level.targetResistance } : {}),
      ...(level.tolerance !== undefined ? { tolerance: level.tolerance } : {})
    }))
  };
}

export function validateChallengeCollection(input) {
  if (!isRecord(input) || input.format !== "circuit-challenge-level-collection" || input.schemaVersion !== SCHEMA_VERSION || !Array.isArray(input.levels)) {
    throw new Error("This is not a supported challenge-level collection.");
  }
  if (input.levels.length < 1 || input.levels.length > MAX_LEVELS) {
    throw new Error("A collection must contain between 1 and " + MAX_LEVELS + " levels.");
  }
  return input.levels.map((level, index) => {
    if (!isRecord(level)) throw new Error("Challenge " + (index + 1) + " is invalid.");
    const title = safeText(level.title, 100, "Challenge title");
    const prompt = safeText(level.prompt, 500, "Challenge prompt");
    const instructions = safeText(level.instructions, 2000, "Challenge instructions");
    if (!isRecord(level.parts)) throw new Error("Challenge " + (index + 1) + " needs a component-count object.");
    const parts = {};
    let total = 0;
    for (const [type, count] of Object.entries(level.parts)) {
      if (!COMPONENT_TYPES.has(type) || !Number.isInteger(count) || count < 0 || count > 20) {
        throw new Error("Challenge " + (index + 1) + " has invalid component requirements.");
      }
      if (count) parts[type] = count;
      total += count;
    }
    if (!total || total > MAX_PARTS) throw new Error("Each challenge must require 1–" + MAX_PARTS + " components.");
    if (!TOPOLOGIES.has(level.topology)) throw new Error("Challenge " + (index + 1) + " uses an unsupported validation rule.");
    if (parts.Battery !== 1) throw new Error("Each custom challenge must require exactly one battery.");
    if (level.topology === "parallel" && (!parts.Lamp || parts.Lamp < 1)) {
      throw new Error("Parallel challenges must require at least one lamp.");
    }
    if (level.topology === "parallel-switched" && (parts.Switch !== 1 || !parts.Lamp || parts.Lamp < 2)) {
      throw new Error("Switched-parallel challenges require one switch and at least two lamps.");
    }
    const points = Number(level.points);
    if (!Number.isInteger(points) || points < 0 || points > 10000) throw new Error("Challenge points must be an integer from 0 to 10000.");
    const clean = { title, prompt, instructions, parts, points, topology: level.topology };
    if (level.topology === "simulation") {
      if (!isFiniteBounded(level.targetResistance, 0.001, 1_000_000) || !isFiniteBounded(level.tolerance, 0.001, 100_000)) {
        throw new Error("Simulation challenges need a positive target resistance and tolerance.");
      }
      clean.targetResistance = level.targetResistance;
      clean.tolerance = level.tolerance;
    }
    return clean;
  });
}

export async function readJsonFile(file) {
  if (!file || file.size > MAX_FILE_BYTES) throw new Error("Choose a JSON file smaller than 2 MB.");
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename);
}

export function exportCircuitImage(board, store, filename = "circuit-challenge.png") {
  const width = Math.max(320, board.clientWidth || 800);
  const height = Math.max(240, board.clientHeight || 500);
  const scale = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not create an image canvas.");
  context.scale(scale, scale);
  context.fillStyle = "#0b1628";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#213650";
  context.lineWidth = 1;
  for (let x = 0; x < width; x += 20) {
    for (let y = 0; y < height; y += 20) {
      context.beginPath();
      context.arc(x, y, 1, 0, Math.PI * 2);
      context.stroke();
    }
  }

  const centers = new Map();
  for (const part of store.parts) {
    const cardWidth = 104;
    const cardHeight = 88;
    centers.set(part.id + ":a", { x: part.x + 15, y: part.y + 76 });
    centers.set(part.id + ":b", { x: part.x + cardWidth - 15, y: part.y + 76 });
  }
  context.strokeStyle = "#ffb34d";
  context.lineWidth = 3;
  context.lineCap = "round";
  for (const wire of store.wires) {
    const a = centers.get(wire.a.id + ":" + wire.a.side);
    const b = centers.get(wire.b.id + ":" + wire.b.side);
    if (!a || !b) continue;
    const middleX = (a.x + b.x) / 2;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(middleX, a.y);
    context.lineTo(middleX, b.y);
    context.lineTo(b.x, b.y);
    context.stroke();
  }

  for (const part of store.parts) {
    const x = part.x;
    const y = part.y;
    context.fillStyle = "#193550";
    context.strokeStyle = part.type === "Lamp" && (part.current || 0) > 0.005 ? "#ffe08a" : "#6997c5";
    context.lineWidth = 1.5;
    roundedRect(context, x, y, 104, 88, 10);
    context.fill();
    context.stroke();
    context.fillStyle = "#eef5ff";
    context.font = "bold 12px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(part.type, x + 52, y + 19);
    context.font = "22px system-ui, sans-serif";
    context.fillStyle = part.type === "Lamp" && (part.current || 0) > 0.005 ? "#fff0a5" : "#91efff";
    const symbol = ({ Battery: "▰", Lamp: "◉", Switch: "⏻", Resistor: "▱", Buzzer: "◖", Ammeter: "A", Voltmeter: "V" })[part.type] || "●";
    context.fillText(symbol, x + 52, y + 48);
    context.fillStyle = "#ff6577";
    for (const terminal of ["a", "b"]) {
      const point = centers.get(part.id + ":" + terminal);
      context.beginPath();
      context.arc(point.x, point.y, 5, 0, Math.PI * 2);
      context.fill();
    }
    if (part.type === "Switch") {
      context.font = "bold 9px system-ui, sans-serif";
      context.fillStyle = part.closed === false ? "#ff9ca8" : "#b8ffdc";
      context.fillText(part.closed === false ? "OPEN" : "CLOSED", x + 52, y + 68);
    }
  }

  const title = "Circuit Challenge Lab";
  context.textAlign = "left";
  context.fillStyle = "#80eaff";
  context.font = "bold 15px system-ui, sans-serif";
  context.fillText(title, 12, 20);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) return reject(new Error("Image export failed. Try a different browser."));
      downloadBlob(blob, filename);
      resolve();
    }, "image/png");
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteBounded(value, min, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isTerminal(value, ids) {
  return isRecord(value) && Number.isSafeInteger(value.id) && ids.has(value.id) && (value.side === "a" || value.side === "b");
}

function safeText(value, maxLength, label) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(label + " must be non-empty and at most " + maxLength + " characters.");
  }
  return value.trim();
}
