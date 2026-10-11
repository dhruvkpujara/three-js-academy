/** Challenge definitions live here so UI and validation share one source of truth. */
export const LEVELS = {
  1: { prompt: "Connect a battery, a switch, and one lamp in a closed loop.", parts: { Battery: 1, Switch: 1, Lamp: 1 }, points: 10, topology: "series" },
  2: { prompt: "Connect a battery, a switch and two lamps in one series path.", parts: { Battery: 1, Switch: 1, Lamp: 2 }, points: 20, topology: "series" },
  3: { prompt: "Connect two lamps in parallel across the battery terminals.", parts: { Battery: 1, Lamp: 2 }, points: 30, topology: "parallel" },
  4: { prompt: "Build a parallel circuit with a battery, a switch and two lamps.", parts: { Battery: 1, Switch: 1, Lamp: 2 }, points: 40, topology: "parallel" },
  5: { prompt: "Build a parallel circuit with three separate lamp branches.", parts: { Battery: 1, Lamp: 3 }, points: 50, topology: "parallel" }
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
