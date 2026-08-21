const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

/**
 * IMPORTANT ORDERING NOTE:
 * '/folders/all' and '/folder/:name' must be declared BEFORE '/:id',
 * otherwise Express will treat "folders" or "folder" as an :id value.
 */

// Create a new item (capture flow: photo + name + price + date)
router.post('/', async (req, res) => {
  try {
    const { name, price, date, image } = req.body;
    if (!name || price === undefined || !date || !image) {
      return res.status(400).json({ error: 'name, price, date and image are all required' });
    }
    const item = new Item({ name, price, date, image });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all items (flat list, rarely needed but useful for debugging)
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all "folders": one entry per distinct name, with count + thumbnail
router.get('/folders/all', async (req, res) => {
  try {
    const folders = await Item.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$name',
          count: { $sum: 1 },
          thumbnail: { $first: '$image' },
          latestDate: { $first: '$date' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all items inside one folder (i.e. all items with this name)
router.get('/folder/:name', async (req, res) => {
  try {
    const items = await Item.find({ name: req.params.name }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get one item by id
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update item details (and/or image). If "name" changes, the item
// automatically shows up under the new folder next time folders are
// listed, because folders are just a live grouping by the name field —
// nothing needs to be physically "moved".
router.put('/:id', async (req, res) => {
  try {
    const { name, price, date, image } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (price !== undefined) update.price = price;
    if (date !== undefined) update.date = date;
    if (image !== undefined) update.image = image;

    const item = await Item.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
