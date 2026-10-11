/**
 * DC simulator for ideal wires, resistive loads, switches, and ideal batteries.
 *
 * Uses modified nodal analysis (MNA). Component terminals are electrical nodes
 * joined by wires; components connect those nodes through resistance or voltage
 * sources. This is a learning model, not a SPICE replacement.
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
        if (part.type === "Battery") {
          return { ok: false, error: "A battery is short-circuited. Separate its terminals." };
        }
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
        if (resistance === Infinity) continue;
        stampConductance(a, b, 1 / Math.max(resistance, 0.001));
      }
    }

    const solution = solveLinearSystem(matrix, rhs);
    if (!solution) {
      return { ok: false, error: "The circuit has no stable DC solution. Check for floating branches or conflicting ideal sources." };
    }

    const voltageAt = node => node === reference ? 0 : solution[nodeIndex.get(node)];
    const results = {};
    let totalSourceCurrent = 0;
    for (const part of components) {
      const a = model.terminalNode.get(part.id + ":a");
      const b = model.terminalNode.get(part.id + ":b");
      const voltage = voltageAt(a) - voltageAt(b);
      let current;
      if (part.type === "Battery") {
        current = solution[sourceIndex.get(part.id)];
        totalSourceCurrent += Math.abs(current);
      } else {
        const resistance = resistanceFor(part);
        current = resistance === Infinity ? 0 : voltage / Math.max(resistance, 0.001);
      }
      results[part.id] = {
        type: part.type,
        voltage: round(Math.abs(voltage), 3),
        current: round(Math.abs(current), 4),
        power: round(Math.abs(voltage * current), 4),
        resistance: resistanceFor(part)
      };
    }

    const batteries = sources;
    const supplyVoltage = batteries.length ? Number(batteries[0].voltage ?? batteryVoltage) : batteryVoltage;
    const sourceCurrent = batteries.length ? Math.abs(solution[sourceIndex.get(batteries[0].id)]) : 0;
    return {
      ok: true,
      nodeVoltages: Object.fromEntries(nodes.map(node => [node, round(voltageAt(node), 3)])),
      components: results,
      supplyVoltage: round(supplyVoltage, 3),
      totalCurrent: round(sourceCurrent, 4),
      equivalentResistance: sourceCurrent > 1e-9 ? round(supplyVoltage / sourceCurrent, 3) : Infinity,
      totalPower: round(supplyVoltage * sourceCurrent, 4)
    };
  }
}

function resistanceFor(part) {
  if (part.type === "Battery") return 0;
  if (part.type === "Switch") return part.closed === false ? Infinity : 0.01;
  if (part.type === "Lamp") return Number(part.resistance ?? 20);
  if (part.type === "Resistor") return Number(part.resistance ?? 100);
  if (part.type === "Buzzer") return Number(part.resistance ?? 40);
  if (part.type === "Ammeter") return 0.01;
  if (part.type === "Voltmeter") return 1e6;
  return Infinity;
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
  if (!parts.some(part => part.type === "Battery")) {
    return { error: "Add at least one battery before running the simulation." };
  }
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
