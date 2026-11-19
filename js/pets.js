/* PiuPiu — the pet warehouse.
 *
 * Every pet is a sticker-like emoji friend with its own silhouette, pace,
 * jumping style and synthesized voice. A player can bring one to three of
 * them into the game; the definitions here are shared by the profile store,
 * the warehouse screen and the in-game pet engine.
 */

(function (global) {
  "use strict";

  const MAX_PETS = 3;
  const DEFAULT_PETS = ["mouse"];

  // w/h shape the sticker badge and the pet's footprint. speed is in px/s,
  // hop is the jump impulse, pause/hopEvery are idle timings in seconds.
  const PETS = [
    {
      id: "mouse",
      emoji: "🐭",
      w: 46,
      h: 46,
      speed: 58,
      hop: 170,
      pause: [0.65, 2.1],
      hopEvery: [2.4, 5.2],
      chatter: 0.2,
      trait: "fast",
      shape: "round",
      say: "pet.say.mouse",
    },
    {
      id: "cat",
      emoji: "🐱",
      w: 48,
      h: 48,
      speed: 60,
      hop: 155,
      pause: [1.2, 3.2],
      hopEvery: [3.0, 6.0],
      chatter: 0.12,
      trait: "calm",
      shape: "round",
      say: "pet.say.cat",
    },
    {
      id: "dog",
      emoji: "🐶",
      w: 50,
      h: 50,
      speed: 72,
      hop: 150,
      pause: [0.45, 1.6],
      hopEvery: [2.0, 4.0],
      chatter: 0.3,
      trait: "chatty",
      shape: "round",
      say: "pet.say.dog",
    },
    {
      id: "rabbit",
      emoji: "🐰",
      w: 44,
      h: 54,
      speed: 78,
      hop: 220,
      pause: [0.35, 1.1],
      hopEvery: [1.2, 2.6],
      chatter: 0.1,
      trait: "jumper",
      shape: "tall",
      say: "pet.say.rabbit",
    },
    {
      id: "frog",
      emoji: "🐸",
      w: 52,
      h: 44,
      speed: 46,
      hop: 250,
      pause: [1.0, 2.6],
      hopEvery: [1.6, 3.4],
      chatter: 0.18,
      trait: "jumper",
      shape: "wide",
      say: "pet.say.frog",
    },
    {
      id: "panda",
      emoji: "🐼",
      w: 56,
      h: 52,
      speed: 34,
      hop: 110,
      pause: [1.6, 3.4],
      hopEvery: [3.6, 6.5],
      chatter: 0.08,
      trait: "calm",
      shape: "chunky",
      say: "pet.say.panda",
    },
    {
      id: "fox",
      emoji: "🦊",
      w: 48,
      h: 48,
      speed: 70,
      hop: 180,
      pause: [0.5, 1.8],
      hopEvery: [2.0, 4.2],
      chatter: 0.22,
      trait: "fast",
      shape: "pointy",
      say: "pet.say.fox",
    },
    {
      id: "penguin",
      emoji: "🐧",
      w: 46,
      h: 52,
      speed: 38,
      hop: 100,
      pause: [1.2, 2.8],
      hopEvery: [3.2, 6.0],
      chatter: 0.16,
      trait: "calm",
      shape: "tall",
      say: "pet.say.penguin",
    },
    {
      id: "chick",
      emoji: "🐤",
      w: 38,
      h: 40,
      speed: 68,
      hop: 145,
      pause: [0.4, 1.5],
      hopEvery: [1.6, 3.0],
      chatter: 0.34,
      trait: "chatty",
      shape: "tiny",
      say: "pet.say.chick",
    },
    {
      id: "unicorn",
      emoji: "🦄",
      w: 48,
      h: 54,
      speed: 62,
      hop: 195,
      pause: [0.7, 2.2],
      hopEvery: [2.0, 4.0],
      chatter: 0.1,
      trait: "jumper",
      shape: "tall",
      say: "pet.say.unicorn",
    },
    {
      id: "turtle",
      emoji: "🐢",
      w: 50,
      h: 42,
      speed: 24,
      hop: 70,
      pause: [2.0, 4.5],
      hopEvery: [5.0, 9.0],
      chatter: 0.06,
      trait: "slow",
      shape: "wide",
      say: "pet.say.turtle",
    },
    {
      id: "lion",
      emoji: "🦁",
      w: 54,
      h: 50,
      speed: 50,
      hop: 135,
      pause: [1.2, 3.0],
      hopEvery: [3.0, 6.0],
      chatter: 0.14,
      trait: "calm",
      shape: "chunky",
      say: "pet.say.lion",
    },
  ];

  const BY_ID = Object.create(null);
  for (const pet of PETS) BY_ID[pet.id] = pet;

  const PET_IDS = PETS.map((pet) => pet.id);

  function byId(id) {
    return BY_ID[id] || null;
  }

  function sanitize(list) {
    const out = [];
    if (Array.isArray(list)) {
      for (const entry of list) {
        const id = typeof entry === "string" ? entry : entry && entry.id;
        if (BY_ID[id] && !out.includes(id)) out.push(id);
        if (out.length >= MAX_PETS) break;
      }
    }
    return out.length ? out : DEFAULT_PETS.slice();
  }

  const api = {
    MAX_PETS,
    DEFAULT_PETS,
    PETS,
    PET_IDS,
    byId,
    sanitize,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.PiuPets = api;
})(typeof window !== "undefined" ? window : globalThis);
