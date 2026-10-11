/**
 * Declarative challenge data: component counts, prompts, scoring and validation
 * rules live together so the UI and validation stay aligned.
 */
export const LEVELS = {
  1: {
    title: "Level 1 — Complete the loop",
    prompt: "Build a working closed loop using exactly one battery, one switch and one lamp.",
    instructions: "Use the battery, switch and lamp. Every component must be part of one closed path; each component must have one wire on terminal A and one on terminal B.",
    parts: { Battery: 1, Switch: 1, Lamp: 1 }, points: 10, topology: "series"
  },
  2: {
    title: "Level 2 — Series circuit",
    prompt: "Build a series circuit with one battery, one switch and two lamps.",
    instructions: "Make one continuous loop. Current must have only one path through both lamps; do not connect the lamps as separate branches.",
    parts: { Battery: 1, Switch: 1, Lamp: 2 }, points: 20, topology: "series"
  },
  3: {
    title: "Level 3 — Parallel branches",
    prompt: "Connect one battery to two lamps in parallel.",
    instructions: "Both lamps must connect across the same two electrical nodes as the battery. Connecting them end-to-end is incorrect.",
    parts: { Battery: 1, Lamp: 2 }, points: 30, topology: "parallel"
  },
  4: {
    title: "Level 4 — Switch-controlled parallel circuit",
    prompt: "Build a parallel circuit with one battery, one switch and two lamps.",
    instructions: "The two lamps must be in separate parallel branches. Put the switch in the shared supply path so opening it would interrupt power to both branches.",
    parts: { Battery: 1, Switch: 1, Lamp: 2 }, points: 40, topology: "parallel-switched"
  },
  5: {
    title: "Level 5 — Three parallel branches",
    prompt: "Build a three-branch parallel circuit powered by one battery.",
    instructions: "Use one battery and three lamps. All three lamps must connect across the same two supply nodes.",
    parts: { Battery: 1, Lamp: 3 }, points: 50, topology: "parallel"
  },
  6: {
    title: "Level 6 — Mixed circuit",
    prompt: "Build a mixed circuit with three lamps: two lamps in series on one branch, in parallel with the third lamp.",
    instructions: "Use exactly one 9 V battery and three 20 Ω lamps. Your equivalent resistance should be about 13.33 Ω. This level checks calculated resistance as well as connectivity.",
    parts: { Battery: 1, Lamp: 3 }, points: 60, topology: "simulation", targetResistance: 13.333, tolerance: 0.25
  },
  7: {
    title: "Level 7 — Resistor in the supply path",
    prompt: "Build a circuit with one resistor in series with two parallel lamps.",
    instructions: "Use one 9 V battery, one 100 Ω resistor and two 20 Ω lamps. The resistor must be in series with the parallel lamp pair. Target equivalent resistance: about 110 Ω.",
    parts: { Battery: 1, Resistor: 1, Lamp: 2 }, points: 80, topology: "simulation", targetResistance: 110, tolerance: 1
  },
  8: {
    title: "Level 8 — Three-way parallel network",
    prompt: "Build a three-lamp parallel circuit and verify its electrical readings.",
    instructions: "Use one battery and three 20 Ω lamps. The lamps must share the same two supply nodes. Target equivalent resistance: about 6.67 Ω.",
    parts: { Battery: 1, Lamp: 3 }, points: 100, topology: "simulation", targetResistance: 6.667, tolerance: 0.2
  },
  9: {
    title: "Level 9 — Switch and series loads",
    prompt: "Build a switch-controlled series circuit with two lamps.",
    instructions: "Use one battery, one closed switch, and two 20 Ω lamps in one series loop. Target equivalent resistance is approximately 40 Ω (the small switch resistance is ignored in the target).",
    parts: { Battery: 1, Switch: 1, Lamp: 2 }, points: 120, topology: "simulation", targetResistance: 40, tolerance: 0.2
  },
  10: {
    title: "Level 10 — Circuit architect",
    prompt: "Build two parallel branches, with two lamps in series in each branch.",
    instructions: "Use one 9 V battery and four 20 Ω lamps. Each branch should contain two lamps in series; the two branches must be in parallel. Target equivalent resistance: about 20 Ω.",
    parts: { Battery: 1, Lamp: 4 }, points: 150, topology: "simulation", targetResistance: 20, tolerance: 0.5
  }
};

export const COMPONENTS = {
  Battery: { symbol: "▰", terminals: 2 },
  Lamp: { symbol: "◉", terminals: 2 },
  Switch: { symbol: "⏻", terminals: 2 },
  Resistor: { symbol: "▱", terminals: 2 },
  Buzzer: { symbol: "◖", terminals: 2 },
  Ammeter: { symbol: "A", terminals: 2 },
  Voltmeter: { symbol: "V", terminals: 2 }
};
