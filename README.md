# Three.js Academy

Interactive, beginner-friendly lessons for learning 3D and Three.js step by step.

## Lesson design

Each lesson aims to have:
- one small concept
- one visual experiment
- live sliders/buttons
- a tiny code surface
- a clear "combine with what I learned before" section

## Chapter system

Each chapter is an independent HTML page, so a chapter can be opened directly by URL while the navigation connects the whole course.

- Chapter 1: `index.html` — Your First 3D World
- Chapter 2: `chapter-2.html` — Transform Lab
- Chapter 3: `chapter-3.html` — Geometry Lab
- Car AI Lab: `car-lab.html` — driving simulation, front/left/right distance sensors, heading delta, and JSON training-data export

## Car AI Lab data workflow

The independent `car-lab.html` page records labeled driving samples in `car-driving-dataset.json`. It is a simulation/data-collection tool, not a model-training runtime. Train a numeric control policy in a suitable training environment, export it to a supported format such as ONNX, and use Transformers.js for compatible in-browser inference.

## Roadmap

1. Scene, camera, renderer, mesh
2. Position, rotation, scale
3. Geometry
4. Materials and color
5. Lights
6. Shadows
7. Animation
8. Raycasting and interaction
9. Loading 3D models
10. Particles
11. Physics
12. Reusable mini-projects
13. React Three Fiber transition

We start with plain Three.js so the 3D fundamentals are understood first. Later, the same ideas will be mapped directly to React Three Fiber.
