/**
 * Prompt banks for the couples games. Lives in code so solo and room play share it.
 * Know Us options may use tokens: {s} = the person the question is about,
 * {o} = the other person. They are shown as real names (or "Me") so both
 * players see the same person and a match really is a match.
 */
export type KnowUsItem = { category: string; prompt: string; options: string[] };

const K = (category: string, rows: string[]): KnowUsItem[] =>
  rows.map((r) => {
    const [prompt, opts] = r.split("|");
    return { category, prompt, options: opts.split(";") };
  });

export const KNOW_US: KnowUsItem[] = [
  ...K("First moves", [
    "Who made the first move?|{s};{o};It was mutual;Still arguing about it",
    "Where did we first really talk?|Online;A friend's place;School or work;Somewhere random",
    "What did {s} notice first about {o}?|The smile;The voice;The confidence;The outfit",
    "How did {s} feel before our first date?|Excited;Nervous;Relaxed;Didn't know it was a date",
    "Who said 'I love you' first?|{s};{o};Same moment;Nobody has yet",
    "Who texted first after we met?|{s};{o};A friend did it for us;Can't remember",
    "{s}'s first impression of {o}?|Too cool;Very sweet;A bit strange;Instantly into it",
    "Our first date was mostly...|Food;Walking and talking;A film;Pure chaos",
    "Who was more nervous at the start?|{s};{o};Both of us;Neither",
    "When did {s} know it was serious?|First month;First trip;First fight;Still deciding",
  ]),
  ...K("Us", [
    "Our perfect night in?|Film and food;Talking till 3am;Games;Doing nothing, together",
    "Who says sorry first?|{s};{o};Whoever is hungry;Nobody, we just move on",
    "Who plans the trips?|{s};{o};Both of us;Nobody, we improvise",
    "{s}'s love language?|Words;Time together;Small gifts;Touch",
    "Biggest thing we argue about?|Time;Money;Food;Nothing serious",
    "Who is the bigger romantic?|{s};{o};Equal;Neither of us",
    "Who wins most arguments?|{s};{o};It's a draw;Whoever cries first",
    "Our couple superpower?|Making each other laugh;Fixing problems;Big adventures;Comfortable silence",
    "Who is the planner, who is the dreamer?|{s} plans;{o} plans;We both plan;We both dream",
    "Our song is...|A love song;A party song;Something silly;We need one",
    "Who would survive longer on a desert island?|{s};{o};Only together;Neither, honestly",
    "Who is more jealous?|{s};{o};Both a little;Neither",
  ]),
  ...K("Habits", [
    "Who takes longer to get ready?|{s};{o};Same;Depends where we are going",
    "Who is the better cook?|{s};{o};Neither;We order in",
    "Who falls asleep first?|{s};{o};Same time;Whoever had the longer day",
    "Who checks their phone more?|{s};{o};Both of us;Neither",
    "Who steals the blanket?|{s};{o};Both of us;We have two",
    "Who is always late?|{s};{o};Both;Neither, we are punctual",
    "Who leaves dishes in the sink?|{s};{o};Both;It's a mystery",
    "{s}'s morning mood?|Sunshine;Do not talk to me;Slow and quiet;Already on the phone",
    "Who sings in the shower?|{s};{o};Both;Neither",
    "Who spends more money?|{s};{o};Equal;Depends on the month",
    "{s}'s go-to snack?|Something sweet;Something salty;Fruit;Whatever {o} is eating",
    "Who controls the TV remote?|{s};{o};We share;Whoever grabs it first",
    "Who forgets things more?|{s};{o};Both;Neither",
  ]),
  ...K("Feelings", [
    "What makes {s} feel most loved?|Being listened to;Being surprised;Being held;Being left to rest",
    "How does {s} act when stressed?|Very quiet;Very talkative;Cleans everything;Disappears for a bit",
    "Which compliment lands hardest for {s}?|You are kind;You are funny;You are gorgeous;I am proud of you",
    "{s}'s comfort after a bad day?|Food;Sleep;A long call;Music",
    "What makes {s} cry fastest?|Sad films;Happy news;Being tired;Almost nothing",
    "{s}'s biggest fear?|Heights;Losing people;Failing;Spiders",
    "When {s} is upset, {s} wants...|Space;A hug;To talk it out;Food",
    "What makes {s} laugh the most?|Silly voices;Memes;Dad jokes;{o} falling over",
    "{s} feels most confident when...|Dressed up;At work;With friends;With {o}",
    "What does {s} need more of?|Sleep;Adventure;Quiet time;Affection",
  ]),
  ...K("Future", [
    "Where do we end up?|Somewhere warm;A big city;Close to family;Wherever we can afford",
    "First big thing we buy together?|A home;A car;A trip;A pet",
    "In five years we are...|Married;Travelling;Building something;Exactly like this",
    "Who would spoil the kids more?|{s};{o};Both, badly;Neither",
    "{s}'s dream holiday?|Beach;Mountains;City break;Road trip",
    "Our dream wedding?|Huge party;Tiny and private;Destination;Courthouse and dinner",
    "Which pet would {s} pick?|Dog;Cat;Fish;No pets",
    "{s}'s dream job?|Own business;Artist;Travel the world;Retire early",
    "Who would be the stricter parent?|{s};{o};Equal;Neither",
    "Our retirement looks like...|Beach house;Farm;City flat;Travelling forever",
  ]),
  ...K("Sweet and spicy", [
    "Where does {s} love to be kissed?|Forehead;Cheek;Neck;Surprise me",
    "{s}'s favourite way to cuddle?|Big spoon;Little spoon;Face to face;Just holding hands",
    "What does {s} find most attractive in {o}?|Eyes;Smile;Voice;Hands",
    "{s}'s ideal date night outfit for {o}?|Dressed up;Comfy;Sporty;Whatever, as long as we're out",
    "Best time of day for romance, says {s}?|Morning;Afternoon;Late night;Any time",
    "{s}'s secret weakness?|A good hug;Flirty texts;Cooking for them;Back rubs",
    "Who flirts more?|{s};{o};Equal;We should flirt more",
    "{s}'s favourite thing {o} wears?|Their hoodie;A nice shirt;Pyjamas;Their perfume or cologne",
  ]),
  ...K("Memories", [
    "Our funniest moment?|A trip;A dinner;A misunderstanding;Too many to pick",
    "Best gift {s} ever got from {o}?|Something handmade;A trip;A surprise;A simple note",
    "Our best trip so far?|The first one;The longest one;The cheapest one;Haven't had it yet",
    "Most memorable fight was about...|Being late;Money;Something tiny;We don't remember",
    "{s}'s favourite photo of us?|First one ever;A holiday one;A silly one;A recent one",
    "The moment {s} felt closest to {o}?|A deep talk;A hard time;A celebration;An ordinary day",
    "Who cried at our last emotional moment?|{s};{o};Both;Nobody",
    "Our most spontaneous adventure?|A midnight drive;A last-minute trip;A crazy night out;Still waiting",
  ]),
  ...K("Silly", [
    "If {s} were an animal?|Cat;Dog;Sloth;Lion",
    "Who would win in a dance battle?|{s};{o};Draw;We'd both be terrible",
    "Who would survive a zombie apocalypse?|{s};{o};Only as a team;Neither",
    "{s}'s weirdest food combo?|Fries and ice cream;Pineapple pizza;Cereal at night;Too weird to say",
    "Who talks in their sleep?|{s};{o};Both;Neither",
    "Who would win a staring contest?|{s};{o};Nobody, we'd laugh;Can't look away from each other",
    "{s}'s karaoke song type?|Ballad;Rap;Pop anthem;Refuses to sing",
    "If {s} were famous, for what?|Being funny;Cooking;Singing;Being dramatic",
    "Who is the bigger baby when sick?|{s};{o};Both;Neither",
    "Who gets hangry first?|{s};{o};Both;Neither",
  ]),
];

