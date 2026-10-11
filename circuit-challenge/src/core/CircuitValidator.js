import { ElectricalSimulator } from "./ElectricalSimulator.js";

/**
 * Validates submitted answers without depending on the DOM or Three.js.
 * Levels 1–5 use explicit topology rules; advanced levels also check simulated
 * equivalent resistance from a DC modified-nodal-analysis solver.
 */
export class CircuitValidator {
  constructor() {
    this.simulator = new ElectricalSimulator();
  }

  validate(parts, wires, level) {
    const counts = countTypes(parts);
    const countsMatch = Object.entries(level.parts).every(([type, count]) => counts[type] === count)
      && parts.every(part => Object.hasOwn(level.parts, part.type));

    if (!countsMatch) {
      return { ok: false, reason: "Component count is incorrect. Match the required parts exactly." };
    }
    if (!parts.length) return { ok: false, reason: "Add the required components before submitting." };

    const battery = parts.find(part => part.type === "Battery");
    if (!battery) return { ok: false, reason: "This challenge needs a battery." };

    const graph = buildTerminalGraph(parts, wires);
    if (!allPartsReachable(parts, wires)) {
      return { ok: false, reason: "Some components are isolated. Connect every component into the same circuit." };
    }

    if (level.topology === "series") return this.validateSeries(parts, wires, graph, battery);
    if (level.topology === "parallel-switched") return this.validateSwitchedParallel(parts, graph, battery);
    if (level.topology === "parallel") return this.validateParallel(parts, graph, battery);
    if (level.topology === "simulation") return this.validateSimulation(parts, wires, level);
    return { ok: false, reason: "This level has no validation rule configured yet." };
  }

  validateSimulation(parts, wires, level) {
    const result = this.simulator.simulate(parts, wires);
    if (!result.ok) return { ok: false, reason: result.error, simulation: result };
    if (!Number.isFinite(result.equivalentResistance)) {
      return { ok: false, reason: "No current is flowing. Check for an open path or a disconnected branch.", simulation: result };
    }
    const difference = Math.abs(result.equivalentResistance - level.targetResistance);
    if (difference > level.tolerance) {
      return {
        ok: false,
        reason: "Circuit runs, but equivalent resistance is " + result.equivalentResistance +
          " Ω. Target: about " + level.targetResistance + " Ω. Recheck your series and parallel branches.",
        simulation: result
      };
    }
    return {
      ok: true,
      reason: "Correct! Equivalent resistance: " + result.equivalentResistance +
        " Ω · supply current: " + result.totalCurrent + " A.",
      simulation: result
    };
  }

  validateSeries(parts, wires, graph, battery) {
    if (graph.find(battery.id + ":a") === graph.find(battery.id + ":b")) {
      return { ok: false, reason: "The battery terminals are shorted together. Build a loop through the components instead." };
    }
    const terminalUse = countTerminalConnections(parts, wires);
    const everyTerminalUsedOnce = parts.every(part =>
      terminalUse.get(part.id + ":a") === 1 && terminalUse.get(part.id + ":b") === 1
    );
    if (!everyTerminalUsedOnce || wires.length !== parts.length) {
      return {
        ok: false,
        reason: "The series loop is incomplete or has a branch. Connect one wire to each terminal of every component, making one continuous loop."
      };
    }
    return { ok: true, reason: "Correct: every component is in one closed series loop." };
  }

  validateParallel(parts, graph, battery) {
    const batteryA = graph.find(battery.id + ":a");
    const batteryB = graph.find(battery.id + ":b");
    if (batteryA === batteryB) {
      return { ok: false, reason: "The battery is shorted. Keep its positive and negative supply nodes separate." };
    }
    const lamps = parts.filter(part => part.type === "Lamp");
    const lampsShareTwoNodes = lamps.every(lamp => {
      const a = graph.find(lamp.id + ":a");
      const b = graph.find(lamp.id + ":b");
      return (a === batteryA && b === batteryB) || (a === batteryB && b === batteryA);
    });
    return lampsShareTwoNodes
      ? { ok: true, reason: "Correct: each lamp is connected across the same two battery nodes." }
      : { ok: false, reason: "Not parallel yet. Connect every lamp across the same two battery nodes, with separate branches." };
  }

