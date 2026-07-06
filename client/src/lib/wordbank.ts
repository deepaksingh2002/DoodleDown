export const WORD_BANK: Record<string, string[]> = {
  animals: [
    "elephant", "penguin", "octopus", "giraffe", "kangaroo", "dolphin",
    "hedgehog", "flamingo", "crocodile", "squirrel", "peacock", "walrus",
  ],
  objects: [
    "umbrella", "telescope", "backpack", "candle", "toothbrush", "ladder",
    "compass", "anchor", "kettle", "trophy", "envelope", "lantern",
  ],
  actions: [
    "juggling", "sneezing", "swimming", "yawning", "whispering", "climbing",
    "melting", "skating", "painting", "sleeping", "sprinting", "dancing",
  ],
  food: [
    "pancake", "avocado", "popcorn", "spaghetti", "pineapple", "sandwich",
    "burrito", "doughnut", "pretzel", "watermelon", "cupcake", "noodles",
  ],
  places: [
    "volcano", "lighthouse", "castle", "desert", "waterfall", "airport",
    "greenhouse", "iceberg", "cave", "windmill", "harbor", "stadium",
  ],
};

export function parseCustomWords(raw: string): string[] {
  return raw
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0);
}

export function randomWords(count: number, customPool: string[] = [], customOnly = false): string[] {
  const builtIn = Object.values(WORD_BANK).flat();
  const all = customOnly && customPool.length ? customPool : [...customPool, ...builtIn];
  const pool = [...all];
  const picked: string[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}
