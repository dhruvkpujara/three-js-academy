import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ComponentFactory } from "./ComponentFactory.js";

/** Owns renderer, scene, controls, and 3D representations of circuit state. */
export class Scene3D {
  constructor(host) {
    this.host = host;
    this.factory = new ComponentFactory();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#081321");
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(7, 7, 9);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);
    this.modelRoot = new THREE.Group();
    this.scene.add(this.modelRoot);
    this.addLightsAndGround();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.animate();
  }

  addLightsAndGround() {
    this.scene.add(new THREE.HemisphereLight("#d6efff", "#263348", 2));
    const key = new THREE.DirectionalLight("#ffffff", 3);
    key.position.set(4, 8, 5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight("#62bfff", 1.3);
    fill.position.set(-5, 3, -4);
    this.scene.add(fill);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 12),
      new THREE.MeshStandardMaterial({ color: "#10243a", roughness: 0.85, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.65;
    this.scene.add(floor);
    const grid = new THREE.GridHelper(18, 36, "#365675", "#1d3852");
    grid.position.y = -0.64;
    this.scene.add(grid);
  }

  update(store, boardSize, simulation = null) {
    this.modelRoot.clear();
    const { width, height } = boardSize;
    for (const part of store.parts) {
      const model = this.factory.create(part.type, simulation?.components?.[part.id] || null, part);
      model.position.set((part.x / width - 0.5) * 8, 0, (part.y / height - 0.5) * 5);
      this.modelRoot.add(model);
    }
    for (const wire of store.wires) {
      const aPart = store.parts.find(part => part.id === wire.a.id);
      const bPart = store.parts.find(part => part.id === wire.b.id);
      if (!aPart || !bPart) continue;
      const a = new THREE.Vector3((aPart.x / width - 0.5) * 8 + (wire.a.side === "a" ? -0.9 : 0.9), -0.15, (aPart.y / height - 0.5) * 5);
      const b = new THREE.Vector3((bPart.x / width - 0.5) * 8 + (wire.b.side === "a" ? -0.9 : 0.9), -0.15, (bPart.y / height - 0.5) * 5);
      const mid = new THREE.Vector3((a.x + b.x) / 2, -0.42, (a.z + b.z) / 2);
      const curve = new THREE.CatmullRomCurve3([a, new THREE.Vector3(a.x, -0.42, a.z), mid, new THREE.Vector3(b.x, -0.42, b.z), b]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.025, 8, false), new THREE.MeshStandardMaterial({ color: "#ffb34d", metalness: 0.25, roughness: 0.3 }));
      this.modelRoot.add(tube);
    }
  }

  resize() {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    this.frameId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.host.replaceChildren();
  }
}
