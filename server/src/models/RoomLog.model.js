import mongoose from 'mongoose';
import { ROOM_STATE } from '../config/constants.js';


const roomLogSchema = new mongoose.Schema(
  {
    roomId: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true 

    },
    isPrivate: { 
      type: Boolean,
      default: false 

    },
    settings: { 
      type: mongoose.Schema.Types.Mixed 

    },
    state: {
      type: String,
      enum: Object.values(ROOM_STATE),
      default: ROOM_STATE.WAITING,
    },
    peakPlayerCount: { 
      type: Number, 
      default: 0 

    },
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('RoomLog', roomLogSchema);
