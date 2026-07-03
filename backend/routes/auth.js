const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'novachart_secret_key_2024', { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: 'Tafadhali jaza sehemu zote' });

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ message: 'Jina au barua pepe tayari ipo' });

    const user = await User.create({ username, email, password });
    res.status(201).json({
      _id: user._id, username: user.username, email: user.email,
      avatar: user.avatar, token: generateToken(user._id)
    });
  } catch (err) {
    res.status(500).json({ message: 'Kosa la server', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Barua pepe au nywila si sahihi' });

    res.json({
      _id: user._id, username: user.username, email: user.email,
      avatar: user.avatar, bio: user.bio, token: generateToken(user._id)
    });
  } catch (err) {
    res.status(500).json({ message: 'Kosa la server', error: err.message });
  }
});

// GET /api/auth/users - Get all users (for contacts list)
router.get('/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Hujaidhinishwa' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'novachart_secret_key_2024');

    const users = await User.find({ _id: { $ne: decoded.id } })
      .select('-password').sort({ username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Kosa la server', error: err.message });
  }
});

module.exports = router;
