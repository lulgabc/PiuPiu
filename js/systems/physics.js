import { state, els } from "../core/state.js";
import { ensureMatterLoaded } from "../core/loader.js";

let physicsEpoch = 0;
let pendingPhysics = null;

function getMatter() {
  const g = typeof window !== "undefined" ? window : globalThis;
  return g && g.Matter && g.Matter.Engine ? g.Matter : null;
}

function createPhysicsEngine(Matter, fieldW, fieldH) {
  const engine = Matter.Engine.create({ enableSleeping: true });
  engine.gravity.y = 1;
  engine.positionIterations = 10;
  engine.velocityIterations = 8;
  engine.constraintIterations = 2;
  state.physics = { engine, walls: [] };
  rebuildPhysicsWalls(fieldW, fieldH);
  return state.physics;
}

export async function ensurePhysics() {
  if (!els.field) return null;
  if (state.physics) return state.physics;
  const fieldW = els.field.clientWidth;
  const fieldH = els.field.clientHeight;
  if (!fieldW || !fieldH) return null;

  const existing = getMatter();
  if (existing) return createPhysicsEngine(existing, fieldW, fieldH);

  if (pendingPhysics) return pendingPhysics;
  const epoch = physicsEpoch;
  pendingPhysics = (async () => {
    let Matter = null;
    try {
      Matter = await ensureMatterLoaded();
    } catch {
      return null;
    }
    if (epoch !== physicsEpoch || !els.field) return null;
    if (state.physics) return state.physics;
    const w = els.field.clientWidth;
    const h = els.field.clientHeight;
    if (!w || !h) return null;
    const resolved = Matter && Matter.Engine ? Matter : getMatter();
    if (!resolved) return null;
    return createPhysicsEngine(resolved, w, h);
  })();

  try {
    return await pendingPhysics;
  } finally {
    if (epoch === physicsEpoch) pendingPhysics = null;
  }
}

export function rebuildPhysicsWalls(fieldW, fieldH) {
  const Matter = getMatter();
  const physics = state.physics;
  if (!Matter || !physics) return;
  for (const wall of physics.walls) Matter.Composite.remove(physics.engine.world, wall);
  const options = { isStatic: true, friction: 0.9, restitution: 0 };
  physics.walls = [
    Matter.Bodies.rectangle(fieldW / 2, fieldH + 40, fieldW + 200, 80, options),
    Matter.Bodies.rectangle(-40, fieldH / 2, 80, fieldH * 2, options),
    Matter.Bodies.rectangle(fieldW + 40, fieldH / 2, 80, fieldH * 2, options),
  ];
  for (const wall of physics.walls) Matter.Composite.add(physics.engine.world, wall);
}

export function destroyPhysics() {
  physicsEpoch += 1;
  pendingPhysics = null;
  const Matter = getMatter();
  if (state.physics && Matter) {
    Matter.Composite.clear(state.physics.engine.world, false);
    Matter.Engine.clear(state.physics.engine);
  }
  state.physics = null;
  for (const settled of state.settled) {
    if (settled && settled.body) settled.body = null;
  }
}

export function wakePhysicsPile() {
  const Matter = getMatter();
  if (!state.physics || !Matter || !Matter.Sleeping) return;
  for (const settled of state.settled) {
    if (settled && settled.body) Matter.Sleeping.set(settled.body, false);
  }
}

function attachBodySync(Matter, physics, settled) {
  settled.baseW = settled.w;
  settled.baseH = settled.h;
  const body = Matter.Bodies.rectangle(
    settled.x + settled.w / 2,
    settled.y + settled.h / 2,
    settled.w,
    settled.h,
    {
      restitution: 0.01,
      friction: 0.7,
      frictionStatic: 1.1,
      frictionAir: 0.015,
      density: 0.0012,
      slop: 0.04,
      chamfer: { radius: Math.min(6, settled.h / 6) },
    },
  );
  Matter.Composite.add(physics.engine.world, body);
  settled.body = body;
  wakePhysicsPile();
  syncSettledCard(settled);
}

export function attachSettledBody(settled) {
  if (!settled || settled.body || !els.field) return;
  const Matter = getMatter();
  if (state.physics && Matter) {
    attachBodySync(Matter, state.physics, settled);
    return;
  }
  ensurePhysics()
    .then((physics) => {
      const resolvedMatter = getMatter();
      if (
        !resolvedMatter ||
        !physics ||
        physics !== state.physics ||
        settled.body ||
        !state.settled.includes(settled)
      ) {
        return;
      }
      attachBodySync(resolvedMatter, physics, settled);
    })
    .catch(() => {});
}

export function syncSettledCard(settled) {
  const body = settled && settled.body;
  if (!body) return;
  const baseW = settled.baseW || settled.w;
  const baseH = settled.baseH || settled.h;
  settled.x = body.bounds.min.x;
  settled.y = body.bounds.min.y;
  settled.w = body.bounds.max.x - body.bounds.min.x;
  settled.h = body.bounds.max.y - body.bounds.min.y;
  const left = body.position.x - baseW / 2;
  const top = body.position.y - baseH / 2;
  if (settled.el && settled.el.style) {
    settled.el.style.transform = `translate3d(${left}px, ${top}px, 0) rotate(${body.angle}rad)`;
    settled.el.style.zIndex =
      settled === state.focusedWord ? "2000" : String(Math.max(1, 1000 - Math.round(body.position.y)));
  }
}

export function syncPhysicsPile() {
  if (!state.physics) return;
  for (const settled of state.settled) syncSettledCard(settled);
}

export function removeSettledBody(settled) {
  const Matter = getMatter();
  if (Matter && state.physics && settled && settled.body) {
    Matter.Composite.remove(state.physics.engine.world, settled.body);
  }
  if (settled) settled.body = null;
}

export function stepPhysics(deltaMs = 1000 / 60) {
  const Matter = getMatter();
  if (!Matter || !state.physics || !state.settled.length) return false;
  Matter.Engine.update(state.physics.engine, deltaMs);
  syncPhysicsPile();
  return true;
}

export function clampPhysicsBodies(fieldW, fieldH) {
  const Matter = getMatter();
  if (!Matter || !state.physics) return;
  rebuildPhysicsWalls(fieldW, fieldH);
  for (const s of state.settled) {
    if (!s || !s.body) continue;
    const baseW = s.baseW || s.w;
    const baseH = s.baseH || s.h;
    const x = Math.min(Math.max(s.body.position.x, baseW / 2 + 1), fieldW - baseW / 2 - 1);
    const y = Math.min(Math.max(s.body.position.y, baseH / 2 + 1), fieldH - baseH / 2 - 1);
    if (x !== s.body.position.x || y !== s.body.position.y) {
      Matter.Body.setPosition(s.body, { x, y });
    }
  }
  wakePhysicsPile();
  syncPhysicsPile();
}
