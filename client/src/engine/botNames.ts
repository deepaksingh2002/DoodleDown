export const BOT_NAMES = [
  "DoodleBot", "ChalkChomp", "InkyPixel", "ScribbleFox", "CrayonKid",
  "SketchySam", "MarkerMage", "PixelPanda", "SmudgeCat", "QuickQuill",
  "DaubDragon", "GlyphGoose",
];

export function pickBotName(taken: string[]): string {
  const pool = BOT_NAMES.filter((n) => !taken.includes(n));
  const list = pool.length ? pool : BOT_NAMES;
  return list[Math.floor(Math.random() * list.length)];
}
