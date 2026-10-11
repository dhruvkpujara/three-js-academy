import * as THREE from "three";

/** Factory keeps component geometry/material choices out of scene management. */
export class ComponentFactory {
  create(type) {
    const group = new THREE.Group();
    const metal = this.material("#c5d5e5", 0.25, 0.7);
    const blue = this.material("#347bb0", 0.35, 0.35);

    if (type === "Battery") {
      this.box(group, 1.45, 0.68, 0.72, blue, 0, 0.25, 0);
      this.box(group, 0.9, 0.08, 0.58, metal, 0, 0.63, 0);
      this.cylinder(group, 0.12, 0.12, 0.12, metal, -0.4, 0.72, 0);
      this.cylinder(group, 0.12, 0.12, 0.12, this.material("#ed5264"), 0.4, 0.72, 0);
    } else if (type === "Lamp") {
      this.cylinder(group, 0.32, 0.28, 0.22, this.material("#9caec2"), 0, -0.05, 0);
      const glass = new THREE.MeshPhysicalMaterial({ color: "#a8efff", roughness: 0.16, transparent: true, opacity: 0.58, transmission: 0.2 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.37, 24, 16), glass);
      bulb.position.y = 0.32;
      group.add(bulb);
      const filament = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 20), this.material("#ffd77a"));
      filament.position.y = 0.3;
      group.add(filament);
      const glow = new THREE.PointLight("#9beaff", 0.25, 2);
      glow.position.y = 0.3;
      group.add(glow);
    } else if (type === "Switch") {
      this.box(group, 1.35, 0.32, 0.65, blue, 0, 0, 0);
      this.cylinder(group, 0.11, 0.11, 0.12, metal, -0.36, 0.22, 0);
      this.cylinder(group, 0.11, 0.11, 0.12, metal, 0.36, 0.22, 0);
      const lever = this.box(group, 0.72, 0.09, 0.12, this.material("#f5c56c"), 0, 0.38, 0);
      lever.rotation.z = -0.28;
    } else if (type === "Resistor") {
      this.cylinder(group, 0.18, 0.18, 0.8, this.material("#d7b58b"), 0, 0.1, 0);
      ["#8d5a40", "#e04c48", "#6d63bb", "#a56d3b"].forEach((color, index) => {
        this.box(group, 0.045, 0.25, 0.24, this.material(color), -0.3 + index * 0.2, 0.1, 0);
      });
    } else if (type === "Buzzer") {
      this.cylinder(group, 0.45, 0.45, 0.25, blue, 0, 0, 0);
      this.cylinder(group, 0.29, 0.29, 0.03, this.material("#192f43"), 0, 0.15, 0);
    } else {
      this.cylinder(group, 0.48, 0.48, 0.22, blue, 0, 0, 0);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 32), metal);
      ring.position.y = 0.13;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      const bar = this.box(group, 0.26, 0.04, 0.05, this.material(type === "Ammeter" ? "#a9f2c3" : "#9cecff"), 0, 0.16, 0);
    }

    for (const x of [-0.72, 0.72]) {
      this.cylinder(group, 0.085, 0.085, 0.12, metal, x, -0.12, 0);
    }
    return group;
  }

  material(color, roughness = 0.5, metalness = 0.1) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  box(parent, width, height, depth, material, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  cylinder(parent, topRadius, bottomRadius, height, material, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(topRadius, bottomRadius, height, 24), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
}