export const THIS_OR_THAT: [string, string][] = [
  ["Beach", "Mountains"], ["Night in", "Night out"], ["Cats", "Dogs"], ["Sunrise", "Sunset"],
  ["Coffee", "Tea"], ["Sweet", "Salty"], ["Texting", "Calling"], ["City", "Countryside"],
  ["Pizza", "Burgers"], ["Netflix", "Board games"], ["Summer", "Winter"], ["Breakfast in bed", "Dinner out"],
  ["Plan everything", "Go with the flow"], ["Road trip", "Flight"], ["Dance", "Sing"], ["Rain", "Sun"],
  ["Big wedding", "Small wedding"], ["Morning person", "Night owl"], ["Books", "Films"], ["Hugs", "Kisses"],
  ["Love letters", "Surprise gifts"], ["Cook together", "Order in"], ["Horror", "Comedy"], ["Chocolate", "Ice cream"],
  ["Cuddle", "Space"], ["Picnic", "Restaurant"], ["Spontaneous", "Planned date"], ["Old house", "New flat"],
  ["Matching outfits", "Never"], ["Hot shower", "Cold shower"], ["Fries", "Rice"], ["Gym", "Long walk"],
  ["Concert", "Cinema"], ["Stay up late", "Wake up early"], ["Slow dance", "Party dance"], ["Camping", "Hotel"],
  ["Rings", "Tattoos"], ["Pancakes", "Waffles"], ["Bubble bath", "Massage"], ["Selfies", "Candid photos"],
  ["Holding hands", "Arm around shoulder"], ["Sweet nicknames", "Real names"], ["Jollof", "Fried rice"],
  ["Love songs", "Party songs"], ["Ocean", "Lake"], ["Rollercoaster", "Ferris wheel"], ["Flowers", "Chocolates"],
  ["Pyjamas all day", "Dress up"], ["Old-school love", "Modern love"], ["Kiss in the rain", "Kiss at sunset"],
];

