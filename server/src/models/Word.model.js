import mongoose from 'mongoose';

const wordSchema = new mongoose.Schema(
  {
    text: { 
      type: String, 
      required: true, 
      trim: true, 
      lowercase: true 
    },
    category: { 
      type: String, 
      required: true, 
      trim: true, 
      lowercase: true, 
      index: true 
    },
    language: { 
      type: String, 
      default: 'en', 
      lowercase: true, 
      trim: true, 
      index: true 
    },
    isCustom: { 
      type: Boolean, 
      default: false 
    },
    roomId: { 
      type: String, 
      default: null, 
      index: true 
    }, // set when isCustom = true
  },
  { timestamps: true }
);

wordSchema.index({ 
  category: 1, 
  language: 1 
});
// Prevent exact duplicate seed entries within the same category/language
wordSchema.index({ 
  text: 1, 
  category: 1, 
  language: 1 
}, { 
  unique: true 
});

export default mongoose.model('Word', wordSchema);
