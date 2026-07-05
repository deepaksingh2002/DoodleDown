import words from '../data/words.json' assert { type: 'json' };

/**
 * WordBank centralizes all word-selection and word-matching logic.
 * Keeping matching logic here (not scattered in socket handlers) makes it
 * easy to explain/test: "how does word-matching work?" -> this file.
 */
class WordBank {
  constructor(wordMap = words) {
    this.wordMap = wordMap;
    this.allWords = Object.values(wordMap).flat();
  }

  /**
   * Returns `count` unique random words, optionally scoped to given categories.
   */
  getRandomWords(count = 3, categories = null) {
    const pool =
      categories && categories.length > 0
        ? categories.flatMap((cat) => this.wordMap[cat] || [])
        : this.allWords;

    const source = pool.length >= count ? pool : this.allWords;
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Normalizes a guess/word for comparison:
   * - trims whitespace
   * - lowercases
   * - collapses internal multiple spaces
   */
  static normalize(text) {
    return String(text || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  /**
   * Compares a guess against the target word.
   * Returns { exact: boolean, close: boolean }
   * "close" = small edit distance (1-2 chars off) - used to nudge the guesser
   * without revealing the word, mirroring skribbl.io's "close guess" chat hint.
   */
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

  /**
   * Builds a masked "hint" version of the word, e.g. "_ _ a _ _" for "apple"
   * with index 2 revealed. Spaces in multi-word answers are preserved as spaces.
   */
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
