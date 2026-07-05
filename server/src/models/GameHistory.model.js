import mongoose from 'mongoose';

const playerResultSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    score: Number,
  },
  { _id: false }
);

const gameHistorySchema = new mongoose.Schema(
  {
    roomId: { 
      type: String, 
      required: true, 
      index: true 

    },
    settings: { 
      type: mongoose.Schema.Types.Mixed 

    },
    players: [playerResultSchema],
    winner: playerResultSchema,
    totalRounds: Number,
    startedAt: Date,
    endedAt: { 
      type: Date, 
      default: Date.now 
    },
    durationMs: Number,
  },
  { timestamps: true }
);

gameHistorySchema.index({ endedAt: -1 });

export default mongoose.model('GameHistory', gameHistorySchema);
