export type DayType = "home" | "out" | "shoot";

export const QUOTES = [
  "November is for signing. January is for booking. Today is for both.",
  "Nobody sees the reps. Everybody sees the results.",
  "You don't need motivation. You need the next checkbox.",
  "Discipline today, digitals tomorrow.",
  "The agency sees one photo. You know the 14 days behind it.",
  "Small wins, stacked daily. That's the whole secret.",
  "Locked in. No parties, no excuses, just progress.",
  "Sleep is part of the program. Respect it.",
  "Show up for the shoot you haven't been booked for yet.",
  "Tight isn't a mood. It's a habit you repeat.",
  "The startup and the body get built the same way: daily.",
  "Every glass of water is a vote for the version of you on camera.",
];

export const TYPES: Record<DayType, { e: string; l: string; d: string }> = {
  home: { e: "🏠", l: "Home day", d: "Full schedule: lunch at 1, training at 4" },
  out: { e: "🚶", l: "Out day", d: "Quick workout, packed snacks, lunch by 5:30" },
  shoot: { e: "📸", l: "Shoot / casting", d: "Eat light, pump before, look fresh" },
};

// [minute of day, title, detail]
export type Slot = [number, string, string];
export const SCHEDS: Record<DayType, Slot[]> = {
  home: [
    [420, "Wake + water", "Two glasses before anything else"],
    [435, "Morning walk", "30 to 40 min outside"],
    [480, "Breakfast", "From the Eat tab"],
    [510, "Startup deep work", "Phone away, hardest task first"],
    [630, "Snack", "Fruit or yogurt"],
    [645, "Deep work, part 2", "Keep the momentum"],
    [780, "Lunch", "Your biggest meal of the day"],
    [825, "Startup work + calls", "Agency emails and applications too"],
    [930, "Pre-workout", "Banana or a small snack"],
    [960, "Training", "Workout of the day"],
    [1110, "Dinner", "Protein + veg, a small carb after training"],
    [1155, "Light work or content", "Posting, editing, admin"],
    [1290, "Wind down", "Day review, skincare, stretch"],
    [1365, "Sleep", "7 to 9 hours"],
  ],
  out: [
    [420, "Wake + water", "Two glasses before anything else"],
    [435, "Quick workout", "20-min version of today's session"],
    [480, "Breakfast", "Eat before you leave"],
    [510, "Pack food", "Banana, boiled eggs, water bottle"],
    [540, "Head out", "Walking counts as cardio"],
    [720, "Snack", "Banana, eggs or fruit"],
    [1050, "Lunch", "Grilled chicken, fish or pepper soup. No soft drink"],
    [1140, "Startup catch-up", "Emails, calls, one key task"],
    [1230, "Light dinner", "Small, protein + veg"],
    [1305, "Wind down", "Day review, skincare, stretch"],
    [1365, "Sleep", "7 to 9 hours"],
  ],
  shoot: [
    [420, "Wake + water", "Small sips through the day"],
    [435, "Light walk", "15 min, no hard training"],
    [480, "Light breakfast", "Eggs + fruit, low salt"],
    [510, "Prep", "Skincare, grooming, outfit"],
    [570, "Head out", "Carry water and a banana"],
    [630, "Light meal", "2 to 3 hours before call time"],
    [760, "Pump", "2 to 3 sets of push-ups, 20 min before"],
    [780, "Shoot / casting", "Posture tall, breathe, relax your face"],
    [960, "Proper meal", "Protein + carbs. You earned it"],
    [1080, "Recover", "Light walk or rest"],
    [1200, "Dinner", "Protein + veg"],
    [1290, "Wind down", "Day review, skincare, stretch"],
    [1365, "Sleep", "7 to 9 hours"],
  ],
};

// [exercise, prescription, sets]
export type Ex = [string, string, number];
export const WORKOUTS: Record<number, { name: string; rest?: boolean; ex: Ex[]; note?: string }> = {
  1: { name: "Upper push", ex: [["Push-ups", "4 x max", 4], ["Pike push-ups", "3 x 10", 3], ["Chair dips", "3 x 12", 3], ["Plank", "3 x 45s", 3]] },
  2: { name: "Lower", ex: [["Squats", "4 x 20", 4], ["Lunges", "3 x 12 each leg", 3], ["Glute bridges", "3 x 20", 3], ["Calf raises", "3 x 25", 3]] },
  3: { name: "Rest day", rest: true, ex: [["Walk", "45 to 60 min", 1], ["Stretch", "10 min", 1]] },
  4: { name: "Upper pull + core", ex: [["Pull-ups or table rows", "4 x max", 4], ["Superman holds", "3 x 30s", 3], ["Leg raises", "3 x 15", 3], ["Side plank", "3 x 30s each side", 3]] },
  5: {
    name: "Full body circuit",
    ex: [["15 squats", "per round", 4], ["12 push-ups", "per round", 4], ["10 rows", "per round", 4], ["20 mountain climbers", "per round", 4], ["30s plank", "per round", 4]],
    note: "4 rounds, minimal rest between moves",
  },
  6: { name: "Lower + core", ex: [["Bulgarian split squats", "3 x 10 each leg", 3], ["Wall sit", "3 x 45s", 3], ["Crunches", "3 x 20", 3], ["Russian twists", "3 x 20", 3]] },
  0: { name: "Rest day", rest: true, ex: [["Walk", "easy, as long as you like", 1], ["Plan the week", "10 min", 1]] },
};
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MEALS: Record<string, { t: string; o: string[] }> = {
  breakfast: {
    t: "Breakfast",
    o: ["3 boiled eggs + 1 slice bread + pineapple", "Greek yogurt + mashed banana + oats", "Egg wrap: 2 eggs, spinach, tomato in Lebanese bread", "Pap (no sugar) + boiled eggs on the side", "Oats cooked in water + banana"],
  },
  snack: {
    t: "Snack",
    o: ["Watermelon or papaya", "Carrots + cucumber + small handful of groundnuts", "Yogurt smoothie: yogurt, banana, pineapple", "Roasted corn", "Garden eggs", "Oranges", "Banana"],
  },
  main: {
    t: "Lunch (biggest meal)",
    o: [
      "Chicken wrap: roasted chicken, cooked cabbage + onion, cucumber, tomato, green pepper, yogurt sauce",
      "Grilled fish or eggs + 1 boiled ripe plantain + vegetable stir-fry",
      "Chicken + a fist of white rice + steamed veg",
      "Chicken + boiled sweet potato + cucumber-tomato salad",
    ],
  },
  dinner: {
    t: "Dinner",
    o: ["Fish or chicken pepper soup, light on seasoning cubes", "Egg and vegetable stir-fry (no oil)", "Suya wrap with less yaji + lots of veg", "Vegetable soup with fish, small swallow or none", "Veggie omelette (no oil)"],
  },
};

