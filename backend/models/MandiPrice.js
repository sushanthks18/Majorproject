import mongoose from 'mongoose';

const mandiPriceSchema = new mongoose.Schema({
  crop: {
    type: String,
    required: true,
    enum: ['Rice', 'Wheat', 'Cotton', 'Maize', 'Sugarcane', 'Mixed Vegetables']
  },
  location: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  minPrice: {
    type: Number,
    required: true
  },
  maxPrice: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
mandiPriceSchema.index({ crop: 1, location: 1, date: -1 });

export default mongoose.model('MandiPrice', mandiPriceSchema);
