/**
 * Challenge data is declarative: prompts, component counts and topology rules
 * are kept together so the UI and validator cannot drift apart.
 */
export const LEVELS = {
  1: {
    title: "Level 1 — Complete the loop",
    prompt: "Build a working closed loop using exactly one battery, one switch and one lamp.",
    instructions: "Use the battery, switch and lamp. Every component must be part of one closed path; each component must have one wire on terminal A and one on terminal B.",
    parts: { Battery: 1, Switch: 1, Lamp: 1 },
    points: 10,
    topology: "series"
  },
  2: {
    title: "Level 2 — Series circuit",
    prompt: "Build a series circuit with one battery, one switch and two lamps.",
    instructions: "Make one continuous loop. Current must have only one path through both lamps; do not connect the lamps as separate branches.",
    parts: { Battery: 1, Switch: 1, Lamp: 2 },
    points: 20,
    topology: "series"
  },
  3: {
    title: "Level 3 — Parallel branches",
    prompt: "Connect one battery to two lamps in parallel.",
    instructions: "Both lamps must connect across the same two electrical nodes as the battery. Each lamp should form its own branch; connecting them end-to-end is incorrect.",
    parts: { Battery: 1, Lamp: 2 },
    points: 30,
    topology: "parallel"
  },
  4: {
    title: "Level 4 — Switch-controlled parallel circuit",
    prompt: "Build a parallel circuit with one battery, one switch and two lamps.",
    instructions: "The two lamps must be in separate parallel branches. Put the switch in the shared supply path so opening it would interrupt power to both branches. Every component must be electrically connected.",
    parts: { Battery: 1, Switch: 1, Lamp: 2 },
    points: 40,
    topology: "parallel-switched"
  },
  5: {
    title: "Level 5 — Three parallel branches",
    prompt: "Build a three-branch parallel circuit powered by one battery.",
    instructions: "Use one battery and three lamps. All three lamps must connect across the same two supply nodes, with no lamp in series with another. Double-check every terminal before submitting.",
    parts: { Battery: 1, Lamp: 3 },
    points: 50,
    topology: "parallel"
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