export const LIKELY: string[] = [
  "cry at a film", "forget an anniversary", "fall asleep first on a date night", "start a fight over food",
  "plan a surprise", "get lost on a trip", "eat the last slice without asking", "dance in public",
  "spend too much on a gift", "say 'I'm fine' when they're not", "get hangry", "binge a whole series in one night",
  "text back instantly", "sing loudly in the car", "make friends with strangers", "lose their keys",
  "apologise first", "laugh at the wrong moment", "take a hundred selfies", "fall for a scam call",
  "become famous", "adopt a pet without asking", "wake up early on a weekend", "burn the food",
  "write a love letter", "cry at a wedding", "be late to their own wedding", "survive a horror film",
  "check the other's phone", "get jealous", "send a sweet message randomly", "steal the covers",
  "plan the perfect date", "forget what we argued about", "say yes to a crazy adventure", "talk in their sleep",
  "order for the other at a restaurant", "fake being sick to stay in", "post us online", "win at board games",
  "eat dessert first", "start a new hobby and quit", "kiss in public", "remember every little detail",
];

export const TRUTHS: string[] = [
  "What was your very first thought when you saw me?", "What is one thing I do that always makes you smile?",
  "When did you first realise you liked me?", "What's a small habit of mine you secretly love?",
  "What's your favourite memory of us?", "What's one thing you've never told me?",
  "What song reminds you of me?", "What do you think we do better than other couples?",
  "What was the best date we ever had?", "What's something you want us to try together?",
  "What is your favourite thing about my face?", "When do you feel most loved by me?",
  "What's the silliest thing you've done to impress me?", "What did you think of me after our first date?",
  "What's a dream you haven't told me yet?", "What's the nicest thing someone said about us?",
  "What do you miss most when we're apart?", "What's one thing you'd change about our routine?",
  "What's your favourite nickname for me?", "When was the last time I surprised you?",
  "Which of my outfits is your favourite?", "What's one thing I taught you?",
  "What would your perfect day with me look like?", "What made you fall for me?",
  "What's a moment you felt really proud of me?", "Have you ever been jealous? When?",
  "What's your favourite photo of us and why?", "What do you want us to be like in ten years?",
];

export const DARES: string[] = [
  "Sing the chorus of our song.", "Give me three compliments in ten seconds.", "Do your best impression of me.",
  "Send me a voice note saying why you love me.", "Show me the last photo you took.",
  "Describe our first date like a film trailer.", "Blow me a kiss in slow motion.",
  "Dance for ten seconds with no music.", "Speak in a romantic accent until your next turn.",
  "Tell me a joke. If I don't laugh, tell another.", "Make up a short poem about me.",
  "Change your wallpaper to a photo of us for a day.", "Do your most dramatic love confession.",
  "Text me a heart for every year you want us together.", "Show me your best flirty face.",
  "Plan our next date in thirty seconds.", "Hum a song and I have to guess it.",
  "Give me a new pet name and use it all game.", "Act out how you'd propose.",
  "Do your best runway walk.", "Say 'I love you' in three different ways.",
  "Tell me something you find cute about me, in a whisper.", "Make the funniest face you can for five seconds.",
  "Write my name with your finger in the air.", "Laugh like a villain.",
];

