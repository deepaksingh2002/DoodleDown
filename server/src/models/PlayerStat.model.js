import mongoose from 'mongoose';

const playerStatSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true, 
      index: true,
    },
    gamesPlayed: { 
      type: Number, 
      default: 0 

    },
    gamesWon: { 
      type: Number, 
      default: 0 

    },
    totalScore: { 
      type: Number, 
      default: 0 

    },
    highestScore: { 
      type: Number, 
      default: 0 

    },
    lastPlayedAt: { 
      type: Date, 
      default: Date.now },
  },{ timestamps: true }
);

playerStatSchema.index({ totalScore: -1 });

export default mongoose.model('PlayerStat', playerStatSchema);
