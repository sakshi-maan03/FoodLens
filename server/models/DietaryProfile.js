import mongoose from 'mongoose';

const dietaryProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    allergies: {
      type: [String],
      default: [],
    },
    preferences: {
      type: [String],
      default: [],
    },
    restrictions: {
      type: [String],
      default: [],
    },
    customAvoid: {
      type: [String],
      default: [],
    },
    dietPlanEnabled: {
      type: Boolean,
      default: false,
    },
    dietPlanName: {
      type: String,
      default: '',
    },
    dietPlanNotes: {
      type: String,
      default: '',
    },
    maxSugarPer100g: {
      type: Number,
      default: null,
    },
    maxSodiumPer100g: {
      type: Number,
      default: null,
    },
    maxCaloriesPer100g: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const DietaryProfile =
  mongoose.models.DietaryProfile || mongoose.model('DietaryProfile', dietaryProfileSchema);
