/* PiuPiu — the pet catalog.
 *
 * Every pet is a sticker-like emoji friend with its own silhouette, pace,
 * jumping style and synthesized voice. The game draws one at random for each
 * round; players do not choose or keep a pet team.
 */

(function (global) {
  "use strict";

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
      shape: "round",
      accent: "#b7a6c9",
      tail: "thin",
      paw: "round",
      foot: "small",
      body: "#ded3f0",
      pattern: "plain",
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
      shape: "round",
      accent: "#f0a24a",
      tail: "fluffy",
      paw: "round",
      foot: "round",
      body: "#ffd9a0",
      pattern: "stripes",
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
      shape: "round",
      accent: "#d4935b",
      tail: "fluffy",
      paw: "round",
      foot: "round",
      body: "#f4d2ae",
      pattern: "spots",
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
      shape: "tall",
      accent: "#e6d5d2",
      tail: "round",
      paw: "round",
      foot: "long",
      body: "#ffe5ea",
      pattern: "plain",
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
      shape: "wide",
      accent: "#7fca64",
      tail: "none",
      paw: "webbed",
      foot: "webbed",
      body: "#c9edb4",
      pattern: "belly",
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
      shape: "chunky",
      accent: "#4b4b4b",
      tail: "tiny",
      paw: "round",
      foot: "round",
      body: "#f4efe6",
      pattern: "plain",
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
      shape: "pointy",
      accent: "#e8783d",
      tail: "fluffy",
      paw: "point",
      foot: "round",
      body: "#ffc392",
      pattern: "plain",
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
      shape: "tall",
      accent: "#f6d64a",
      tail: "tiny",
      paw: "flipper",
      foot: "webbed",
      body: "#dce8f6",
      pattern: "tuxedo",
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
      shape: "tiny",
      accent: "#f7cf4e",
      tail: "tiny",
      paw: "wing",
      foot: "small",
      body: "#ffe780",
      pattern: "plain",
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
      shape: "tall",
      accent: "#c5a4ff",
      tail: "tuft",
      paw: "round",
      foot: "round",
      body: "#e6d4ff",
      pattern: "sparkle",
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
      shape: "wide",
      accent: "#78b76b",
      tail: "tiny",
      paw: "round",
      foot: "stub",
      body: "#c6e6b3",
      pattern: "shell",
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
      shape: "chunky",
      accent: "#d99a3e",
      tail: "tuft",
      paw: "round",
      foot: "round",
      body: "#ffd787",
      pattern: "plain",
      say: "pet.say.lion",
    },
  ];

  const BY_ID = Object.create(null);
  for (const pet of PETS) BY_ID[pet.id] = pet;

  const PET_IDS = PETS.map((pet) => pet.id);

  function byId(id) {
    return BY_ID[id] || null;
  }

  // Draw one pet for the round. Passing the previous pet id avoids an
  // immediate repeat, so back-to-back games feel more varied.
  function random(excludeId) {
    const pool = excludeId && PETS.length > 1 ? PETS.filter((pet) => pet.id !== excludeId) : PETS;
    return pool[Math.floor(Math.random() * pool.length)] || PETS[0];
  }


  const ACCESSORIES = [
    { id: "scarf", color: "#e9586f", shade: "#b73f54" },
    { id: "backpack", color: "#7d9cff", shade: "#5576d9" },
    { id: "bow", color: "#ff9f50", shade: "#d97a2b" },
    { id: "star", color: "#ffd35f", shade: "#d6a01c" },
  ];

  function randomAccessory(excludeId) {
    const pool = excludeId && ACCESSORIES.length > 1
      ? ACCESSORIES.filter((acc) => acc.id !== excludeId)
      : ACCESSORIES;
    return pool[Math.floor(Math.random() * pool.length)] || null;
  }

  const api = {
    PETS,
    PET_IDS,
    ACCESSORIES,
    byId,
    random,
    randomAccessory,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.PiuPets = api;
})(typeof window !== "undefined" ? window : globalThis);
