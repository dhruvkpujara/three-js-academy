/*
 * THREE.JS ACADEMY
 * Lesson 1 — Your First 3D World
 *
 * Goal:
 * Understand the basic pieces of a Three.js application.
 *
 * We will learn each piece separately in future lessons.
 */


/* ============================================================
   1. IMPORT THREE.JS
   ============================================================ */

import * as THREE from "three";

import {
  OrbitControls
} from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";


/* ============================================================
   2. FIND THE HTML ELEMENT
   ============================================================ */

const canvasContainer =
  document.querySelector("#canvas-wrap");


/* ============================================================
   3. CREATE THE SCENE
   ============================================================ */

const scene = new THREE.Scene();

scene.background =
  new THREE.Color(0x070b14);


/* ============================================================
   4. CREATE THE CAMERA
   ============================================================ */

const camera =
  new THREE.PerspectiveCamera(
    55,
    1,
    0.1,
    100
  );

camera.position.set(4, 3, 6);


/* ============================================================
   5. CREATE THE RENDERER
   ============================================================ */

const renderer =
  new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

renderer.shadowMap.enabled = true;

canvasContainer.appendChild(
  renderer.domElement
);


/* ============================================================
   6. ADD CAMERA CONTROLS
   ============================================================ */

const controls =
  new OrbitControls(
    camera,
    renderer.domElement
  );

controls.enableDamping = true;

controls.target.set(
  0,
  0.2,
  0
);


/* ============================================================
   7. ADD LIGHTS
   ============================================================ */

const hemisphereLight =
  new THREE.HemisphereLight(
    0xbcdcff,
    0x182033,
    2.2
  );

scene.add(hemisphereLight);


const keyLight =
  new THREE.DirectionalLight(
    0xffffff,
    3
  );

keyLight.position.set(
  4,
  6,
  5
);

keyLight.castShadow = true;

scene.add(keyLight);


/* ============================================================
   8. CREATE A FLOOR
   ============================================================ */

const floorGeometry =
  new THREE.PlaneGeometry(
    14,
    14
  );

const floorMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x141c2e,
    roughness: 0.9
  });

const floor =
  new THREE.Mesh(
    floorGeometry,
    floorMaterial
  );

floor.rotation.x =
  -Math.PI / 2;

floor.position.y =
  -1.25;

floor.receiveShadow = true;

scene.add(floor);


/* ============================================================
   9. CREATE THE CUBE
   ============================================================ */

/*
 * A mesh is normally made from:
 *
 * Geometry + Material = Mesh
 *
 * Geometry = shape
 * Material = appearance
 */

const cubeGeometry =
  new THREE.BoxGeometry(
    2,
    2,
    2
  );

const cubeMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    roughness: 0.32,
    metalness: 0.05
  });

const cube =
  new THREE.Mesh(
    cubeGeometry,
    cubeMaterial
  );

cube.castShadow = true;
cube.receiveShadow = true;

scene.add(cube);


/* ============================================================
   10. ADD HELPER OBJECTS
   ============================================================ */

const axesHelper =
  new THREE.AxesHelper(3.5);

scene.add(axesHelper);


const gridHelper =
  new THREE.GridHelper(
    12,
    12,
    0x355070,
    0x25324b
  );

gridHelper.position.y =
  -1.24;

scene.add(gridHelper);


/* ============================================================
   11. SLIDER CONTROLS
   ============================================================ */

const defaults = {
  posX: 0,
  posY: 0,
  posZ: 0,
  rotY: 0.6,
  scale: 1
};


function connectSlider(
  id,
  updateObject
) {
  const slider =
    document.querySelector(
      "#" + id
    );

  const output =
    document.querySelector(
      "#" + id + "Value"
    );


  function update() {
    const value =
      Number(slider.value);

    output.value =
      value.toFixed(
        id === "rotY" ? 2 : 1
      );

    updateObject(value);
  }


  slider.addEventListener(
    "input",
    update
  );

  update();
}


/* Position */

connectSlider(
  "posX",
  value => {
    cube.position.x = value;
  }
);

connectSlider(
  "posY",
  value => {
    cube.position.y = value;
  }
);

connectSlider(
  "posZ",
  value => {
    cube.position.z = value;
  }
);


/* Rotation */

connectSlider(
  "rotY",
  value => {
    cube.rotation.y = value;
  }
);


/* Scale */

connectSlider(
  "scale",
  value => {
    cube.scale.setScalar(value);
  }
);


/* ============================================================
   12. RESET BUTTON
   ============================================================ */

document
  .querySelector("#resetBtn")
  .addEventListener(
    "click",
    () => {

      for (
        const [id, value]
        of Object.entries(defaults)
      ) {
        const slider =
          document.querySelector(
            "#" + id
          );

        slider.value = value;

        slider.dispatchEvent(
          new Event("input")
        );
      }

      controls.reset();
    }
  );


/* ============================================================
   13. COMBINED VIEW
   ============================================================ */

// Chapter 1 now hands off to Chapter 2 through page navigation.
// Keep this file focused on the Lesson 1 experiment.


/* ============================================================
   14. RESPONSIVE RENDERING
   ============================================================ */

function resizeRenderer() {
  const width =
    Math.max(1, canvasContainer.clientWidth);

  const height =
    Math.max(1, canvasContainer.clientHeight);


  renderer.setSize(
    width,
    height,
    false
  );


  camera.aspect =
    width / height;

  camera.updateProjectionMatrix();
}


window.addEventListener(
  "resize",
  resizeRenderer
);

if ("ResizeObserver" in window) {
  const observer =
    new ResizeObserver(resizeRenderer);

  observer.observe(canvasContainer);
}

resizeRenderer();


/* ============================================================
   15. ANIMATION LOOP
   ============================================================ */

const clock =
  new THREE.Clock();


function animate() {
  requestAnimationFrame(
    animate
  );


  const time =
    clock.getElapsedTime();


  const selectedY =
    Number(
      document.querySelector(
        "#posY"
      ).value
    );


  cube.position.y =
    selectedY +
    Math.sin(time * 1.4) *
    0.05;


  controls.update();


  /*
   * Scene + Camera
   *       ↓
   *    Renderer
   *       ↓
   *     Screen
   */

  renderer.render(
    scene,
    camera
  );
}


animate();