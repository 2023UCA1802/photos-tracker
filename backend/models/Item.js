const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    date: { type: Date, required: true },
    image: { type: String, required: true }, // base64 data URI, stored directly in MongoDB
  },
  { timestamps: true }
);

// Speeds up folder lookups (grouping/filtering by name)
itemSchema.index({ name: 1 });

module.exports = mongoose.model('Item', itemSchema);
