/* PiuPiu — English number words from 1 to 100.
 *
 * Bands follow the tens children learn at school, so a parent can practise
 * just 1–10, one decade at a time, or a longer review run. 1–50 and 1–100
 * repeat words from the decade bands on purpose; the game de-duplicates the
 * combined pool, so “全部” still plays each number once.
 */

(function (global) {
  "use strict";

  const ONES = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  function wordsFor(n) {
    if (n < 1 || n > 100 || !Number.isInteger(n)) return "";
    if (n === 100) return "one hundred";
    if (n < 20) return ONES[n];
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return ones ? `${TENS[tens]}-${ONES[ones]}` : TENS[tens];
  }

  function range(start, end) {
    const words = [];
    for (let n = start; n <= end; n += 1) words.push(wordsFor(n));
    return words;
  }

  const BANDS = [
    { id: "num1_10", labelKey: "band.num1_10", words: range(1, 10) },
    { id: "num11_20", labelKey: "band.num11_20", words: range(11, 20) },
    { id: "num21_30", labelKey: "band.num21_30", words: range(21, 30) },
    { id: "num31_40", labelKey: "band.num31_40", words: range(31, 40) },
    { id: "num41_50", labelKey: "band.num41_50", words: range(41, 50) },
    { id: "num51_60", labelKey: "band.num51_60", words: range(51, 60) },
    { id: "num61_70", labelKey: "band.num61_70", words: range(61, 70) },
    { id: "num71_80", labelKey: "band.num71_80", words: range(71, 80) },
    { id: "num81_90", labelKey: "band.num81_90", words: range(81, 90) },
    { id: "num91_100", labelKey: "band.num91_100", words: range(91, 100) },
    { id: "num1_50", labelKey: "band.num1_50", words: range(1, 50) },
    { id: "num1_100", labelKey: "band.num1_100", words: range(1, 100) },
  ];

  const NUMBERS = [
    {
      id: "numbers",
      icon: "🔢",
      nameKey: "cat.numbers",
      education: false,
      group: "themes",
      bands: BANDS,
    },
  ];

  // Spoken English often arrives as digits ("21", "100"). The game uses this
  // table to turn those tokens back into the number words on screen.
  const NUMBER_WORDS = {};
  for (let n = 1; n <= 100; n += 1) NUMBER_WORDS[String(n)] = wordsFor(n);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = NUMBERS;
    module.exports.wordsFor = wordsFor;
    module.exports.NUMBER_WORDS = NUMBER_WORDS;
  }
  global.PIU_NUMBERS = NUMBERS;
  global.PIU_NUMBER_WORDS = NUMBER_WORDS;
})(typeof window !== "undefined" ? window : globalThis);
