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
    const topology = verifyAdvancedTopology(parts, wires, level);
    if (!topology.ok) return topology;
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
    if (switchPart.closed === false) {
      return { ok: false, reason: "Close the switch to complete this powered parallel-circuit challenge." };
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


/**
 * Exact node-pattern checks for the five advanced puzzles. Wires merge terminal
 * nodes; components remain edges between those nodes. Resistance alone is not
 * accepted as proof of the intended arrangement.
 */
function verifyAdvancedTopology(parts, wires, level) {
  const parent = new Map();
  for (const part of parts) {
    parent.set(part.id + ":a", part.id + ":a");
    parent.set(part.id + ":b", part.id + ":b");
  }
  const find = key => {
    const root = parent.get(key);
    if (root === key) return key;
    const resolved = find(root);
    parent.set(key, resolved);
    return resolved;
  };
  for (const wire of wires) {
    const a = wire.a.id + ":" + wire.a.side;
    const b = wire.b.id + ":" + wire.b.side;
    if (parent.has(a) && parent.has(b)) parent.set(find(b), find(a));
  }
  const node = part => [find(part.id + ":a"), find(part.id + ":b")];
  const battery = parts.find(part => part.type === "Battery");
  const [supplyA, supplyB] = node(battery);
  if (supplyA === supplyB) return { ok: false, reason: "The battery terminals are shorted." };
  const lamps = parts.filter(part => part.type === "Lamp");
  const resistors = parts.filter(part => part.type === "Resistor");
  const switches = parts.filter(part => part.type === "Switch");
  const between = (part, a, b) => {
    const [x, y] = node(part);
    return (x === a && y === b) || (x === b && y === a);
  };
  const seriesPairBetweenRails = (pair, railA, railB) => {
    const [a1, a2] = node(pair[0]);
    const [b1, b2] = node(pair[1]);
    return (
      (a1 === railA && b2 === railB && a2 === b1 && a2 !== railA && a2 !== railB) ||
      (a1 === railA && b1 === railB && a2 === b2 && a2 !== railA && a2 !== railB) ||
      (a2 === railA && b1 === railB && a1 === b2 && a1 !== railA && a1 !== railB) ||
      (a2 === railA && b2 === railB && a1 === b1 && a1 !== railA && a1 !== railB)
    );
  };

  if (level.number === 6 || level.title?.startsWith("Level 6")) {
    const directLamp = lamps.filter(lamp => between(lamp, supplyA, supplyB));
    const remaining = lamps.filter(lamp => !directLamp.includes(lamp));
    if (directLamp.length === 1 && remaining.length === 2 && seriesPairBetweenRails(remaining, supplyA, supplyB)) {
      return { ok: true };
    }
    return { ok: false, reason: "Topology mismatch: one lamp must be directly across the battery, while the other two form a series pair across the same rails." };
  }

  if (level.title?.startsWith("Level 7")) {
    if (resistors.length !== 1) return { ok: false, reason: "This level requires exactly one series resistor." };
    const [rA, rB] = node(resistors[0]);
    const orientations = [[rA, rB], [rB, rA]];
    const valid = orientations.some(([sourceNode, branchNode]) =>
      sourceNode === supplyA &&
      lamps.every(lamp => between(lamp, branchNode, supplyB))
    ) || orientations.some(([sourceNode, branchNode]) =>
      sourceNode === supplyB &&
      lamps.every(lamp => between(lamp, branchNode, supplyA))
    );
    if (valid) return { ok: true };
    return { ok: false, reason: "Topology mismatch: the resistor must sit between one battery terminal and the shared rail of both parallel lamps." };
  }

  if (level.title?.startsWith("Level 8")) {
    if (lamps.every(lamp => between(lamp, supplyA, supplyB))) return { ok: true };
    return { ok: false, reason: "Topology mismatch: all three lamps must each connect directly across the same two battery rails." };
  }

  if (level.title?.startsWith("Level 9")) {
    const elements = [...switches, ...lamps];
    if (switches.length !== 1 || switches[0].closed === false) {
      return { ok: false, reason: "Close the single switch; this level requires a closed series loop." };
    }
    const edges = elements.map(part => ({ part, ends: node(part) }));
    const pathWalk = (current, target, used, visitedNodes) => {
      if (current === target) return used.length === edges.length;
      for (let i = 0; i < edges.length; i++) {
        if (used.includes(i)) continue;
        const [a, b] = edges[i].ends;
        const next = a === current ? b : b === current ? a : null;
        if (next === null || visitedNodes.has(next)) continue;
        const nextUsed = [...used, i];
        if (pathWalk(next, target, nextUsed, new Set([...visitedNodes, next]))) return true;
      }
      return false;
    };
    if (pathWalk(supplyA, supplyB, [], new Set([supplyA]))) return { ok: true };
    return { ok: false, reason: "Topology mismatch: the closed switch and both lamps must form one series path between battery terminals." };
  }

  if (level.title?.startsWith("Level 10")) {
    const candidates = lamps.filter(lamp => between(lamp, supplyA, supplyB));
    if (candidates.length) return { ok: false, reason: "Topology mismatch: no single lamp should span the full battery rails. Build two branches with two lamps in series per branch." };
    const allPaths = [];
    const edges = lamps.map(part => ({ part, ends: node(part) }));
    const walk = (current, target, used, visited) => {
      if (current === target) {
        if (used.length) allPaths.push(used);
        return;
      }
      for (let i = 0; i < edges.length; i++) {
        if (used.includes(i)) continue;
        const [a, b] = edges[i].ends;
        const next = a === current ? b : b === current ? a : null;
        if (next === null || visited.has(next)) continue;
        walk(next, target, [...used, i], new Set([...visited, next]));
      }
    };
    walk(supplyA, supplyB, [], new Set([supplyA]));
    const paths = allPaths.filter(path => path.length === 2);
    if (paths.some((path, i) => paths.some((other, j) => j > i && path.length === 2 && other.length === 2 && path.every(index => !other.includes(index))))) {
      return { ok: true };
    }
    return { ok: false, reason: "Topology mismatch: connect the four lamps as two independent two-lamp series paths across the battery." };
  }

  return { ok: false, reason: "No exact topology rule exists for this advanced level yet." };
}
