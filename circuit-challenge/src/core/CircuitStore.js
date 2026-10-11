/** Small observable state model; views subscribe instead of owning circuit data. */
export class CircuitStore {
  constructor() {
    this.parts = [];
    this.wires = [];
    this.listeners = new Set();
    this.nextId = 1;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) listener(this);
  }

  addPart(type, x, y) {
    const part = { id: this.nextId++, type, x, y };
    this.parts.push(part);
    this.notify();
    return part;
  }

  movePart(id, x, y) {
    const part = this.parts.find(item => item.id === id);
    if (!part) return;
    part.x = x;
    part.y = y;
    this.notify();
  }

  connect(a, b) {
    if (a.id === b.id) return { ok: false, reason: "Connect two different components." };
    const exists = this.wires.some(wire =>
      (sameTerminal(wire.a, a) && sameTerminal(wire.b, b)) ||
      (sameTerminal(wire.a, b) && sameTerminal(wire.b, a))
    );
    if (exists) return { ok: false, reason: "Those terminals are already connected." };
    this.wires.push({ a: { ...a }, b: { ...b } });
    this.notify();
    return { ok: true };
  }

  undoWire() {
    if (!this.wires.length) return false;
    this.wires.pop();
    this.notify();
    return true;
  }

  clear() {
    this.parts = [];
    this.wires = [];
    this.notify();
  }

  replaceCircuit(parts, wires) {
    this.parts = parts;
    this.wires = wires;
    this.notify();
  }
}

function sameTerminal(left, right) {
  return left.id === right.id && left.side === right.side;
}
