# Circuit Challenge

A standalone learning page in the Three.js Academy repository. Existing chapters remain independent and unchanged.

## Structure

- `index.html` — semantic page markup and module entry point.
- `styles/main.css` — responsive styling, separated from markup.
- `src/main.js` — application composition and UI event wiring.
- `src/config/levels.js` — challenge definitions and component metadata.
- `src/core/CircuitStore.js` — observable circuit state and wire operations.
- `src/core/CircuitValidator.js` — component-count and topology validation.
- `src/ui/BoardView.js` — 2D component placement, terminal input, and wire rendering.
- `src/three/Scene3D.js` — Three.js scene lifecycle and synchronized 3D view.
- `src/three/ComponentFactory.js` — reusable procedural component geometry.

## Design choices

- **Single source of truth:** the circuit store owns parts and wires; views render that state.
- **Separation of concerns:** validation, DOM interaction, 3D rendering, configuration, and application setup are independent modules.
- **Small reusable classes:** board and 3D scene have explicit lifecycles and cleanup methods.
- **No build step:** uses browser ES modules and an import map for Three.js.
- **Responsive layout:** touch-friendly terminals and a single-column layout on narrow screens.

## Run locally

Serve this folder using a local HTTP server (ES modules are not reliably loaded from `file://`). For example, from the repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/circuit-challenge/`.

## Current limitations

This is a learning prototype, not a circuit simulator. It does not yet calculate voltage/current or model open/closed switch behavior. Topology validation is intentionally basic and needs further edge-case testing before treating every accepted circuit as electrically correct.
