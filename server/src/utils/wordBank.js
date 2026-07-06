import words from '../data/words.js';
class WordBank {
  constructor(wordMap = words) {
    this.wordMap = wordMap;
    this.allWords = Object.values(wordMap).flat();
  }

  getRandomWords(count = 3, categories = null) {
    const pool =
      categories && categories.length > 0
        ? categories.flatMap((cat) => this.wordMap[cat] || [])
        : this.allWords;

    const source = pool.length >= count ? pool : this.allWords;
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  static normalize(text) {
    return String(text || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  static compareGuess(guess, targetWord) {
    const a = WordBank.normalize(guess);
    const b = WordBank.normalize(targetWord);

    if (a === b) return { exact: true, close: false };

    const distance = WordBank.levenshtein(a, b);
    const close = distance > 0 && distance <= Math.max(1, Math.floor(b.length * 0.2));
    return { exact: false, close };
  }

  static levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
      Array(b.length + 1).fill(0)
    );
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    return dp[a.length][b.length];
  }

  static buildHintMask(word, revealedIndices = new Set()) {
    return word
      .split('')
      .map((ch, idx) => {
        if (ch === ' ') return ' ';
        return revealedIndices.has(idx) ? ch : '_';
      })
      .join(' ');
  }
}

export default WordBank;
