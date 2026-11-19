import mongoose from 'mongoose';

const scanHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      default: '',
    },
    barcode: {
      type: String,
      default: null,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    sourceType: {
      type: String,
      enum: ['barcode', 'ocr', 'manual'],
      required: true,
    },
    rawIngredientsText: {
      type: String,
      required: true,
    },
    verdict: {
      type: String,
      enum: ['Compatible', 'Caution', 'Not Recommended'],
      required: true,
      index: true,
    },
    summaryReason: {
      type: String,
      required: true,
    },
    conflicts: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    ingredientsBreakdown: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    nutrition: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isBookmarked: {
      type: Boolean,
      default: false,
    },
    userNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

scanHistorySchema.index({ userId: 1, createdAt: -1 });

export const ScanHistory =
  mongoose.models.ScanHistory || mongoose.model('ScanHistory', scanHistorySchema);