export const SENTENCES: string[] = [
  "The moment I knew I liked you was...", "My favourite thing about us is...", "I feel safest with you when...",
  "One day I want us to...", "You make me laugh when...", "The best gift you ever gave me was...",
  "I'm proud of you because...", "Our perfect weekend is...", "I still think about the time we...",
  "If I could relive one day with you, it would be...", "You are cutest when...", "A song that reminds me of you is...",
  "Something I've never told you is...", "I fall for you again when...", "The thing I'd miss most about you is...",
  "Our love feels like...", "If we had a theme song it would be...", "My favourite way to spend time with you is...",
  "You make ordinary days better by...", "Next year I want us to...",
];

export const BOT_LINES: string[] = [
  "the way you laugh at your own jokes.", "a long trip with no plans.", "you hum while cooking.",
  "a quiet evening and good food.", "every little thing, honestly.", "we danced in the kitchen.",
];

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick n items not in `seen`; when the bank runs dry it starts over. */
export function pickFresh<T>(bank: T[], keyOf: (t: T) => string, seen: Set<string>, n: number) {
  let pool = bank.filter((b) => !seen.has(keyOf(b)));
  let reset = false;
  if (pool.length < n) { pool = bank; reset = true; }
  return { items: shuffle(pool).slice(0, n), reset };
}

/** Memory Test — partner picks their real favourite, the other guesses. */
export const FAVOURITES: KnowUsItem[] = K("Favourites", [
  "Favourite food right now?|Jollof rice;Pizza;Suya;Pasta",
  "Favourite colour?|Black;Blue;Red;Green",
  "Perfect weekend?|Sleep in;Party;Church and family;Road trip",
  "Song mood tonight?|Afrobeats;Slow love songs;Gospel;Hip hop",
  "Dream trip?|Paris;Dubai;Zanzibar;New York",
  "Favourite drink?|Zobo;Coffee;Soda;Fresh juice",
  "Best movie type?|Romance;Action;Comedy;Horror",
  "Favourite season?|Rainy;Dry;Harmattan;Festive December",
  "Comfort snack?|Chin chin;Plantain chips;Chocolate;Puff puff",
  "Ideal date night?|Fancy dinner;Movie at home;Beach walk;Game night",
  "Favourite time of day?|Early morning;Afternoon;Evening;Late night",
  "Love language?|Words;Gifts;Touch;Quality time",
  "Pet choice?|Dog;Cat;Fish;No pets please",
  "Favourite dessert?|Ice cream;Cake;Fruit;Doughnut",
  "Dream car?|SUV;Sports car;Electric;Classic",
  "Morning routine?|Coffee first;Phone first;Pray first;Snooze button",
  "Favourite outfit?|Native wear;Jeans and tee;Suit or gown;Pyjamas",
  "Social battery?|Big crowds;Small circle;Just us two;Alone time",
  "Favourite sport to watch?|Football;Basketball;Athletics;None",
  "Favourite holiday?|Christmas;Valentine's;Birthday;New Year",
  "Best gift to receive?|Flowers;Gadgets;Clothes;Handwritten letter",
  "Favourite cuisine?|Nigerian;Chinese;Italian;Indian",
  "How to relax?|Music;Netflix;Sleep;Long talk",
  "Favourite flower?|Rose;Sunflower;Lily;Tulip",
]);

// ---------- extra rounds: more variety, nothing repeats until a bank is used up ----------
KNOW_US.push(
  ...K("Deep", [
    "What does {s} need most after a fight?|Space;A hug;A long talk;Food first",
    "{s}'s biggest fear for us?|Growing apart;Money stress;Distance;Nothing scares me",
    "What makes {s} feel truly respected?|Being listened to;Being trusted;Being defended;Being asked first",
    "When does {s} feel closest to {o}?|Late-night talks;Laughing together;Quiet cuddles;Praying together",
    "How does {s} show love without words?|Cooking;Fixing things;Small gifts;Always checking in",
    "What would {s} never forgive?|Lying;Cheating;Disrespect;Embarrassing me in public",
  ]),
  ...K("Naija life", [
    "{s}'s go-to buka order?|Amala and ewedu;Pounded yam and egusi;Rice and stew;Pepper soup",
    "Who haggles better at the market?|{s};{o};Neither, we pay full price;We send someone",
    "{s}'s reaction when NEPA takes light?|Sleeps;Complains loudly;Goes outside;Charges everything",
    "Owambe style for {s}?|Full aso-ebi;Simple and classy;Matching with {o};Stays home",
    "Who dances first at a party?|{s};{o};Both at once;Nobody, we eat",
    "{s}'s traffic mood?|Music loud;Phone calls;Angry at everyone;Sleeps in the car",
  ]),
  ...K("Sweet", [
    "Who said 'I love you' first?|{s};{o};Same time;Still not sure",
    "{s}'s favourite way to be kissed?|Forehead;Cheek;Hand;Surprise kiss",
    "Pet name {s} secretly loves?|Baby;Sweetheart;My love;Something silly",
    "What does {s} do when missing {o}?|Texts nonstop;Looks at our photos;Calls;Pretends to be fine",
    "{s}'s perfect anniversary?|Fancy dinner;Trip away;Quiet day at home;Surprise party",
  ]),
);

