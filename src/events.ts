type Listener = () => void;

const listeners: Record<string, Listener[]> = {};

export function on(event: string, fn: Listener): void {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(fn);
}

export function off(event: string, fn: Listener): void {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter(f => f !== fn);
}

export function emit(event: string): void {
  if (!listeners[event]) return;
  listeners[event].forEach(fn => fn());
}
