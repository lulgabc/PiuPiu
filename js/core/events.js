const bus = new EventTarget();
const listeners = new Map(); // eventName -> Map<originalFn, wrapperFn>

function emit(name, detail) {
  const event =
    typeof CustomEvent === "function"
      ? new CustomEvent(name, { detail })
      : Object.assign(new Event(name), { detail });
  bus.dispatchEvent(event);
}

function off(name, fn) {
  const map = listeners.get(name);
  if (!map) return;
  const wrapper = map.get(fn);
  if (!wrapper) return;
  bus.removeEventListener(name, wrapper);
  map.delete(fn);
  if (map.size === 0) listeners.delete(name);
}

function on(name, fn) {
  if (typeof fn !== "function") return () => {};
  off(name, fn);
  const wrapper = (event) => fn(event.detail, event);
  let map = listeners.get(name);
  if (!map) {
    map = new Map();
    listeners.set(name, map);
  }
  map.set(fn, wrapper);
  bus.addEventListener(name, wrapper);
  return () => off(name, fn);
}

function once(name, fn) {
  if (typeof fn !== "function") return () => {};
  off(name, fn);
  const wrapper = (event) => {
    off(name, fn);
    fn(event.detail, event);
  };
  let map = listeners.get(name);
  if (!map) {
    map = new Map();
    listeners.set(name, map);
  }
  map.set(fn, wrapper);
  bus.addEventListener(name, wrapper);
  return () => off(name, fn);
}

export const events = { on, off, once, emit };
