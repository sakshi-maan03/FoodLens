import mongoose from 'mongoose';

const ingredientGlossarySchema = new mongoose.Schema(
  {
    canonicalName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    aliases: {
      type: [String],
      default: [],
    },
    eNumber: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    plainExplanation: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      default: '',
    },
    dietaryFlags: {
      type: [String],
      default: [],
    },
    defaultCaution: {
      type: Boolean,
      default: false,
    },
    cautionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const IngredientGlossary =
  mongoose.models.IngredientGlossary ||
  mongoose.model('IngredientGlossary', ingredientGlossarySchema);
