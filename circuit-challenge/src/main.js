import { LEVELS } from "./config/levels.js";
import { CircuitStore } from "./core/CircuitStore.js";
import { CircuitValidator } from "./core/CircuitValidator.js";
import {
  createCircuitDocument,
  validateCircuitDocument,
  createChallengeCollection,
  validateChallengeCollection,
  readJsonFile,
  downloadJson,
  exportCircuitImage
} from "./core/CircuitIO.js";
import { BoardView } from "./ui/BoardView.js";
import { Scene3D } from "./three/Scene3D.js";

const $ = id => document.getElementById(id);
const store = new CircuitStore();
const validator = new CircuitValidator();
const board = $("board");
const status = $("status");
const sceneStatus = $("threeStatus");
let score = 0;
const awardedLevels = new Set();
const customLevels = [];
let nextCustomLevelId = Math.max(...Object.keys(LEVELS).map(Number)) + 1;

function showStatus(message, isWarning = false) {
  status.textContent = message;
  status.classList.toggle("warn", isWarning);
}

function showSimulation(simulation) {
  $("voltageReadout").textContent = simulation?.ok ? "Supply: " + simulation.supplyVoltage + " V" : "Supply: — V";
  $("currentReadout").textContent = simulation?.ok ? "Current: " + simulation.totalCurrent + " A" : "Current: — A";
  const resistance = simulation?.ok && Number.isFinite(simulation.equivalentResistance)
    ? simulation.equivalentResistance + " Ω"
    : "— Ω";
  $("resistanceReadout").textContent = "Equivalent R: " + resistance;
}

const boardView = new BoardView({
  board,
  svg: $("wires"),
  store,
  onStatus: showStatus
});

let scene3D;
try {
  scene3D = new Scene3D($("threeView"));
  sceneStatus.textContent = "3D models ready. Drag to rotate; scroll or pinch to zoom.";
} catch (error) {
  sceneStatus.textContent = "3D view could not start: " + error.message;
}

let liveSimulation = null;
store.subscribe(() => {
  $("partReadout").textContent = "Components: " + store.parts.length;
  $("wireReadout").textContent = "Wires: " + store.wires.length;
  liveSimulation = validator.simulator.simulate(store.parts, store.wires);
  if (liveSimulation.ok) {
    for (const part of store.parts) {
      const reading = liveSimulation.components[part.id];
      part.current = reading?.current || 0;
      part.voltage = reading?.voltage || 0;
    }
    showSimulation(liveSimulation);
  } else {
    for (const part of store.parts) {
      part.current = 0;
      part.voltage = 0;
    }
    showSimulation(null);
  }
  boardView.render();
  if (scene3D) scene3D.update(store, { width: board.clientWidth || 1, height: board.clientHeight || 1 }, liveSimulation?.ok ? liveSimulation : null);
});

function currentLevel() {
  return LEVELS[Number($("level").value)];
}

function setMode(mode) {
  boardView.setMode(mode);
  $("modeLabel").textContent = mode === "wire" ? "WIRE MODE" : "MOVE MODE";
  showStatus(mode === "wire"
    ? "Wire mode: tap a terminal, then another component terminal."
    : "Move mode: drag component bodies to arrange them.");
}

function refreshLevelOptions() {
  const select = $("level");
  const selected = select.value || "1";
  select.querySelectorAll("option[data-custom='true']").forEach(option => option.remove());
  for (const entry of customLevels) {
    const option = document.createElement("option");
    option.value = String(entry.id);
    option.dataset.custom = "true";
    option.textContent = entry.id + " · " + entry.level.title.replace(/^Level\\s+\\d+\\s*[—-]?\\s*/i, "");
    select.appendChild(option);
  }
  if (LEVELS[Number(selected)]) select.value = selected;
}

function loadLevel({ clearBoard = true } = {}) {
  if (clearBoard) store.clear();
  const levelNumber = Number($("level").value);
  const level = currentLevel();
  if (!level) {
    showStatus("That challenge could not be found.", true);
    return;
  }
  $("prompt").textContent = level.prompt;
  $("info").textContent = "Required: " + Object.entries(level.parts).map(([type, count]) => type + " ×" + count).join(" · ") + "\\n" + level.instructions;
  $("info").style.whiteSpace = "pre-line";
  $("next").disabled = !awardedLevels.has(levelNumber);
  $("progress").textContent = "Level " + levelNumber + " of " + Object.keys(LEVELS).length;
  $("nodeReadout").textContent = "Network: not checked";
  showSimulation(null);
  setMode("select");
  showStatus("Level loaded. Add the required components.");
}

function addCustomLevels(levels) {
  const newEntries = levels.map(level => ({ id: nextCustomLevelId++, level: { ...level, title: "Level " + (nextCustomLevelId - 1) + " — " + level.title.replace(/^Level\\s+\\d+\\s*[—-]?\\s*/i, "") } }));
  for (const entry of newEntries) {
    customLevels.push(entry);
    LEVELS[entry.id] = entry.level;
  }
  refreshLevelOptions();
  return newEntries.length;
}

document.querySelectorAll("[data-part]").forEach(button => {
  button.addEventListener("click", () => {
    const type = button.dataset.part;
    const requiredCount = currentLevel().parts[type] || 0;
    const existingCount = store.parts.filter(part => part.type === type).length;
    if (requiredCount && existingCount >= requiredCount) {
      showStatus("This level needs only " + requiredCount + " " + type + (requiredCount === 1 ? "" : "s") + ".", true);
      return;
    }
    const index = store.parts.length;
    store.addPart(type, 18 + (index % 3) * 125, 18 + Math.floor(index / 3) * 118);
    showStatus(type + " added. Move it into place, then connect its terminals.");
  });
});