export const SHOP = [
  "Eggs (1 crate)", "Chicken for roasting", "Fish (titus, croaker or catfish)", "Greek yogurt, plain full-fat", "Lebanese bread", "Oats", "Pap",
  "Sweet potato", "Ripe plantain", "Rice (small bag)", "Watermelon", "Pineapple", "Papaya", "Bananas", "Oranges", "Avocado (if available)",
  "Cucumber", "Tomatoes", "Carrots", "Green pepper", "Onions", "Cabbage", "Spinach or ugu", "Garden eggs", "Garlic, ginger, lemons",
  "Unsalted groundnuts", "Green or ginger tea",
];

export const LEVELS = ["Locked In", "Focused", "Sharp", "Defined", "Camera Ready", "Agency Ready", "Booked"];
export const RATE = ["", "😞", "😕", "😐", "🙂", "🔥"];

export const PRESETS: [number, number, string][] = [
  [25, 5, "25 / 5"],
  [50, 10, "50 / 10"],
  [90, 15, "90 / 15"],
];
export const MUSIC: [string, string, string][] = [
  ["YouTube Music", "https://music.youtube.com/", "♫"],
  ["Lofi focus on YouTube", "https://www.youtube.com/results?search_query=lofi+focus+music", "▶"],
  ["Afrobeats instrumentals", "https://www.youtube.com/results?search_query=afrobeats+instrumental+study+mix", "▶"],
  ["Deep focus on Spotify", "https://open.spotify.com/search/deep%20focus", "♫"],
];

export const NF_B: [number, string][] = [
  [1, "Day One"], [3, "Spark"], [7, "One Week"], [14, "Fortnight"], [21, "Habit Formed"], [30, "Iron Will"], [60, "Monk Mode"], [90, "Legend"],
];
export const NF_MSG: Record<number, string> = {
  1: "The first day is the hardest decision. You made it.",
  3: "Three days. The fog starts lifting about now.",
  7: "One full week. Most people never get here.",
  14: "Two weeks. Same length as the whole plan. Built different.",
  21: "Three weeks. This is a habit now, not a fight.",
  30: "A month of discipline. Carry that into everything.",
  60: "Two months. Monk mode unlocked.",
  90: "Ninety days. Legend status.",
};
export const URGE = [
  "Drop and do 20 push-ups right now.",
  "Leave the room. Walk for 10 minutes.",
  "Drink a full glass of water, then splash your face.",
  "Open your startup to-do list and finish one small task.",
  "Put your phone in another room for 15 minutes.",
  "Do a 60-second plank. The urge fades before you finish.",
  "Call or text someone. Get out of your head.",
  "Do 30 squats. Move the energy somewhere useful.",
  "Start a 25-minute focus session. Right now.",
];
export const WHY0 = ["Energy and focus for agency season", "Discipline here spills into everything else", "The January version of me is watching"];

export type Reminder = { id: string; title: string; body: string; time: string; days: number[]; on: boolean };
export const DEFAULT_REMINDERS: Reminder[] = [
  { id: "r-wake", title: "Wake + water", body: "Two glasses before anything else.", time: "07:00", days: [], on: true },
  { id: "r-checkin", title: "Morning check-in", body: "What's today looking like? Set your priority.", time: "07:45", days: [], on: true },
  { id: "r-water1", title: "Water check", body: "Halfway to 8 glasses yet?", time: "11:00", days: [], on: true },
  { id: "r-lunch", title: "Lunch", body: "Biggest meal of the day. Protein first.", time: "13:00", days: [], on: true },
  { id: "r-train", title: "Training time", body: "Workout of the day is waiting.", time: "16:00", days: [1, 2, 4, 5, 6], on: true },
  { id: "r-water2", title: "Water check", body: "Top up. 8 glasses by tonight.", time: "17:00", days: [], on: true },
  { id: "r-review", title: "Put your day in order", body: "2-minute review. +15 XP.", time: "21:30", days: [], on: true },
  { id: "r-sleep", title: "Bed by 11", body: "Phone down. Recovery is when the tone shows.", time: "22:45", days: [], on: true },
];
