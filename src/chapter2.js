import * as THREE from "three";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";

const canvasContainer = document.querySelector("#canvas-wrap");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b14);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(5, 3.5, 6);

const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:"high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
canvasContainer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.4, 0);

scene.add(new THREE.HemisphereLight(0xbcdcff, 0x182033, 2.2));

const keyLight = new THREE.DirectionalLight(0xffffff, 3);
keyLight.position.set(4, 6, 5);
keyLight.castShadow = true;
scene.add(keyLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(14,14),
  new THREE.MeshStandardMaterial({ color:0x141c2e, roughness:0.9 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.25;
floor.receiveShadow = true;
scene.add(floor);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(2,2,2),
  new THREE.MeshStandardMaterial({ color:0xa78bfa, roughness:0.3, metalness:0.05 })
);
cube.castShadow = true;
cube.receiveShadow = true;
scene.add(cube);

scene.add(new THREE.AxesHelper(3.5));
const grid = new THREE.GridHelper(12,12,0x355070,0x25324b);
grid.position.y = -1.24;
scene.add(grid);

const defaults = { posX:0, posY:0, rotX:0, rotY:0.6, scale:1 };

function connectSlider(id, updateObject, decimals=1) {
  const slider = document.querySelector("#" + id);
  const output = document.querySelector("#" + id + "Value");
  function update() {
    const value = Number(slider.value);
    output.value = value.toFixed(decimals);
    updateObject(value);
  }
  slider.addEventListener("input", update);
  update();
}

connectSlider("posX", value => cube.position.x = value);
connectSlider("posY", value => cube.position.y = value);
connectSlider("rotX", value => cube.rotation.x = value, 2);
connectSlider("rotY", value => cube.rotation.y = value, 2);
connectSlider("scale", value => cube.scale.setScalar(value));

function syncSliders() {
  const values = {
    posX:cube.position.x, posY:cube.position.y,
    rotX:cube.rotation.x, rotY:cube.rotation.y, scale:cube.scale.x
  };
  for (const [id,value] of Object.entries(values)) {
    const slider = document.querySelector("#"+id);
    slider.value = value;
    slider.dispatchEvent(new Event("input"));
  }
}

document.querySelector("#resetBtn").addEventListener("click", () => {
  for (const [id,value] of Object.entries(defaults)) {
    const slider = document.querySelector("#"+id);
    slider.value = value;
    slider.dispatchEvent(new Event("input"));
  }
  controls.reset();
});

let combined = false;
document.querySelector("#combineBtn").addEventListener("click", event => {
  combined = !combined;
  if (combined) {
    cube.position.set(2,0.7,0);
    cube.rotation.set(0.75,1.8,-0.3);
    cube.scale.setScalar(1.7);
    event.currentTarget.textContent = "Undo combined transform";
  } else {
    document.querySelector("#resetBtn").click();
    event.currentTarget.textContent = "Combine the transforms";
  }
  syncSliders();
});

function resizeRenderer() {
  const width = Math.max(1, canvasContainer.clientWidth);
  const height = Math.max(1, canvasContainer.clientHeight);
  renderer.setSize(width,height,false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resizeRenderer);
if ("ResizeObserver" in window) new ResizeObserver(resizeRenderer).observe(canvasContainer);
resizeRenderer();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene,camera);
}
animate();
// ============================================================
// LIVE CODE EDITOR
// ============================================================

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
    // The editor receives only the objects needed for this lesson.
    // It is intentionally not given access to the page or browser APIs.
    const runUserCode = new Function(
      "cube",
      "THREE",
      "scene",
      `"use strict";
${codeEditor.value}`
    );

    runUserCode(cube, THREE, scene);
    cube.updateMatrixWorld(true);
    syncSliders();

    combined = false;
    document.querySelector("#combineBtn").textContent =
      "Combine the transforms";

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

    codeEditor.value =
      codeEditor.value.slice(0, start) +
      "  " +
      codeEditor.value.slice(end);

    codeEditor.selectionStart = start + 2;
    codeEditor.selectionEnd = start + 2;
  }

  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    runCodeBtn.click();
  }
});
