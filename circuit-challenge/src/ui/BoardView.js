import { COMPONENTS } from "../config/levels.js";

/** DOM view for placing parts and selecting terminal-to-terminal wires. */
export class BoardView {
  constructor({ board, svg, store, onStatus }) {
    this.board = board;
    this.svg = svg;
    this.store = store;
    this.onStatus = onStatus;
    this.mode = "select";
    this.pendingTerminal = null;
    this.elements = new Map();
    this.drag = null;
    this.unsubscribe = store.subscribe(() => this.render());
    this.resizeObserver = new ResizeObserver(() => this.renderWires());
    this.resizeObserver.observe(board);
  }

  setMode(mode) {
    this.mode = mode;
    this.pendingTerminal = null;
    this.board.querySelectorAll(".terminal.active").forEach(node => node.classList.remove("active"));
  }

  destroy() {
    this.unsubscribe();
    this.resizeObserver.disconnect();
  }

  render() {
    const activeIds = new Set(this.store.parts.map(part => part.id));
    for (const [id, element] of this.elements) {
      if (!activeIds.has(id)) {
        element.remove();
        this.elements.delete(id);
      }
    }

    for (const part of this.store.parts) {
      let element = this.elements.get(part.id);
      if (!element) {
        element = this.createPartElement(part);
        this.elements.set(part.id, element);
        this.board.appendChild(element);
      }
      element.style.left = part.x + "px";
      element.style.top = part.y + "px";
      this.syncPartState(element, part);
    }
    this.renderWires();
  }

  createPartElement(part) {
    const element = document.createElement("div");
    element.className = "part";
    element.dataset.id = String(part.id);
    element.innerHTML =
      '<div class="part-label"></div><div class="symbol"></div>' +
      '<div class="terminals">' +
      '<button class="terminal" data-side="a" aria-label="Terminal A"></button>' +
      '<button class="terminal" data-side="b" aria-label="Terminal B"></button></div>' +
      (part.type === "Switch" ? '<button class="switch-toggle" type="button"></button>' : '');
    element.querySelector(".part-label").textContent = part.type;
    element.querySelector(".symbol").textContent = COMPONENTS[part.type]?.symbol || "●";
    this.syncPartState(element, part);
    if (part.type === "Switch") {
      element.querySelector(".switch-toggle").addEventListener("click", event => {
        event.stopPropagation();
        this.store.setPartProperty(part.id, "closed", part.closed === false);
        this.onStatus(part.closed === false ? "Switch closed." : "Switch opened.");
      });
    }

    element.addEventListener("pointerdown", event => {
      if (event.target.closest(".terminal") || this.mode !== "select") return;
      this.drag = {
        id: part.id,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: part.x,
        originY: part.y
      };
      element.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    element.addEventListener("pointermove", event => {
      if (!this.drag || this.drag.id !== part.id || this.drag.pointerId !== event.pointerId) return;
      const x = clamp(this.drag.originX + event.clientX - this.drag.startX, 0, this.board.clientWidth - element.offsetWidth);
      const y = clamp(this.drag.originY + event.clientY - this.drag.startY, 0, this.board.clientHeight - element.offsetHeight);
      this.store.movePart(part.id, x, y);
    });
    element.addEventListener("pointerup", () => { this.drag = null; });
    element.addEventListener("pointercancel", () => { this.drag = null; });

    element.querySelectorAll(".terminal").forEach(button => {
      button.addEventListener("click", event => {
        event.stopPropagation();
        this.handleTerminal(part.id, button.dataset.side, button);
      });
    });
    return element;
  }

  syncPartState(element, part) {
    element.classList.toggle("lamp-on", part.type === "Lamp" && (part.current || 0) > 0.005);
    const toggle = element.querySelector(".switch-toggle");
    if (toggle) {
      toggle.textContent = part.closed === false ? "OPEN" : "CLOSED";
      toggle.setAttribute("aria-label", part.closed === false ? "Close switch" : "Open switch");
      toggle.classList.toggle("is-open", part.closed === false);
    }
    if (part.type === "Lamp") {
      const reading = part.current ? " · " + part.current + " A" : "";
      element.title = "Lamp" + reading;
    }
  }

  handleTerminal(id, side, button) {
    if (this.mode !== "wire") {
      this.onStatus("Choose Wire mode before connecting terminals.", true);
      return;
    }
    const terminal = { id, side };
    if (!this.pendingTerminal) {
      this.pendingTerminal = terminal;
      button.classList.add("active");
      this.onStatus("Terminal selected. Now tap a terminal on another component.");
      return;
    }

    const result = this.store.connect(this.pendingTerminal, terminal);
    this.pendingTerminal = null;
    this.board.querySelectorAll(".terminal.active").forEach(node => node.classList.remove("active"));
    this.onStatus(result.ok ? "Wire connected." : result.reason, !result.ok);
  }

  terminalCenter(id, side) {
    const element = this.elements.get(id)?.querySelector('[data-side="' + side + '"]');
    if (!element) return { x: 0, y: 0 };
    const terminalRect = element.getBoundingClientRect();
    const boardRect = this.board.getBoundingClientRect();
    return {
      x: terminalRect.left + terminalRect.width / 2 - boardRect.left,
      y: terminalRect.top + terminalRect.height / 2 - boardRect.top
    };
  }

  renderWires() {
    this.svg.setAttribute("viewBox", "0 0 " + this.board.clientWidth + " " + this.board.clientHeight);
    this.svg.innerHTML = "";
    for (const wire of this.store.wires) {
      const a = this.terminalCenter(wire.a.id, wire.a.side);
      const b = this.terminalCenter(wire.b.id, wire.b.side);
      const middleX = (a.x + b.x) / 2;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "wire");
      path.setAttribute("d", "M " + a.x + " " + a.y + " L " + middleX + " " + a.y + " L " + middleX + " " + b.y + " L " + b.x + " " + b.y);
      this.svg.appendChild(path);
    }
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
