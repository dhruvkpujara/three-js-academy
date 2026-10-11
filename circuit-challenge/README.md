# Circuit Challenge

A standalone learning page in the Three.js Academy repository. Existing chapters remain independent and unchanged.

## Structure

- `index.html` — semantic page markup and module entry point.
- `styles/main.css` — responsive styling, separated from markup.
- `src/main.js` — application composition, UI event wiring, score and simulation readings.
- `src/config/levels.js` — ten declarative challenge definitions and component metadata.
- `src/core/CircuitStore.js` — observable circuit state and wire operations.
- `src/core/CircuitValidator.js` — component-count, topology and simulation-result validation.
- `src/core/ElectricalSimulator.js` — DC modified nodal analysis (MNA) for batteries and resistive components.
- `src/ui/BoardView.js` — 2D component placement, terminal input, and wire rendering.
- `src/three/Scene3D.js` — Three.js scene lifecycle and synchronized 3D view.
- `src/three/ComponentFactory.js` — reusable procedural component geometry.

## Challenge progression

1. Closed series loop.
2. Two lamps in series.
3. Two lamps in parallel.
4. Switch-controlled parallel branches.
5. Three parallel lamps.
6. Mixed series/parallel network, checked by equivalent resistance.
7. Series resistor plus parallel lamps.
8. Three-way parallel network.
9. Switch and series loads.
10. Two parallel branches, each containing two series lamps.

Advanced levels use a 9 V battery, 20 Ω lamps, 100 Ω resistors, and a small 0.01 Ω model resistance for a closed switch. Each advanced level checks simulated equivalent resistance against a target tolerance.

## Simulation model and limitations

The simulator builds electrical nodes by merging terminals connected with wires, then solves a linear DC network with modified nodal analysis. It reports supply voltage, source current, equivalent resistance, and per-component voltage/current/power. The UI refreshes readings when the wiring or switch state changes, and 2D/3D lamp visuals respond to current.

This is a simplified educational solver:
- Batteries are ideal fixed-voltage sources.
- Lamps are fixed 20 Ω resistors, not nonlinear or temperature-dependent bulbs.
- Switches can be opened/closed from the 2D component card. Open switches are modelled with a very high resistance to keep the numerical system solvable.
- The voltmeter is modelled as 1 MΩ and the ammeter as 0.01 Ω.
- Levels 6–10 now check explicit terminal-node patterns as well as simulated equivalent resistance. This is stronger than checking resistance alone, though further automated and browser testing is still needed.
- Ideal-source conflicts, shorts, and singular/floating networks may be rejected as having no stable DC solution.

This is not a replacement for SPICE or a physical lab. It is intended to teach basic network behavior safely.

## Design choices

- **Single source of truth:** the circuit store owns parts and wires; views render that state.
- **Separation of concerns:** validation, simulation, DOM interaction, 3D rendering, configuration, and application setup are separate modules.
- **Small reusable classes:** board, scene, validator, and simulator have focused responsibilities.
- **No build step:** uses browser ES modules and an import map for Three.js.
- **Responsive layout:** touch-friendly terminals and a single-column layout on narrow screens.

## Run locally

Serve this folder using a local HTTP server (ES modules are not reliably loaded from `file://`). For example, from the repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/circuit-challenge/`.