$("selectMode").addEventListener("click", () => setMode("select"));
$("wireMode").addEventListener("click", () => setMode("wire"));
$("undo").addEventListener("click", () => {
  const removed = store.undoWire();
  showStatus(removed ? "Last wire removed." : "There are no wires to undo.", !removed);
});
$("clear").addEventListener("click", () => {
  store.clear();
  $("nodeReadout").textContent = "Network: not checked";
  showSimulation(null);
  showStatus("Workspace cleared.");
});
$("check").addEventListener("click", () => {
  const result = validator.validate(store.parts, store.wires, { ...currentLevel(), number: Number($("level").value) });
  $("nodeReadout").textContent = result.ok ? "Network: valid" : "Network: incomplete";
  if (result.simulation) showSimulation(result.simulation);
  else if (liveSimulation?.ok) showSimulation(liveSimulation);
  else showSimulation(null);
  if (!result.ok) {
    showStatus(result.reason, true);
    return;
  }
  const levelNumber = Number($("level").value);
  if (!awardedLevels.has(levelNumber)) {
    score += currentLevel().points;
    awardedLevels.add(levelNumber);
    $("score").textContent = "Score: " + score;
    showStatus("Correct! Level " + levelNumber + " passed — +" + currentLevel().points + " points. " + result.reason);
    $("next").disabled = false;
  } else {
    showStatus("Correct circuit! Points for this level were already awarded. " + result.reason);
    $("next").disabled = false;
  }
});
$("next").addEventListener("click", () => {
  const levelNumber = Number($("level").value);
  if (!awardedLevels.has(levelNumber)) {
    showStatus("Submit a correct answer before moving to the next level.", true);
    return;
  }
  if (levelNumber < Object.keys(LEVELS).length) {
    $("level").value = String(levelNumber + 1);
    loadLevel();
  } else {
    showStatus("You completed all available levels! Choose a level to practise again.");
  }
});
$("level").addEventListener("change", () => loadLevel());

$("exportCircuit").addEventListener("click", () => {
  try {
    const documentData = createCircuitDocument(store, Number($("level").value));
    downloadJson(documentData, "circuit-challenge-level-" + $("level").value + ".json");
    showStatus("Circuit JSON exported. Keep the file to reopen this editable design.");
  } catch (error) {
    showStatus("Export failed: " + error.message, true);
  }
});

$("exportImage").addEventListener("click", async () => {
  try {
    await exportCircuitImage(board, store, "circuit-challenge.png");
    showStatus("Circuit image exported as PNG.");
  } catch (error) {
    showStatus("Image export failed: " + error.message, true);
  }
});

$("importCircuitButton").addEventListener("click", () => $("importCircuitFile").click());
$("importCircuitFile").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const raw = await readJsonFile(file);
    const circuit = validateCircuitDocument(raw);
    store.replaceCircuit(circuit.parts, circuit.wires);
    if (LEVELS[circuit.levelNumber]) $("level").value = String(circuit.levelNumber);
    loadLevel({ clearBoard: false });
    showStatus("Circuit imported and validated. The design is editable; submit it to check the answer.");
  } catch (error) {
    showStatus("Import rejected: " + error.message, true);
  }
});

$("createCustomLevel").addEventListener("click", () => {
  try {
    let parts;
    try {
      parts = JSON.parse($("customParts").value);
    } catch {
      throw new Error("Required components must be valid JSON, for example: { Battery: 1, Lamp: 2 } with quoted JSON keys.");
    }
    const [level] = validateChallengeCollection({
      format: "circuit-challenge-level-collection",
      schemaVersion: 1,
      levels: [{
        title: $("customTitle").value,
        prompt: $("customPrompt").value,
        instructions: $("customInstructions").value,
        parts,
        points: Number($("customPoints").value),
        topology: $("customTopology").value
      }]
    });
    addCustomLevels([level]);
    $("level").value = String(nextCustomLevelId - 1);
    loadLevel();
    showStatus("Custom challenge created. It is available in the Level menu and can be exported.");
  } catch (error) {
    showStatus("Custom level not created: " + error.message, true);
  }
});

$("exportLevels").addEventListener("click", () => {
  if (!customLevels.length) {
    showStatus("No custom levels to export yet. Import a custom level collection first.", true);
    return;
  }
  downloadJson(createChallengeCollection(customLevels.map(entry => entry.level)), "circuit-challenge-custom-levels.json");
  showStatus("Exported " + customLevels.length + " custom challenge level(s).");
});

$("importLevelsButton").addEventListener("click", () => $("importLevelsFile").click());
$("importLevelsFile").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const raw = await readJsonFile(file);
    const levels = validateChallengeCollection(raw);
    const count = addCustomLevels(levels);
    showStatus("Imported " + count + " custom challenge level(s). They are now available in the Level menu.");
  } catch (error) {
    showStatus("Level import rejected: " + error.message, true);
  }
});

const resizeObserver = new ResizeObserver(() => {
  if (scene3D) scene3D.update(store, { width: board.clientWidth || 1, height: board.clientHeight || 1 }, liveSimulation?.ok ? liveSimulation : null);
});
resizeObserver.observe(board);
window.addEventListener("beforeunload", () => {
  resizeObserver.disconnect();
  boardView.destroy();
  scene3D?.destroy();
});

refreshLevelOptions();
loadLevel();
