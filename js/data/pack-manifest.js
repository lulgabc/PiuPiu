const BNC_BAND_COUNTS = [
  1000, 1000, 1000, 1000, 1000, // bnc1-bnc5
  1001,                         // bnc6
  1000, 1000, 1000, 1000, 1000, 1000, // bnc7-bnc12
  999,                          // bnc13
  1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, // bnc14-bnc22
  1002,                         // bnc23
  1000, 1000,                   // bnc24-bnc25
];

export const LAZY_PACK_MANIFEST = Object.freeze([
  Object.freeze({
    id: "dolch",
    icon: "🎒",
    nameKey: "cat.dolch",
    education: true,
    group: "education",
    countKey: "pack.count",
    lazy: "education",
    totalCount: 315,
    bands: Object.freeze([
      Object.freeze({ id: "prek", labelKey: "band.prek", count: 40 }),
      Object.freeze({ id: "kindergarten", labelKey: "band.kindergarten", count: 52 }),
      Object.freeze({ id: "grade1", labelKey: "band.grade1", count: 41 }),
      Object.freeze({ id: "grade2", labelKey: "band.grade2", count: 46 }),
      Object.freeze({ id: "grade3", labelKey: "band.grade3", count: 41 }),
      Object.freeze({ id: "nouns", labelKey: "band.nouns", count: 95 }),
    ]),
  }),
  Object.freeze({
    id: "fry",
    icon: "🔤",
    nameKey: "cat.fry",
    education: true,
    group: "education",
    countKey: "pack.count",
    lazy: "education",
    totalCount: 1000,
    bands: Object.freeze(
      Array.from({ length: 10 }, (_, i) =>
        Object.freeze({
          id: `fry${i + 1}`,
          labelKey: `band.fry${i + 1}`,
          count: 100,
        }),
      ),
    ),
  }),
  Object.freeze({
    id: "dale",
    icon: "📖",
    nameKey: "cat.dale",
    education: true,
    group: "education",
    countKey: "pack.count",
    lazy: "education",
    totalCount: 2940,
    bands: Object.freeze([
      Object.freeze({ id: "all", labelKey: "band.dale", count: 2940 }),
    ]),
  }),
  Object.freeze({
    id: "bnc",
    icon: "🧩",
    nameKey: "cat.bnc",
    education: true,
    group: "families",
    countKey: "pack.count",
    lazy: "families",
    totalCount: 25002,
    bands: Object.freeze(
      BNC_BAND_COUNTS.map((count, i) =>
        Object.freeze({
          id: `bnc${i + 1}`,
          labelKey: `band.bnc${i + 1}`,
          count,
        }),
      ),
    ),
  }),
]);

export const LAZY_PACK_BY_ID = Object.freeze(
  Object.fromEntries(LAZY_PACK_MANIFEST.map((pack) => [pack.id, pack])),
);

export function isLazyPackId(id) {
  return Boolean(id && Object.prototype.hasOwnProperty.call(LAZY_PACK_BY_ID, id));
}

export function getLazyPackLoader(id) {
  const pack = id ? LAZY_PACK_BY_ID[id] : null;
  return pack ? pack.lazy : null;
}

export function getLazyPackBandCount(categoryId, bandId) {
  const pack = categoryId ? LAZY_PACK_BY_ID[categoryId] : null;
  if (!pack) return 0;
  if (!bandId || bandId === "all") return pack.totalCount;
  const band = pack.bands.find((item) => item.id === bandId);
  return band ? band.count : 0;
}
