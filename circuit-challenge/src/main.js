import { LEVELS } from "./config/levels.js";
import { CircuitStore } from "./core/CircuitStore.js";
import { CircuitValidator } from "./core/CircuitValidator.js";
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

function showStatus(message, isWarning = false) {
  status.textContent = message;
  status.classList.toggle("warn", isWarning);
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

store.subscribe(() => {
  $("partReadout").textContent = "Components: " + store.parts.length;
  $("wireReadout").textContent = "Wires: " + store.wires.length;
  if (scene3D) scene3D.update(store, { width: board.clientWidth || 1, height: board.clientHeight || 1 });
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

function loadLevel() {
  store.clear();
  $("prompt").textContent = currentLevel().prompt;
  $("info").textContent = "Required: " + Object.entries(currentLevel().parts).map(([type, count]) => type + " ×" + count).join(" · ") + "\n" + currentLevel().instructions;
  $("info").style.whiteSpace = "pre-line";
  $("next").disabled = !awardedLevels.has(Number($("level").value));
  $("progress").textContent = "Level " + $("level").value + " of " + Object.keys(LEVELS).length;
  $("nodeReadout").textContent = "Network: not checked";
  setMode("select");
  showStatus("Level loaded. Add the required components.");
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
  showStatus("Workspace cleared.");
});
$("check").addEventListener("click", () => {
  const result = validator.validate(store.parts, store.wires, currentLevel());
  $("nodeReadout").textContent = result.ok ? "Network: valid" : "Network: incomplete";
  if (!result.ok) {
    showStatus(result.reason, true);
    return;
  }
  const levelNumber = Number($("level").value);
  if (!awardedLevels.has(levelNumber)) {
    score += currentLevel().points;
    awardedLevels.add(levelNumber);
    $("score").textContent = "Score: " + score;
    showStatus("Correct! Level " + levelNumber + " passed — +" + currentLevel().points + " points.");
    $("next").disabled = false;
  } else {
    showStatus("Correct circuit! Points for this level were already awarded.");
    $("next").disabled = false;
  }
});
$("next").addEventListener("click", () => {
  const levelNumber = Number($("level").value);
  if (levelNumber < Object.keys(LEVELS).length) {
    $("level").value = String(levelNumber + 1);
    loadLevel();
  } else {
    showStatus("You completed all five levels! Choose a level to practise again.");
  }
});
$("level").addEventListener("change", loadLevel);

const resizeObserver = new ResizeObserver(() => {
  if (scene3D) scene3D.update(store, { width: board.clientWidth || 1, height: board.clientHeight || 1 });
});
resizeObserver.observe(board);
window.addEventListener("beforeunload", () => {
  resizeObserver.disconnect();
  boardView.destroy();
  scene3D?.destroy();
});

loadLevel();
