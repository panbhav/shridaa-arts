const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'shridaa_arts_secure_token_secret_key_2026';
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
// Default password hash for 'shridaa@art2026'
let ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'shridaa@art2026', 10);

const DATA_FILE = path.join(__dirname, 'data', 'artworks.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'assets', 'artworks');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage for uploaded artwork images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname
      .replace(ext, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    cb(null, `upload-${Date.now()}-${safeName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype;
    if (allowed.test(ext) && (mime.startsWith('image/') || allowed.test(mime))) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, PNG and WebP images are permitted'));
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));
app.use('/Assets', express.static(path.join(__dirname, 'Assets')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Helper to read artworks
function readArtworks() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading artworks.json:', err);
    return [];
  }
}

// Helper to write artworks
function writeArtworks(artworks) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(artworks, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing artworks.json:', err);
    return false;
  }
}

// Auth Middleware
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

// PUBLIC API ROUTES

// 1. Get all artworks with optional filters
app.get('/api/artworks', (req, res) => {
  let artworks = readArtworks();
  const { category, availability, search, featured } = req.query;

  if (category && category !== 'All') {
    artworks = artworks.filter(a => a.category && a.category.toLowerCase() === category.toLowerCase());
  }

  if (availability && availability !== 'All') {
    artworks = artworks.filter(a => a.availability && a.availability.toLowerCase() === availability.toLowerCase());
  }

  if (featured === 'true') {
    artworks = artworks.filter(a => a.featured === true);
  }

  if (search) {
    const q = search.toLowerCase().trim();
    artworks = artworks.filter(a => 
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.category && a.category.toLowerCase().includes(q)) ||
      (a.shortDescription && a.shortDescription.toLowerCase().includes(q)) ||
      (a.material && a.material.toLowerCase().includes(q))
    );
  }

  // Sort by displayOrder ascending
  artworks.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));

  res.json({
    total: artworks.length,
    artworks
  });
});

// 2. Get single artwork
app.get('/api/artworks/:id', (req, res) => {
  const artworks = readArtworks();
  const artwork = artworks.find(a => a.id === req.params.id);
  if (!artwork) {
    return res.status(404).json({ error: 'Artwork not found' });
  }
  res.json(artwork);
});

// 3. Get distinct categories with counts
app.get('/api/categories', (req, res) => {
  const artworks = readArtworks();
  const catMap = {};
  artworks.forEach(a => {
    if (a.category) {
      catMap[a.category] = (catMap[a.category] || 0) + 1;
    }
  });
  const categories = Object.keys(catMap).map(name => ({
    name,
    count: catMap[name]
  }));
  res.json(categories);
});

// 4. Contact enquiry submission
app.post('/api/contact', (req, res) => {
  const { name, phone, email, message, artworkId } = req.body;
  if (!name || (!phone && !email)) {
    return res.status(400).json({ error: 'Name and contact info are required' });
  }
  // Log message safely
  console.log(`[Enquiry Received] Name: ${name}, Phone: ${phone}, Email: ${email}, Artwork: ${artworkId || 'General'}, Message: ${message}`);
  res.json({ success: true, message: 'Enquiry received. Ashima will respond shortly!' });
});

// ADMIN AUTHENTICATION ROUTES

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (username !== ADMIN_USER) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValid = bcrypt.compareSync(password, ADMIN_HASH);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ user: ADMIN_USER, role: 'artist_admin' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    success: true,
    token,
    user: ADMIN_USER,
    message: 'Welcome Ashima! Admin authentication successful.'
  });
});

// Verify Admin Token
app.get('/api/admin/verify', requireAdmin, (req, res) => {
  res.json({ valid: true, user: req.admin.user });
});

// ADMIN ARTWORK MANAGEMENT ROUTES

// 1. Quick Price Update
app.patch('/api/admin/artworks/:id/price', requireAdmin, (req, res) => {
  const { price, originalPrice } = req.body;
  const numPrice = Number(price);

  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: 'Valid price value is required' });
  }

  const artworks = readArtworks();
  const index = artworks.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Artwork not found' });
  }

  artworks[index].price = numPrice;
  if (originalPrice !== undefined) {
    artworks[index].originalPrice = originalPrice ? Number(originalPrice) : null;
  }

  writeArtworks(artworks);
  console.log(`[Price Updated] Artwork ${req.params.id} (${artworks[index].name}) -> ₹${numPrice}`);
  res.json({
    success: true,
    artwork: artworks[index],
    message: `Price for "${artworks[index].name}" updated to ₹${numPrice.toLocaleString('en-IN')}`
  });
});

// 2. Full Artwork Update
app.put('/api/admin/artworks/:id', requireAdmin, (req, res) => {
  const artworks = readArtworks();
  const index = artworks.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Artwork not found' });
  }

  const current = artworks[index];
  const {
    name, category, price, originalPrice, availability,
    featured, size, material, isHandmade, isCustomizable,
    displayOrder, shortDescription, detailedDescription,
    image, isPriceVisible
  } = req.body;

  artworks[index] = {
    ...current,
    name: name !== undefined ? name.trim() : current.name,
    category: category !== undefined ? category.trim() : current.category,
    price: price !== undefined ? Number(price) : current.price,
    originalPrice: originalPrice !== undefined ? (originalPrice ? Number(originalPrice) : null) : current.originalPrice,
    isPriceVisible: isPriceVisible !== undefined ? Boolean(isPriceVisible) : current.isPriceVisible,
    availability: availability !== undefined ? availability : current.availability,
    featured: featured !== undefined ? Boolean(featured) : current.featured,
    size: size !== undefined ? size.trim() : current.size,
    material: material !== undefined ? material.trim() : current.material,
    isHandmade: isHandmade !== undefined ? Boolean(isHandmade) : current.isHandmade,
    isCustomizable: isCustomizable !== undefined ? Boolean(isCustomizable) : current.isCustomizable,
    displayOrder: displayOrder !== undefined ? Number(displayOrder) : current.displayOrder,
    shortDescription: shortDescription !== undefined ? shortDescription.trim() : current.shortDescription,
    detailedDescription: detailedDescription !== undefined ? detailedDescription.trim() : current.detailedDescription,
    image: image || current.image
  };

  writeArtworks(artworks);
  res.json({ success: true, artwork: artworks[index] });
});

// 3. Add New Artwork (supports optional image upload)
app.post('/api/admin/artworks', requireAdmin, upload.single('imageFile'), (req, res) => {
  try {
    const {
      name, category, price, originalPrice, availability,
      featured, size, material, isHandmade, isCustomizable,
      shortDescription, detailedDescription
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Artwork name and price are required' });
    }

    const artworks = readArtworks();
    const newId = `art-${String(artworks.length + 1).padStart(3, '0')}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    let imagePath = '/assets/artworks/swarna-mandala-mirror.webp';
    if (req.file) {
      imagePath = `/assets/artworks/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imagePath = req.body.imageUrl;
    }

    const newArtwork = {
      id: newId,
      name: name.trim(),
      slug,
      category: category ? category.trim() : 'Mandala Art',
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      currency: 'INR',
      isPriceVisible: true,
      availability: availability || 'Available',
      featured: featured === 'true' || featured === true,
      size: size ? size.trim() : '12 × 12 inches',
      material: material ? material.trim() : 'MDF Base, Mud Dough, Mirror Work',
      isHandmade: isHandmade !== 'false',
      isCustomizable: isCustomizable === 'true' || isCustomizable === true,
      displayOrder: artworks.length + 1,
      shortDescription: shortDescription ? shortDescription.trim() : `${name} handcrafted Lippan Art piece.`,
      detailedDescription: detailedDescription ? detailedDescription.trim() : `${name} is an authentic handmade creation by Ashima Goyal.`,
      image: imagePath,
      gallery: [imagePath]
    };

    artworks.push(newArtwork);
    writeArtworks(artworks);

    res.status(201).json({ success: true, artwork: newArtwork });
  } catch (err) {
    console.error('Error adding artwork:', err);
    res.status(500).json({ error: 'Failed to add artwork' });
  }
});

// 4. Delete Artwork
app.delete('/api/admin/artworks/:id', requireAdmin, (req, res) => {
  let artworks = readArtworks();
  const exists = artworks.find(a => a.id === req.params.id);
  if (!exists) {
    return res.status(404).json({ error: 'Artwork not found' });
  }

  artworks = artworks.filter(a => a.id !== req.params.id);
  writeArtworks(artworks);
  res.json({ success: true, message: `Artwork ${req.params.id} removed successfully` });
});

// 5. Export JSON Backup
app.get('/api/admin/export', requireAdmin, (req, res) => {
  res.download(DATA_FILE, `shridaa-artworks-${Date.now()}.json`);
});

// SPA fallback for HTML5 routing
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`✨ Shridaa Arts Server running on http://localhost:${PORT}`);
  console.log(`🎨 Portfolio & Gallery: http://localhost:${PORT}`);
  console.log(`🔐 Admin Management: http://localhost:${PORT}#admin`);
  console.log(`📁 Centralized Data: ${DATA_FILE}`);
  console.log(`====================================================`);
});
