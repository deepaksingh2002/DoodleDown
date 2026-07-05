import Word from '../models/Word.model.js';
import WordBank from '../utils/wordBank.js';
import localWords from '../data/words.json' assert { type: 'json' };
import { isDBConnected } from '../config/db.js';
import logger from '../utils/logger.js';

// Kept as an in-process fallback so the game NEVER stalls waiting on a word,
// even if MongoDB is unreachable mid-game.
const localBank = new WordBank(localWords);


class WordService {
 
  async getRandomWords(count = 3, categories = [], customWords = []) {
    if (customWords && customWords.length > 0) {
      const shuffled = [...customWords].sort(() => Math.random() - 0.5);
      if (shuffled.length >= count) return shuffled.slice(0, count);
      // not enough custom words supplied - top up with local/DB words
      const extra = await this._fetchFromDbOrLocal(count - shuffled.length, categories);
      return [...shuffled, ...extra];
    }

    return this._fetchFromDbOrLocal(count, categories);
  }

  async _fetchFromDbOrLocal(count, categories) {
    if (isDBConnected()) {
      try {
        const match = categories && categories.length ? { category: { $in: categories } } : {};
        const sample = await Word.aggregate([
          { 
            $match: match 
          }, 
          { 
            $sample: { size: count } 
          }
        ]);

        if (sample.length >= count) return sample.map((w) => w.text);
        logger.warn('Word DB returned fewer words than requested - topping up from local bank');

      } catch (err) {
        logger.error(`Word DB query failed, falling back to local word bank: ${err.message}`);
      }
    }
    return localBank.getRandomWords(count, categories);
  }

  /** Persists a host's custom word list, tagged to their room, for reuse/analytics */
  async saveCustomWords(roomId, words = []) {
    if (!isDBConnected() || words.length === 0) return;
    try {
      const docs = words.map((text) => ({
        updateOne: {
          filter: { text: text.toLowerCase().trim(), category: 'custom', roomId },
          update: { text: text.toLowerCase().trim(), category: 'custom', isCustom: true, roomId },
          upsert: true,
        },
      }));
      await Word.bulkWrite(docs);
    } catch (err) {
      logger.error(`Failed to persist custom words for room ${roomId}: ${err.message}`);
    }
  }

  async getCategories() {
    if (isDBConnected()) {
      try {

        const categories = await Word.aggregate([
          { $match: { 
              isCustom: { $ne: true } 
            } 
          },
          {
            $group: { 
              _id: '$category', 
              wordCount: { $sum: 1 } 
            } 
          },
          { $project: { 
              _id: 0, 
              name: '$_id', 
              wordCount: 1 
            } 
          },
          { 
            $sort: {
              name: 1 
            } 
          },
        ]);

        if (categories.length) return categories;
        
      } catch (err) {
        logger.error(`Failed to fetch categories from DB: ${err.message}`);
      }
    }
    return Object.keys(localWords).map((key) => ({ name: key, wordCount: localWords[key].length }));
  }
}

export default new WordService();