THIS_OR_THAT.push(
  ["Suya", "Shawarma"], ["Amala", "Pounded yam"], ["Afrobeats", "Highlife"], ["Lekki beach", "Badagry beach"],
  ["Owambe", "Small dinner"], ["Voice note", "Long text"], ["Puff puff", "Chin chin"], ["Nollywood", "Hollywood"],
  ["Surprise trip", "Planned holiday"], ["Morning cuddles", "Night cuddles"], ["Big house", "Fancy car"],
  ["Cook for me", "Take me out"], ["Matching rings", "Matching chains"], ["Netflix and chill", "Long drive"],
  ["Forehead kiss", "Back hug"], ["Love note", "Love song"], ["Zobo", "Chapman"], ["Plantain", "Yam"],
  ["Sleep early", "Gist till 2am"], ["Rainy day in", "Sunny day out"],
);

LIKELY.push(
  "haggle too hard at the market", "dance first at an owambe", "complain when NEPA takes light",
  "cry during an argument", "say sorry with food", "forget to reply a text", "spoil the kids",
  "plan a surprise trip", "propose in public", "steal food from the other's plate",
  "fall asleep during a movie", "get lost using Google Maps", "start gist at 2am", "buy matching outfits",
  "keep a secret birthday gift", "cry at our wedding", "change the playlist mid-song", "overthink a text",
);

TRUTHS.push(
  "What's the sweetest thing I've ever said to you?", "What's something about me you'd brag about to friends?",
  "When did you first know this was serious?", "What do you pray for when you pray for us?",
  "What's one fear you have about our future?", "What do I do that makes you feel safe?",
  "What's the funniest fight we've ever had?", "Which of my friends do you like most, honestly?",
  "What's a small thing I could do every day to make you happier?", "What would you name our first child?",
  "What's one thing you want me to stop doing, kindly?", "If we could move anywhere tomorrow, where?",
);

DARES.push(
  "Call me by my full name in your most loving voice.", "Do the shaku shaku for ten seconds.",
  "Tell me why you love me, but only in song.", "Send me the most romantic emoji-free text you can.",
  "Pretend to be my hype man for fifteen seconds.", "Describe me using only three food words.",
  "Do a sweet slow-motion wave like I'm leaving the airport.", "Recreate our first conversation from memory.",
  "Give me a two-sentence love speech like an award winner.", "Speak only in pidgin until your next turn.",
);

SENTENCES.push(
  "The first thing I noticed about you was...", "When we're old, I hope we still...", "My favourite photo of us is...",
  "You always know how to...", "The day I missed you most was...", "I want to thank you for...",
  "If I could cook you one meal forever, it would be...", "The most romantic thing you've done is...",
);

FAVOURITES.push(
  ...K("Favourites", [
    "Favourite swallow?|Amala;Pounded yam;Eba;Fufu",
    "Favourite Nollywood vibe?|Comedy skit;Romance;Thriller;Old-school classics",
    "Best way to apologise?|Words;Food;Gift;Hug",
    "Favourite way to spend money?|Food;Clothes;Travel;Saving",
    "Favourite app?|WhatsApp;TikTok;Instagram;X",
    "Favourite night out?|Lounge;Cinema;Concert;Restaurant",
    "Favourite smell?|Perfume;Rain;Food cooking;Fresh laundry",
    "Favourite childhood show?|Cartoons;Telenovelas;Nollywood;Sports",
  ]),
);
