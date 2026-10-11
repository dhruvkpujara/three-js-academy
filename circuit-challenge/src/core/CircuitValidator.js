/** Graph-based checks are isolated from DOM and rendering code. */
export class CircuitValidator {
  validate(parts, wires, level) {
    const counts = countTypes(parts);
    const countsMatch = Object.entries(level.parts).every(([type, count]) => counts[type] === count)
      && parts.every(part => Object.hasOwn(level.parts, part.type));

    if (!countsMatch) {
      return { ok: false, reason: "Component types or counts do not match this challenge." };
    }
    if (!parts.length) return { ok: false, reason: "Add the required components first." };

    const battery = parts.find(part => part.type === "Battery");
    if (!battery) return { ok: false, reason: "Add a battery." };

    const graph = buildTerminalGraph(parts, wires);
    if (!allPartsReachable(parts, wires)) {
      return { ok: false, reason: "Some components are isolated. Connect every component into one network." };
    }

    const result = level.topology === "parallel"
      ? this.validateParallel(parts, graph, battery)
      : this.validateSeries(parts, wires, battery, level);

    return result;
  }

  validateParallel(parts, graph, battery) {
    const batteryA = graph.find(battery.id + ":a");
    const batteryB = graph.find(battery.id + ":b");
    const lamps = parts.filter(part => part.type === "Lamp");

    const lampsAcrossSupply = lamps.every(lamp => {
      const a = graph.find(lamp.id + ":a");
      const b = graph.find(lamp.id + ":b");
      return (a === batteryA && b === batteryB) || (a === batteryB && b === batteryA);
    });

    return lampsAcrossSupply
      ? { ok: true, reason: "Parallel branches are connected across the supply nodes." }
      : { ok: false, reason: "Each lamp must connect across the same two battery nodes on its own branch." };
  }

  validateSeries(parts, wires, battery, level) {
    if (wires.length < parts.length) {
      return { ok: false, reason: "Finish the closed loop and connect the circuit back to the battery." };
    }

    // Each component must participate in the single connected path. A shorted
    // battery is never accepted as a valid series circuit.
    const graph = buildTerminalGraph(parts, wires);
    if (graph.find(battery.id + ":a") === graph.find(battery.id + ":b")) {
      return { ok: false, reason: "The battery terminals are shorted together. Rewire the series path." };
    }

    const degree = new Map(parts.map(part => [part.id, 0]));
    for (const wire of wires) {
      degree.set(wire.a.id, (degree.get(wire.a.id) || 0) + 1);
      degree.set(wire.b.id, (degree.get(wire.b.id) || 0) + 1);
    }
    if (parts.some(part => degree.get(part.id) < 2)) {
      return { ok: false, reason: "The series loop is incomplete. Each component needs both ends connected." };
    }

    return { ok: true, reason: "Closed series loop detected." };
  }
}

function countTypes(parts) {
  return parts.reduce((counts, part) => {
    counts[part.type] = (counts[part.type] || 0) + 1;
    return counts;
  }, {});
}

function buildTerminalGraph(parts, wires) {
  const parent = new Map();
  for (const part of parts) {
    parent.set(part.id + ":a", part.id + ":a");
    parent.set(part.id + ":b", part.id + ":b");
  }
  const find = value => {
    const current = parent.get(value);
    if (current === value) return value;
    const root = find(current);
    parent.set(value, root);
    return root;
  };
  const union = (left, right) => {
    const rootLeft = find(left);
    const rootRight = find(right);
    if (rootLeft !== rootRight) parent.set(rootRight, rootLeft);
  };
  for (const wire of wires) union(wire.a.id + ":" + wire.a.side, wire.b.id + ":" + wire.b.side);
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
      if (wire.b.id === current) next = wire.a.id;
      if (next !== null && !reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }
  return reached.size === parts.length;
}
