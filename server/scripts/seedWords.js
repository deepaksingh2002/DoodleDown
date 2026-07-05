
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Word from '../src/models/Word.model.js';
import words from '../src/data/words.json' assert { type: 'json' };
import logger from '../src/utils/logger.js';

async function seed() {
  if (!env.MONGODB_URI) {
    logger.error('MONGODB_URI is not set in .env - cannot seed. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(env.MONGODB_URI);
  logger.info('Connected to MongoDB for seeding');

  const operations = [];
  for (const [category, wordList] of Object.entries(words)) {
    for (const text of wordList) {
      operations.push({
        updateOne: {
          filter: { text: text.toLowerCase(), category: category.toLowerCase(), language: 'en' },
          update: {
            text: text.toLowerCase(),
            category: category.toLowerCase(),
            language: 'en',
            isCustom: false,
          },
          upsert: true,
        },
      });
    }
  }

  const result = await Word.bulkWrite(operations);
  logger.info(
    `Seed complete: ${result.upsertedCount} inserted, ${result.matchedCount} already existed`
  );

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  logger.error(`Seeding failed: ${err.message}`);
  process.exit(1);
});
