/* Public demo poetry library.
 *
 * Four original PiuPiu poems and four public-domain classics. The full
 * anthology can be extracted locally with tools/extract-poems.py and imported
 * from the poetry library sheet; that private library is not shipped here.
 */
(function (global) {
  "use strict";

  const categories = [
    { id: "family", name: "Family and Friends", hue: 12, icon: "users" },
    { id: "feelings", name: "Feelings", hue: 300, icon: "heart" },
    { id: "animals", name: "Animals and Nature", hue: 140, icon: "paw" },
    { id: "cities", name: "Cities, Towns, and Travel", hue: 205, icon: "bus" },
    { id: "fun", name: "Fun and Games", hue: 45, icon: "ball" },
    { id: "science", name: "Science and Art", hue: 185, icon: "palette" },
    { id: "body", name: "Body and Health", hue: 340, icon: "person" },
    { id: "learning", name: "A World of Learning", hue: 265, icon: "book" },
  ];

  const poems = [
    {
      id: "demo-our-table",
      category: "family",
      title: "Our Table",
      author: "PiuPiu",
      lines: [
        "Around this table",
        "four chairs wait.",
        "One for me,",
        "one for you,",
        "Two for the stories",
        "we bring home.",
      ],
      stanzaStarts: [0, 4],
    },
    {
      id: "demo-nobody",
      category: "feelings",
      title: "I’m Nobody! Who Are You?",
      author: "Emily Dickinson",
      lines: [
        "I’m nobody! Who are you?",
        "Are you nobody, too?",
        "Then there’s a pair of us – don’t tell!",
        "They’d banish us, you know.",
        "How dreary to be somebody!",
        "How public, like a frog",
        "To tell your name the livelong day",
        "To an admiring bog!",
      ],
      stanzaStarts: [0, 4],
    },
    {
      id: "demo-crocodile",
      category: "animals",
      title: "The Crocodile",
      author: "Lewis Carroll",
      lines: [
        "How doth the little crocodile",
        "Improve his shining tail,",
        "And pour the waters of the Nile",
        "On every golden scale!",
        "How cheerfully he seems to grin,",
        "How neatly spreads his claws,",
        "And welcomes little fishes in,",
        "With gently smiling jaws!",
      ],
      stanzaStarts: [0, 4],
    },
    {
      id: "demo-night-train",
      category: "cities",
      title: "Night Train",
      author: "PiuPiu",
      lines: [
        "The train hums low,",
        "the windows glow.",
        "Towns slide by",
        "like beads on a string.",
        "Sleep, little traveler,",
        "the city will sing.",
      ],
      stanzaStarts: [0, 4],
    },
    {
      id: "demo-tumbling",
      category: "fun",
      title: "Tumbling",
      author: "Anonymous",
      lines: [
        "In jumping and tumbling",
        "We spend the whole day,",
        "Till night by arriving",
        "Has finished our play.",
        "What then? One and all,",
        "There’s no more to be said,",
        "As we tumbled all day,",
        "So we tumble to bed.",
      ],
      stanzaStarts: [0, 4],
    },
    {
      id: "demo-look-closer",
      category: "science",
      title: "Look Closer",
      author: "PiuPiu",
      lines: [
        "A seed is a suitcase",
        "packed for the light.",
        "A raindrop is a lens",
        "for a very small world.",
        "Look closer—",
        "the ordinary is a door.",
      ],
      stanzaStarts: [0, 4],
    },
    {
      id: "demo-peas",
      category: "body",
      title: "I Eat My Peas with Honey",
      author: "Anonymous",
      lines: [
        "I eat my peas with honey;",
        "I’ve done it all my life.",
        "It makes the peas taste funny,",
        "But it keeps them on the knife.",
      ],
      stanzaStarts: [0],
    },
    {
      id: "demo-book-door",
      category: "learning",
      title: "The Book Door",
      author: "PiuPiu",
      lines: [
        "Every book",
        "is a door",
        "with a key",
        "made of words.",
        "Turn the page.",
        "Step through.",
      ],
      stanzaStarts: [0, 4],
    },
  ];

  global.PiuPoetry = {
    version: 1,
    demo: true,
    source: "PiuPiu demo poems and public-domain classics",
    rights: "Demo library. Import the full anthology privately from the poetry library sheet.",
    categories,
    poems,
  };
})(window);
