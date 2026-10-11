/**
 * DC simulator using modified nodal analysis (MNA).
 * Wires merge electrical nodes; resistive components and batteries join nodes.
 * This is a simplified educational DC model, not a SPICE replacement.
 */
export class ElectricalSimulator {
  simulate(parts, wires, { batteryVoltage = 9 } = {}) {
    const model = buildNetwork(parts, wires);
    if (model.error) return { ok: false, error: model.error };

    const { nodes, components } = model;
    const reference = nodes[0];
    const unknownNodes = nodes.filter(node => node !== reference);
    const nodeIndex = new Map(unknownNodes.map((node, index) => [node, index]));
    const sources = components.filter(part => part.type === "Battery");
    const size = unknownNodes.length + sources.length;
    if (!size) return { ok: false, error: "Add a battery and at least one load." };

    const matrix = Array.from({ length: size }, () => Array(size).fill(0));
    const rhs = Array(size).fill(0);
    const sourceIndex = new Map(sources.map((part, index) => [part.id, unknownNodes.length + index]));

    const stampConductance = (a, b, conductance) => {
      if (!Number.isFinite(conductance) || conductance <= 0) return;
      const i = nodeIndex.get(a);
      const j = nodeIndex.get(b);
      if (i !== undefined) matrix[i][i] += conductance;
      if (j !== undefined) matrix[j][j] += conductance;
      if (i !== undefined && j !== undefined) {
        matrix[i][j] -= conductance;
        matrix[j][i] -= conductance;
      }
    };

    for (const part of components) {
      const a = model.terminalNode.get(part.id + ":a");
      const b = model.terminalNode.get(part.id + ":b");
      if (a === b) {
        if (part.type === "Battery") return { ok: false, error: "A battery is short-circuited. Separate its terminals." };
        continue;
      }
      if (part.type === "Battery") {
        const k = sourceIndex.get(part.id);
        const ia = nodeIndex.get(a);
        const ib = nodeIndex.get(b);
        if (ia !== undefined) { matrix[ia][k] += 1; matrix[k][ia] += 1; }
        if (ib !== undefined) { matrix[ib][k] -= 1; matrix[k][ib] -= 1; }
        rhs[k] = Number(part.voltage ?? batteryVoltage);
      } else {
        const resistance = resistanceFor(part);
        stampConductance(a, b, 1 / resistance);
      }
    }

    const solution = solveLinearSystem(matrix, rhs);
    if (!solution) {
      return { ok: false, error: "The circuit has no stable DC solution. Check floating branches, shorts, or conflicting batteries." };
    }

    const voltageAt = node => node === reference ? 0 : solution[nodeIndex.get(node)];
    const readings = {};
    for (const part of components) {
      const a = model.terminalNode.get(part.id + ":a");
      const b = model.terminalNode.get(part.id + ":b");
      const signedVoltage = voltageAt(a) - voltageAt(b);
      const resistance = resistanceFor(part);
      const current = part.type === "Battery"
        ? solution[sourceIndex.get(part.id)]
        : signedVoltage / resistance;
      readings[part.id] = {
        type: part.type,
        voltage: round(Math.abs(signedVoltage), 3),
        current: round(Math.abs(current), 4),
        power: round(Math.abs(signedVoltage * current), 4),
        resistance,
        closed: part.type === "Switch" ? part.closed !== false : undefined
      };
    }

    const battery = sources[0];
    const supplyVoltage = Number(battery.voltage ?? batteryVoltage);
    const sourceCurrent = Math.abs(solution[sourceIndex.get(battery.id)]);
    return {
      ok: true,
      nodeVoltages: Object.fromEntries(nodes.map(node => [node, round(voltageAt(node), 3)])),
      components: readings,
      supplyVoltage: round(supplyVoltage, 3),
      totalCurrent: round(sourceCurrent, 4),
      equivalentResistance: sourceCurrent > 1e-9 ? round(supplyVoltage / sourceCurrent, 3) : Infinity,
      totalPower: round(supplyVoltage * sourceCurrent, 4)
    };
  }
}

function resistanceFor(part) {
  if (part.type === "Battery") return 1e-9;
  if (part.type === "Switch") return part.closed === false ? 1e9 : 0.01;
  if (part.type === "Lamp") return Number(part.resistance ?? 20);
  if (part.type === "Resistor") return Number(part.resistance ?? 100);
  if (part.type === "Buzzer") return Number(part.resistance ?? 40);
  if (part.type === "Ammeter") return 0.01;
  if (part.type === "Voltmeter") return 1e6;
  return 1e12;
}

function buildNetwork(parts, wires) {
  const parent = new Map();
  for (const part of parts) {
    parent.set(part.id + ":a", part.id + ":a");
    parent.set(part.id + ":b", part.id + ":b");
  }
  const find = key => {
    const root = parent.get(key);
    if (root === undefined) return null;
    if (root === key) return key;
    const resolved = find(root);
    parent.set(key, resolved);
    return resolved;
  };
  for (const wire of wires) {
    const left = wire.a.id + ":" + wire.a.side;
    const right = wire.b.id + ":" + wire.b.side;
    if (!parent.has(left) || !parent.has(right)) continue;
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(b, a);
  }
  const terminalNode = new Map();
  for (const key of parent.keys()) terminalNode.set(key, find(key));
  const nodes = [...new Set(terminalNode.values())];
  if (!parts.some(part => part.type === "Battery")) return { error: "Add at least one battery before running the simulation." };
  return { nodes, terminalNode, components: parts };
}

function solveLinearSystem(matrix, rhs) {
  const n = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i]]);
  for (let column = 0; column < n; column++) {
    let pivot = column;
    for (let row = column + 1; row < n; row++) {
      if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row;
    }
    if (Math.abs(a[pivot][column]) < 1e-10) return null;
    [a[column], a[pivot]] = [a[pivot], a[column]];
    const divisor = a[column][column];
    for (let j = column; j <= n; j++) a[column][j] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === column) continue;
      const factor = a[row][column];
      if (Math.abs(factor) < 1e-12) continue;
      for (let j = column; j <= n; j++) a[row][j] -= factor * a[column][j];
    }
  }
  return a.map(row => row[n]);
}

function round(value, digits) {
  if (!Number.isFinite(value)) return value;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}
