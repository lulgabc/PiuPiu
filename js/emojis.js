(function (global) {
  "use strict";

  // Only words with a clear, recognizable emoji belong here. Words without an
  // emoji simply keep showing their text face.
  const EMOJI = {
    // food
    bread: "🍞", rice: "🍚", egg: "🥚", cake: "🍰", soup: "🍲", meat: "🥩",
    fish: "🐟", cheese: "🧀", pizza: "🍕", salad: "🥗", sandwich: "🥪",
    noodle: "🍜", burger: "🍔", cookie: "🍪", chocolate: "🍫", breakfast: "🍳",
    lunch: "🍱", dinner: "🍽️", butter: "🧈", honey: "🍯", dessert: "🍰",
    sausage: "🌭", pancake: "🥞", porridge: "🥣", seafood: "🦐", snack: "🍿",

    // fruits
    apple: "🍎", banana: "🍌", orange: "🍊", grape: "🍇", lemon: "🍋",
    peach: "🍑", pear: "🍐", plum: "🟣", cherry: "🍒", melon: "🍈",
    mango: "🥭", kiwi: "🥝", pineapple: "🍍", coconut: "🥥", apricot: "🍑",
    blueberry: "🫐", raspberry: "🫐", grapefruit: "🍊", tangerine: "🍊",
    blackberry: "🫐", gooseberry: "🫐", cranberry: "🫐", nectarine: "🍑",
    cantaloupe: "🍈", starfruit: "⭐", dragonfruit: "🐉", mulberry: "🫐",

    // vegetables
    potato: "🥔", tomato: "🍅", carrot: "🥕", onion: "🧅", corn: "🌽",
    bean: "🫘", pea: "🫛", cabbage: "🥬", pumpkin: "🎃", pepper: "🫑",
    broccoli: "🥦", cucumber: "🥒", lettuce: "🥬", spinach: "🥬",
    mushroom: "🍄", garlic: "🧄", celery: "🥬", radish: "🥕",
    beetroot: "🥕", zucchini: "🥒", asparagus: "🌱", cauliflower: "🥦",
    eggplant: "🍆", shallot: "🧅", parsnip: "🥕", watercress: "🥬",
    endive: "🥬", fennel: "🌿", okra: "🥒",

    // drinks
    water: "💧", milk: "🥛", tea: "🍵", coffee: "☕", juice: "🧃",
    soda: "🥤", wine: "🍷", beer: "🍺", cocoa: "☕", lemonade: "🍋",
    smoothie: "🥤", milkshake: "🥤", cocktail: "🍸", espresso: "☕",
    cappuccino: "☕", latte: "☕", cider: "🍎", brandy: "🥃",
    whiskey: "🥃", champagne: "🍾", beverage: "🥤", aperitif: "🍹",
    mojito: "🍹", sangria: "🍷", margarita: "🍸", chamomile: "🌼",
    infusion: "🍵", decaf: "☕", tonic: "🥤", sake: "🍶",

    // animals
    dog: "🐶", cat: "🐱", bird: "🐦", horse: "🐴", cow: "🐮", sheep: "🐑",
    pig: "🐷", duck: "🦆", rabbit: "🐰", monkey: "🐵", tiger: "🐯",
    lion: "🦁", bear: "🐻", wolf: "🐺", fox: "🦊", deer: "🦌", goat: "🐐",
    chicken: "🐔", elephant: "🐘", giraffe: "🦒", kangaroo: "🦘",
    squirrel: "🐿️", penguin: "🐧", dolphin: "🐬", whale: "🐳",
    crocodile: "🐊", rhinoceros: "🦏", chimpanzee: "🐵", hedgehog: "🦔",
    snake: "🐍", frog: "🐸", turtle: "🐢", shark: "🦈", butterfly: "🦋",
    bee: "🐝", ant: "🐜", spider: "🕷️", feather: "🪶", heart: "❤️",
    brain: "🧠", bone: "🦴",

    // body
    hand: "✋", foot: "🦶", head: "👤", eye: "👁️", ear: "👂", nose: "👃",
    mouth: "👄", hair: "💇", arm: "💪", leg: "🦵", finger: "👆",
    shoulder: "🤷", elbow: "💪", wrist: "⌚", knee: "🦵", ankle: "🦶",
    tooth: "🦷", tongue: "👅", face: "🙂", neck: "🧣", stomach: "🤰",
    muscle: "💪", skeleton: "💀", collarbone: "🦴", knuckle: "✊",
    nostril: "👃", spine: "🦴", forehead: "🤦", eyebrow: "🤨", eyelash: "👁️",

    // family
    mother: "👩", father: "👨", sister: "👧", brother: "👦", baby: "👶",
    son: "👦", daughter: "👧", grandma: "👵", grandpa: "👴", aunt: "👩",
    uncle: "👨", cousin: "🧑", parent: "👫", husband: "🤵", wife: "👰",
    family: "👪", child: "🧒", nephew: "👦", niece: "👧", twin: "👯",
    relative: "👥", ancestor: "🧓", descendant: "🧒", guardian: "🛡️",
    sibling: "👫", spouse: "💍", stepmother: "👩", stepfather: "👨",
    grandchild: "👶", generation: "👨‍👩‍👧",

    // clothes
    shirt: "👕", pants: "👖", dress: "👗", skirt: "👗", shoe: "👞",
    sock: "🧦", hat: "🎩", coat: "🧥", glove: "🧤", jacket: "🧥",
    sweater: "🧥", scarf: "🧣", boot: "👢", sandal: "🩴", shorts: "🩳",
    jeans: "👖", uniform: "🥋", pocket: "👖", button: "🔘",
    wardrobe: "🚪", necklace: "📿", bracelet: "📿", earring: "💎",
    waistcoat: "🧥", raincoat: "🧥", swimsuit: "🩱", cardigan: "🧥",
    trousers: "👖", handkerchief: "🧻",

    // home
    house: "🏠", home: "🏠", room: "🚪", door: "🚪", window: "🪟", bed: "🛏️",
    chair: "🪑", lamp: "💡", key: "🔑", clock: "⏰", kitchen: "🍳",
    bedroom: "🛏️", bathroom: "🛁", garden: "🌳", sofa: "🛋️", shelf: "📚",
    mirror: "🪞", carpet: "🧶", curtain: "🪟", towel: "🧻",
    furniture: "🛋️", cupboard: "🗄️", balcony: "🏙️", basement: "🏠",
    ceiling: "🏠", chimney: "🏠", staircase: "🪜", blanket: "🛏️",
    mattress: "🛏️", roof: "🏠", wall: "🧱", stair: "🪜", picture: "🖼️",
    candle: "🕯️", toothbrush: "🪥", shampoo: "🧴", brush: "🪥", comb: "💇",
    wallet: "👛", purse: "👛", backpack: "🎒", umbrella: "☂️", glasses: "👓",

    // school
    book: "📚", pen: "🖊️", desk: "🪑", class: "🏫", test: "📝", page: "📄",
    bag: "🎒", ruler: "📏", chalk: "🖍️", paper: "📄", teacher: "👩‍🏫",
    student: "🧑‍🎓", lesson: "📖", homework: "📚", library: "📚",
    subject: "📚", exam: "📝", grade: "💯", notebook: "📓", eraser: "🧽",
    university: "🎓", professor: "👨‍🏫", semester: "📅", diploma: "🎓",
    curriculum: "📚", laboratory: "🧪", assignment: "📝", scholarship: "🎓",
    graduation: "🎓", principal: "👔",

    // jobs
    doctor: "🧑‍⚕️", nurse: "👩‍⚕️", driver: "🚗", cook: "👨‍🍳",
    farmer: "👨‍🌾", singer: "🎤", actor: "🎭", police: "👮", pilot: "👨‍✈️",
    lawyer: "⚖️", engineer: "👷", artist: "🎨", writer: "✍️", dancer: "💃",
    waiter: "🤵", chef: "👨‍🍳", soldier: "💂", judge: "⚖️", dentist: "🦷",
    scientist: "🔬", architect: "📐", accountant: "🧮", journalist: "📰",
    programmer: "💻", pharmacist: "💊", technician: "🔧", translator: "🌐",
    consultant: "💼", politician: "🏛️", king: "🤴", queen: "👸", hero: "🦸",
    captain: "🧑‍✈️", boss: "👔", sailor: "⛵",
    prince: "🤴", princess: "👸", president: "🏛️", mayor: "🏛️",
    volunteer: "🙋", customer: "🛒",

    // sports
    ball: "⚽", run: "🏃", swim: "🏊", jump: "🤸", team: "👥", game: "🎮",
    race: "🏁", kick: "🦶", catch: "🧤", bike: "🚲", soccer: "⚽",
    tennis: "🎾", coach: "🧑‍🏫", score: "🔢", player: "🧑", match: "🏟️",
    medal: "🏅", referee: "🧑‍⚖️", training: "🏋️", cycling: "🚴",
    basketball: "🏀", volleyball: "🏐", tournament: "🏆", athlete: "🏃",
    stadium: "🏟️", opponent: "🧑", championship: "🏆", gymnastics: "🤸",
    marathon: "🏃", goalkeeper: "🧤",

    // music
    song: "🎵", sing: "🎤", drum: "🥁", piano: "🎹", guitar: "🎸",
    music: "🎶", band: "🎸", dance: "💃", note: "🎵", tune: "🎶",
    violin: "🎻", concert: "🎤", album: "💿", melody: "🎵", rhythm: "🥁",
    chorus: "🎤", stage: "🎭", lyrics: "📝", flute: "🪈", orchestra: "🎻",
    symphony: "🎼", composer: "🎼", conductor: "🎼", instrument: "🎻",
    saxophone: "🎷", microphone: "🎤", rehearsal: "🎵", harmony: "🎶",
    percussion: "🥁",

    // travel
    trip: "🧳", map: "🗺️", hotel: "🏨", ticket: "🎫", tour: "🗺️",
    journey: "🧳", luggage: "🧳", passport: "🛂", suitcase: "🧳",
    airport: "🛫", camera: "📷", guide: "🧑‍🏫", resort: "🏖️", visa: "🛂",
    itinerary: "🗺️", destination: "📍", adventure: "🧭", immigration: "🛂",
    reservation: "📅", sightseeing: "📸", accommodation: "🏨",
    expedition: "🧭", souvenir: "🎁",

    // transport
    bus: "🚌", car: "🚗", train: "🚆", plane: "✈️", ship: "🚢",
    boat: "⛵", taxi: "🚕", truck: "🚚", road: "🛣️", subway: "🚇",
    station: "🚉", engine: "⚙️", wheel: "🛞", bridge: "🌉", tunnel: "🚇",
    traffic: "🚦", harbor: "⚓", helicopter: "🚁", motorcycle: "🏍️",
    ambulance: "🚑", vehicle: "🚗", passenger: "🧑", terminal: "🛫",
    highway: "🛣️", runway: "🛫", ferry: "⛴️", cargo: "📦",

    // nature
    sun: "☀️", moon: "🌙", star: "⭐", sky: "🌌", tree: "🌳", flower: "🌸",
    grass: "🌿", river: "🏞️", lake: "🏞️", sea: "🌊", mountain: "⛰️",
    forest: "🌲", island: "🏝️", beach: "🏖️", cloud: "☁️", rain: "🌧️",
    snow: "❄️", wind: "🌬️", stone: "🪨", leaf: "🍃", waterfall: "💦",
    volcano: "🌋", glacier: "🧊", desert: "🏜️", valley: "🏞️",
    canyon: "🏞️", jungle: "🌴", meadow: "🌼", swamp: "🐸", cliff: "🪨",
    planet: "🪐", earth: "🌍", world: "🌍", nature: "🌿", root: "🌱",
    seed: "🌱", fruit: "🍎", vegetable: "🥦", animal: "🐾", ocean: "🌊",

    // weather
    storm: "🌩️", fog: "🌫️", ice: "🧊", heat: "🔥", thunder: "⛈️",
    lightning: "⚡", rainbow: "🌈", breeze: "🌬️", frost: "❄️", hail: "🌨️",
    mist: "🌫️", humidity: "💧", forecast: "📅", temperature: "🌡️",
    hurricane: "🌀", tornado: "🌪️", blizzard: "❄️", drought: "🏜️",
    monsoon: "🌧️", atmosphere: "🌍", precipitation: "🌧️", climate: "🌍",
    avalanche: "🏔️", typhoon: "🌀",

    // technology
    phone: "📱", email: "📧", screen: "🖥️", mouse: "🖱️", keyboard: "⌨️",
    internet: "🌐", radio: "📻", battery: "🔋", cable: "🔌",
    computer: "💻", laptop: "💻", website: "🌐", password: "🔑",
    download: "⬇️", software: "💿", printer: "🖨️", charger: "🔌",
    network: "🌐", device: "📱", algorithm: "🧮", database: "🗄️",
    encryption: "🔒", automation: "🤖", processor: "🧠", satellite: "🛰️",
    cybersecurity: "🛡️", bandwidth: "📶", prototype: "🧪", interface: "🖥️",

    // emotions
    love: "❤️", fear: "😨", joy: "😄", anger: "😠", hope: "🌟",
    smile: "😊", laugh: "😂", cry: "😢", dream: "💭", worry: "😟",
    sadness: "😢", surprise: "😲", pride: "🦁", shame: "😳", guilt: "😔",
    anxiety: "😰", courage: "🦸", passion: "❤️‍🔥", jealousy: "😒",
    kindness: "🤗", gratitude: "🙏", empathy: "🤝", frustration: "😤",
    embarrassment: "😳", excitement: "🤩", loneliness: "😔",
    compassion: "🤗", resentment: "😠", nostalgia: "🥲", enthusiasm: "🤩",

    // places
    school: "🏫", park: "🌳", shop: "🏪", bank: "🏦", city: "🏙️",
    town: "🏘️", street: "🛣️", hospital: "🏥", museum: "🏛️",
    market: "🛒", restaurant: "🍽️", cinema: "🎬", theater: "🎭",
    factory: "🏭", cathedral: "⛪", village: "🏘️", capital: "🏛️",
    monument: "🗿", gallery: "🖼️", pharmacy: "💊", playground: "🛝",
    cafe: "☕", store: "🏬", office: "🏢", farm: "🚜", church: "⛪",

    // core extras
    letter: "✉️", message: "💬", story: "📖", word: "🔤", sentence: "📝",
    question: "❓", answer: "✅", idea: "💡", plan: "🗒️", choice: "🔀",
    mistake: "❌", problem: "⚠️", solution: "💡", reason: "🤔",
    secret: "🤫", peace: "☮️", war: "⚔️", life: "🌱", birth: "👶",
    party: "🎉", holiday: "🏖️", birthday: "🎂", wedding: "💒",
    festival: "🎪", memory: "🧠", minute: "⏱️", hour: "⏰", day: "☀️",
    night: "🌙", morning: "🌅", evening: "🌆", afternoon: "🌤️", week: "📅",
    month: "📅", year: "📅", spring: "🌸", summer: "☀️", autumn: "🍂",
    winter: "❄️", time: "⏰", date: "📅", calendar: "📅", schedule: "📅",
    language: "🗣️", culture: "🏛️", history: "📜", science: "🧪",
    math: "➗", art: "🎨", government: "🏛️", law: "⚖️", freedom: "🕊️",
    power: "⚡", energy: "⚡", light: "💡", smoke: "💨", air: "💨",
    gas: "⛽", oil: "🛢️", metal: "🔩", gold: "🥇", silver: "🥈",
    iron: "🔩", sand: "🏖️", wood: "🪵", cloth: "🧵", thread: "🧵",
    needle: "🪡", rope: "🪢", ladder: "🪜", bucket: "🪣", basket: "🧺",
    box: "📦", bottle: "🧴", cup: "🥤", plate: "🍽️", bowl: "🥣",
    spoon: "🥄", fork: "🍴", knife: "🔪", pan: "🍳", pot: "🍲",
    oven: "🔥", fridge: "🧊", sink: "🚰", shower: "🚿", toilet: "🚽",
    lock: "🔒", tool: "🛠️", hammer: "🔨", nail: "🔩", screw: "🔩",
    string: "🧵", scissors: "✂️", envelope: "✉️", stamp: "📮", coin: "🪙",
    gift: "🎁", prize: "🏆", bill: "💵", money: "💰", price: "🏷️",
    cost: "💰", job: "💼", eat: "🍽️", drink: "🥤", sleep: "😴",
    read: "📖", write: "✍️", draw: "🎨", play: "🎮", listen: "🎧",
    look: "👀", kiss: "😘", hug: "🤗", clap: "👏", walk: "🚶",
    drive: "🚗", fly: "✈️", buy: "🛒", pay: "💳", wash: "🧼",
    clean: "🧽", open: "🚪", close: "🚪", throw: "🤾", climb: "🧗",
    cut: "✂️", dig: "⛏️", paint: "🎨", ride: "🚲", sail: "⛵",
    sit: "🪑", stand: "🧍", wake: "⏰", watch: "⌚", television: "📺",
    speaker: "🔊", movie: "🎬", toy: "🧸", kite: "🪁", balloon: "🎈",
    hobby: "🎨", rocket: "🚀", bicycle: "🚲", watermelon: "🍉",
    strawberry: "🍓", candy: "🍬", salt: "🧂", sugar: "🍬", flour: "🌾",
    insect: "🐛",
  };

  if (typeof module !== "undefined" && module.exports) module.exports = EMOJI;
  global.PIU_EMOJI = EMOJI;
})(typeof window !== "undefined" ? window : globalThis);
