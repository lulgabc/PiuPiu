(function (global) {
  "use strict";

  const CATEGORIES = [
    {
      id: "food",
      icon: "🍽️",
      nameKey: "cat.food",
      levels: {
        1: "bread rice egg cake soup meat fish cheese pizza salad".split(" "),
        2: "sandwich noodle burger cookie chocolate breakfast lunch dinner butter honey".split(" "),
        3: "recipe nutrition dessert sausage pancake porridge seafood flavor cuisine snack".split(" "),
      },
    },
    {
      id: "fruits",
      icon: "🍎",
      nameKey: "cat.fruits",
      levels: {
        1: "apple banana orange grape lemon peach pear plum cherry melon".split(" "),
        2: "mango papaya kiwi pineapple coconut apricot blueberry raspberry grapefruit tangerine".split(" "),
        3: "pomegranate persimmon blackberry gooseberry cranberry nectarine cantaloupe starfruit dragonfruit mulberry".split(" "),
      },
    },
    {
      id: "vegetables",
      icon: "🥕",
      nameKey: "cat.vegetables",
      levels: {
        1: "potato tomato carrot onion corn bean pea cabbage pumpkin pepper".split(" "),
        2: "broccoli cucumber lettuce spinach mushroom garlic celery radish beetroot zucchini".split(" "),
        3: "asparagus cauliflower artichoke eggplant shallot parsnip watercress endive fennel okra".split(" "),
      },
    },
    {
      id: "drinks",
      icon: "🥤",
      nameKey: "cat.drinks",
      levels: {
        1: "water milk tea coffee juice soda wine beer cocoa lemonade".split(" "),
        2: "smoothie milkshake cocktail espresso cappuccino latte cider brandy whiskey champagne".split(" "),
        3: "beverage aperitif mojito sangria margarita chamomile infusion decaf tonic sake".split(" "),
      },
    },
    {
      id: "animals",
      icon: "🐾",
      nameKey: "cat.animals",
      levels: {
        1: "dog cat bird fish horse cow sheep pig duck rabbit".split(" "),
        2: "monkey tiger lion bear wolf fox deer goat chicken elephant".split(" "),
        3: "giraffe kangaroo squirrel penguin dolphin whale crocodile rhinoceros chimpanzee hedgehog".split(" "),
      },
    },
    {
      id: "body",
      icon: "🧍",
      nameKey: "cat.body",
      levels: {
        1: "hand foot head eye ear nose mouth hair arm leg".split(" "),
        2: "finger shoulder elbow wrist knee ankle tooth tongue face neck".split(" "),
        3: "forehead eyebrow eyelash stomach muscle skeleton collarbone knuckle nostril spine".split(" "),
      },
    },
    {
      id: "family",
      icon: "👪",
      nameKey: "cat.family",
      levels: {
        1: "mother father sister brother baby son daughter grandma grandpa aunt".split(" "),
        2: "uncle cousin parent husband wife family child nephew niece twin".split(" "),
        3: "relative ancestor descendant guardian sibling spouse stepmother stepfather grandchild generation".split(" "),
      },
    },
    {
      id: "clothes",
      icon: "👕",
      nameKey: "cat.clothes",
      levels: {
        1: "shirt pants dress skirt shoe sock hat coat belt glove".split(" "),
        2: "jacket sweater scarf boot sandal shorts jeans uniform pocket button".split(" "),
        3: "wardrobe necklace bracelet earring waistcoat raincoat swimsuit cardigan trousers handkerchief".split(" "),
      },
    },
    {
      id: "home",
      icon: "🏠",
      nameKey: "cat.home",
      levels: {
        1: "house room door window bed chair table lamp key clock".split(" "),
        2: "kitchen bedroom bathroom garden sofa shelf mirror carpet curtain towel".split(" "),
        3: "furniture cupboard wardrobe balcony basement ceiling chimney staircase blanket mattress".split(" "),
      },
    },
    {
      id: "school",
      icon: "🎓",
      nameKey: "cat.school",
      levels: {
        1: "book pen desk class test page bag ruler chalk paper".split(" "),
        2: "teacher student lesson homework library subject exam grade notebook eraser".split(" "),
        3: "university professor semester diploma curriculum laboratory assignment scholarship graduation principal".split(" "),
      },
    },
    {
      id: "jobs",
      icon: "💼",
      nameKey: "cat.jobs",
      levels: {
        1: "doctor nurse teacher driver cook farmer singer actor police pilot".split(" "),
        2: "lawyer engineer artist writer dancer waiter chef soldier judge dentist".split(" "),
        3: "scientist architect accountant journalist programmer pharmacist technician translator consultant politician".split(" "),
      },
    },
    {
      id: "sports",
      icon: "⚽",
      nameKey: "cat.sports",
      levels: {
        1: "ball run swim jump team game race kick catch bike".split(" "),
        2: "soccer tennis coach score player match medal referee training cycling".split(" "),
        3: "basketball volleyball tournament athlete stadium opponent championship gymnastics marathon goalkeeper".split(" "),
      },
    },
    {
      id: "music",
      icon: "🎵",
      nameKey: "cat.music",
      levels: {
        1: "song sing drum piano guitar music band dance note tune".split(" "),
        2: "violin concert singer album melody rhythm chorus stage lyrics flute".split(" "),
        3: "orchestra symphony composer conductor instrument saxophone microphone rehearsal harmony percussion".split(" "),
      },
    },
    {
      id: "travel",
      icon: "✈️",
      nameKey: "cat.travel",
      levels: {
        1: "trip map bus car train plane hotel ticket beach tour".split(" "),
        2: "journey luggage passport suitcase airport station camera guide resort visa".split(" "),
        3: "itinerary destination adventure backpack immigration reservation sightseeing accommodation expedition souvenir".split(" "),
      },
    },
    {
      id: "transport",
      icon: "🚌",
      nameKey: "cat.transport",
      levels: {
        1: "bus car train plane ship boat bike taxi truck road".split(" "),
        2: "subway station driver engine wheel bridge tunnel traffic airport harbor".split(" "),
        3: "helicopter motorcycle ambulance vehicle passenger terminal highway runway ferry cargo".split(" "),
      },
    },
    {
      id: "nature",
      icon: "🌿",
      nameKey: "cat.nature",
      levels: {
        1: "sun moon star sky tree flower grass river lake sea".split(" "),
        2: "mountain forest island beach cloud rain snow wind stone leaf".split(" "),
        3: "waterfall volcano glacier desert valley canyon jungle meadow swamp cliff".split(" "),
      },
    },
    {
      id: "weather",
      icon: "☀️",
      nameKey: "cat.weather",
      levels: {
        1: "sun rain snow wind cloud storm fog ice sky heat".split(" "),
        2: "thunder lightning rainbow breeze frost hail mist humidity forecast temperature".split(" "),
        3: "hurricane tornado blizzard drought monsoon atmosphere precipitation climate avalanche typhoon".split(" "),
      },
    },
    {
      id: "technology",
      icon: "💻",
      nameKey: "cat.technology",
      levels: {
        1: "phone email screen mouse keyboard internet camera radio battery cable".split(" "),
        2: "computer laptop website password download software printer charger network device".split(" "),
        3: "algorithm database encryption automation processor satellite cybersecurity bandwidth prototype interface".split(" "),
      },
    },
    {
      id: "emotions",
      icon: "💗",
      nameKey: "cat.emotions",
      levels: {
        1: "love fear joy anger hope smile laugh cry dream worry".split(" "),
        2: "sadness surprise pride shame guilt anxiety courage passion jealousy kindness".split(" "),
        3: "gratitude empathy frustration embarrassment excitement loneliness compassion resentment nostalgia enthusiasm".split(" "),
      },
    },
    {
      id: "places",
      icon: "📍",
      nameKey: "cat.places",
      levels: {
        1: "home school park shop bank hotel beach city town street".split(" "),
        2: "hospital library museum market restaurant station airport cinema theater factory".split(" "),
        3: "university cathedral stadium harbor village capital monument gallery pharmacy playground".split(" "),
      },
    },
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = CATEGORIES;
  global.PIU_LEXICON = CATEGORIES;
})(typeof window !== "undefined" ? window : globalThis);
