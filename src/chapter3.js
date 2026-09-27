import * as THREE from "three";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";

const canvasContainer = document.querySelector("#canvas-wrap");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b14);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(5, 3.5, 6);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
canvasContainer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.2, 0);

scene.add(new THREE.HemisphereLight(0xbcdcff, 0x182033, 2.2));

const keyLight = new THREE.DirectionalLight(0xffffff, 3);
keyLight.position.set(4, 6, 5);
keyLight.castShadow = true;
scene.add(keyLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 14),
  new THREE.MeshStandardMaterial({ color: 0x141c2e, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.25;
floor.receiveShadow = true;
scene.add(floor);

const material = new THREE.MeshStandardMaterial({
  color: 0x7dd3fc,
  roughness: 0.28,
  metalness: 0.08
});

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  material
);
cube.castShadow = true;
cube.receiveShadow = true;
scene.add(cube);

scene.add(new THREE.AxesHelper(3.5));
const grid = new THREE.GridHelper(12, 12, 0x355070, 0x25324b);
grid.position.y = -1.24;
scene.add(grid);

const detail = document.querySelector("#detail");
const detailValue = document.querySelector("#detailValue");
const shapeButtons = document.querySelectorAll(".shape-button");

const shapeFactories = {
  box: d => new THREE.BoxGeometry(2, 2, 2),
  sphere: d => new THREE.SphereGeometry(1.35, d, Math.max(8, Math.floor(d / 2))),
  cone: d => new THREE.ConeGeometry(1.35, 2.6, d),
  cylinder: d => new THREE.CylinderGeometry(1.25, 1.25, 2.6, d),
  torus: d => new THREE.TorusGeometry(1.2, 0.38, Math.max(6, Math.floor(d / 3)), d),
  knot: d => new THREE.TorusKnotGeometry(1.05, 0.32, Math.max(48, d * 3), Math.max(6, Math.floor(d / 3)))
};

let currentShape = "box";

function setGeometry(geometry) {
  cube.geometry.dispose();
  cube.geometry = geometry;
}

function selectShape(shape) {
  currentShape = shape;
  setGeometry(shapeFactories[shape](Number(detail.value)));
  shapeButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.shape === shape);
  });
}

shapeButtons.forEach(button => {
  button.addEventListener("click", () => {
    selectShape(button.dataset.shape);
    updateGeneratedCode();
  });
});

detail.addEventListener("input", () => {
  detailValue.value = detail.value;
  if (currentShape !== "box") {
    setGeometry(shapeFactories[currentShape](Number(detail.value)));
  }
  updateGeneratedCode();
});

document.querySelector("#resetBtn").addEventListener("click", () => {
  detail.value = 24;
  detailValue.value = 24;
  selectShape("box");
  cube.position.set(0, 0, 0);
  cube.rotation.set(0, 0.6, 0);
  cube.scale.setScalar(1);
  controls.reset();
});

// ============================================================
// SLIDER → CODE
// ============================================================

const generatedCode = document.querySelector("#generatedCode");
const copyGeneratedCode = document.querySelector("#copyGeneratedCode");
const copyStatus = document.querySelector("#copyStatus");

function getGeometryCode() {
  const d = Number(detail.value);

  const codeByShape = {
    box: "cube.geometry = new THREE.BoxGeometry(2, 2, 2);",
    sphere: `cube.geometry = new THREE.SphereGeometry(1.35, ${d}, ${Math.max(8, Math.floor(d / 2))});`,
    cone: `cube.geometry = new THREE.ConeGeometry(1.35, 2.6, ${d});`,
    cylinder: `cube.geometry = new THREE.CylinderGeometry(1.25, 1.25, 2.6, ${d});`,
    torus: `cube.geometry = new THREE.TorusGeometry(1.2, 0.38, ${Math.max(6, Math.floor(d / 3))}, ${d});`,
    knot: `cube.geometry = new THREE.TorusKnotGeometry(1.05, 0.32, ${Math.max(48, d * 3)}, ${Math.max(6, Math.floor(d / 3))});`
  };

  return codeByShape[currentShape];
}

function updateGeneratedCode() {
  generatedCode.textContent = getGeometryCode();
}

copyGeneratedCode.addEventListener("click", async () => {
  const code = getGeometryCode();

  try {
    await navigator.clipboard.writeText(code);
    copyStatus.textContent = "✓ Copied! Paste it into the Live Code Editor.";
    copyStatus.className = "code-status success";
  } catch {
    copyStatus.textContent = "Select the code above and copy it manually.";
    copyStatus.className = "code-status";
  }
});

const codeEditor = document.querySelector("#codeEditor");
const runCodeBtn = document.querySelector("#runCodeBtn");
const resetCodeBtn = document.querySelector("#resetCodeBtn");
const codeStatus = document.querySelector("#codeStatus");
const starterCode = codeEditor.value;

function showCodeStatus(message, type = "") {
  codeStatus.textContent = message;
  codeStatus.className = "code-status" + (type ? " " + type : "");
}

runCodeBtn.addEventListener("click", () => {
  try {
    const runUserCode = new Function(
      "cube",
      "THREE",
      "scene",
      '"use strict";\n' + codeEditor.value
    );

    runUserCode(cube, THREE, scene);
    cube.updateMatrixWorld(true);
    showCodeStatus("✓ Code ran successfully. Look at the 3D scene!", "success");
  } catch (error) {
    showCodeStatus("✕ " + error.message, "error");
  }
});

resetCodeBtn.addEventListener("click", () => {
  codeEditor.value = starterCode;
  showCodeStatus("Editor restored. Press Run Code to apply it.");
});

codeEditor.addEventListener("keydown", event => {
  if (event.key === "Tab") {
    event.preventDefault();
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    codeEditor.value = codeEditor.value.slice(0, start) + "  " + codeEditor.value.slice(end);
    codeEditor.selectionStart = start + 2;
    codeEditor.selectionEnd = start + 2;
  }

  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    runCodeBtn.click();
  }
});

function resizeRenderer() {
  const width = Math.max(1, canvasContainer.clientWidth);
  const height = Math.max(1, canvasContainer.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resizeRenderer);
if ("ResizeObserver" in window) new ResizeObserver(resizeRenderer).observe(canvasContainer);
resizeRenderer();
updateGeneratedCode();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();