  validateSwitchedParallel(parts, graph, battery) {
    const switchPart = parts.find(part => part.type === "Switch");
    const lamps = parts.filter(part => part.type === "Lamp");
    if (!switchPart || lamps.length < 2) {
      return { ok: false, reason: "This level needs one switch and at least two lamps." };
    }
    const batteryA = graph.find(battery.id + ":a");
    const batteryB = graph.find(battery.id + ":b");
    const switchA = graph.find(switchPart.id + ":a");
    const switchB = graph.find(switchPart.id + ":b");
    const lampNodes = lamps.map(lamp => [
      graph.find(lamp.id + ":a"),
      graph.find(lamp.id + ":b")
    ]);
    const firstRail = lampNodes[0][0];
    const secondRail = lampNodes[0][1];
    const lampsShareRails = firstRail !== secondRail && lampNodes.every(([a, b]) =>
      (a === firstRail && b === secondRail) || (a === secondRail && b === firstRail)
    );
    const switchConnectsSupplyToRail =
      (switchA === batteryA && switchB === firstRail && batteryB === secondRail) ||
      (switchB === batteryA && switchA === firstRail && batteryB === secondRail) ||
      (switchA === batteryB && switchB === firstRail && batteryA === secondRail) ||
      (switchB === batteryB && switchA === firstRail && batteryA === secondRail);
    if (!lampsShareRails) {
      return { ok: false, reason: "Put each lamp on its own parallel branch between the same two rails." };
    }
    if (!switchConnectsSupplyToRail) {
      return { ok: false, reason: "Place the switch in the shared supply path: one terminal to a battery terminal, the other to the lamp rail. The other rail returns to the opposite battery terminal." };
    }
    return { ok: true, reason: "Correct: the switch is in the shared supply path and the lamps are in parallel." };
  }
}

function countTypes(parts) {
  return parts.reduce((counts, part) => {
    counts[part.type] = (counts[part.type] || 0) + 1;
    return counts;
  }, {});
}

function countTerminalConnections(parts, wires) {
  const counts = new Map();
  for (const part of parts) {
    counts.set(part.id + ":a", 0);
    counts.set(part.id + ":b", 0);
  }
  for (const wire of wires) {
    const a = wire.a.id + ":" + wire.a.side;
    const b = wire.b.id + ":" + wire.b.side;
    counts.set(a, (counts.get(a) || 0) + 1);
    counts.set(b, (counts.get(b) || 0) + 1);
  }
  return counts;
}

function buildTerminalGraph(parts, wires) {
  const parent = new Map();
  for (const part of parts) {
    parent.set(part.id + ":a", part.id + ":a");
    parent.set(part.id + ":b", part.id + ":b");
  }
  const find = value => {
    const current = parent.get(value);
    if (current === undefined) return null;
    if (current === value) return value;
    const root = find(current);
    parent.set(value, root);
    return root;
  };
  for (const wire of wires) {
    const left = wire.a.id + ":" + wire.a.side;
    const right = wire.b.id + ":" + wire.b.side;
    const rootLeft = find(left);
    const rootRight = find(right);
    if (rootLeft !== null && rootRight !== null && rootLeft !== rootRight) parent.set(rootRight, rootLeft);
  }
  return { find };
}

function allPartsReachable(parts, wires) {
  if (!parts.length) return false;
  const reached = new Set([parts[0].id]);
  const queue = [parts[0].id];
  while (queue.length) {
    const current = queue.shift();
    for (const wire of wires) {
      let next = null;
      if (wire.a.id === current) next = wire.b.id;
      else if (wire.b.id === current) next = wire.a.id;
      if (next !== null && !reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }
  return reached.size === parts.length;
}
