const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { artworkPage, sitemap } = require('./pages.cjs');

function failure(message, status = 400) { return Object.assign(new Error(message), { status }); }
function readJson(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(data)) throw new Error('Storage must contain an array');
  return data;
}
function atomicWrite(file, data) {
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak');
    fs.renameSync(temp, file);
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
function text(value, label, required = false, limit = 5000) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) throw failure(`Invalid ${label}`);
  return value.trim();
}
function number(value, label, nullable = false) {
  if (nullable && (value === null || value === '')) return null;
  if (!['string', 'number'].includes(typeof value) || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0) throw failure(`Invalid ${label}`);
  return Number(value);
}
function bool(value, label) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw failure(`Invalid ${label}`);
}
function imagePath(value) {
  if (typeof value !== 'string' || !/^\/?assets\/[a-zA-Z0-9_./-]+\.(?:jpg|jpeg|png|webp)$/.test(value) || value.includes('..')) throw failure('Invalid artwork image path');
  return value.replace(/^\//, '');
}
function validateArtwork(body, existing = {}) {
  const out = { ...existing };
  for (const key of ['name', 'category', 'size', 'material', 'shortDescription', 'detailedDescription']) {
    if (body[key] !== undefined) out[key] = text(body[key], key, ['name', 'category'].includes(key));
  }
  for (const key of ['price', 'originalPrice', 'displayOrder']) if (body[key] !== undefined) out[key] = number(body[key], key, key === 'originalPrice');
  for (const key of ['featured', 'isHandmade', 'isCustomizable', 'isPriceVisible']) if (body[key] !== undefined) out[key] = bool(body[key], key);
  if (body.availability !== undefined) {
    if (!['Available', 'Sold', 'Made to Order'].includes(body.availability)) throw failure('Invalid availability');
    out.availability = body.availability;
  }
  if (body.image !== undefined || body.imageUrl !== undefined) {
    out.image = imagePath(body.image ?? body.imageUrl);
    out.fallbackImage = out.image;
    out.gallery = [out.image];
  }
  if (!out.name || !out.category || out.price === undefined) throw failure('Name, category and price are required');
  if (out.originalPrice !== null && out.originalPrice !== undefined && out.originalPrice < out.price) throw failure('Original price must be at least the current price');
  return out;
}
function publicArtwork(art) {
  const result = { ...art };
  delete result.originalAsset;
  if (art.isPriceVisible === false) { result.price = null; result.originalPrice = null; }
  return result;
}
function createApp(options = {}) {
  const root = options.root || path.resolve(__dirname, '..');
  const publicDir = options.publicDir || path.join(root, 'public');
  const storageDir = options.storageDir || process.env.STORAGE_DIR || path.join(root, 'data');
  const dataFile = path.join(storageDir, 'artworks.json');
  const enquiriesFile = path.join(storageDir, 'enquiries.json');
  const uploadDir = path.join(storageDir, 'uploads');
  const username = options.username || process.env.ADMIN_USERNAME;
  const secret = options.secret || process.env.JWT_SECRET;
  const password = options.password || process.env.ADMIN_PASSWORD;
  const hash = options.passwordHash || process.env.ADMIN_PASSWORD_HASH || (password && bcrypt.hashSync(password, 12));
  if (!username || !hash || !secret || secret.length < 32 || secret === 'shridaa_arts_secure_token_secret_key_2026' || ['admin123', 'shridaa@art2026', 'your_secure_password_here'].includes(password)) {
    throw new Error('Secure admin configuration required. Run npm run setup and inspect your private .env file.');
  }
  fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(dataFile)) fs.copyFileSync(path.join(root, 'data', 'artworks.json'), dataFile);
  function artworks() {
    const items = readJson(dataFile);
    if (new Set(items.map(a => a.id)).size !== items.length || new Set(items.map(a => a.slug)).size !== items.length || items.some(a => typeof a.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(a.id) || typeof a.slug !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(a.slug))) throw new Error('Invalid artwork identifiers in storage');
    return items;
  }
  artworks(); // Refuse to run with unreadable or corrupt catalogue storage.
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    if (req.path.startsWith('/api') || req.path.startsWith('/data')) res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '128kb' }));
  app.use(express.urlencoded({ extended: false, limit: '128kb' }));
  function limit(max, windowMs) {
    const hits = new Map();
    return (req, res, next) => {
      const now = Date.now();
      for (const [key, value] of hits) if (value.until <= now) hits.delete(key);
      const key = req.ip;
      const entry = hits.get(key) || { count: 0, until: now + windowMs };
      hits.set(key, entry);
      if (++entry.count > max) { res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000))); return res.status(429).json({ error: 'Too many attempts. Please try again later.' }); }
      next();
    };
  }
  function admin(req, res, next) {
    try {
      const token = (req.headers.authorization || '').match(/^Bearer (\S+)$/)?.[1];
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'shridaa-arts', audience: 'studio-admin' });
      if (decoded.user !== username || decoded.role !== 'artist_admin') throw new Error('Invalid role');
      req.admin = decoded;
      next();
    } catch { res.status(401).json({ error: 'Session expired or invalid. Please sign in.' }); }
  }
  const upload = multer({
    storage: multer.diskStorage({ destination: uploadDir, filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`) }),
    limits: { fileSize: 15 * 1024 * 1024, files: 1, fields: 20 },
    fileFilter: (req, file, cb) => {
      const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
      const expected = types[path.extname(file.originalname).toLowerCase()];
      cb(expected && expected === file.mimetype ? null : failure('Only JPEG, PNG and WebP images are permitted'), !!expected && expected === file.mimetype);
    }
  });
  function verifiedUpload(req) {
    if (!req.file) return undefined;
    const head = Buffer.alloc(12);
    const fd = fs.openSync(req.file.path, 'r');
    try { fs.readSync(fd, head, 0, 12, 0); } finally { fs.closeSync(fd); }
    const valid = req.file.mimetype === 'image/jpeg' ? head[0] === 255 && head[1] === 216 && head[2] === 255
      : req.file.mimetype === 'image/png' ? head.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP';
    if (!valid) throw failure('File contents do not match an allowed image format');
    return `assets/uploads/${req.file.filename}`;
  }
  app.post('/api/admin/login', limit(10, 15 * 60 * 1000), async (req, res) => {
    const user = text(req.body.username, 'username', true, 100);
    if (typeof req.body.password !== 'string' || !req.body.password || req.body.password.length > 200) throw failure('Invalid password');
    const pass = req.body.password;
    const valid = await bcrypt.compare(pass, hash);
    if (user !== username || !valid) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: jwt.sign({ user: username, role: 'artist_admin' }, secret, { expiresIn: '8h', issuer: 'shridaa-arts', audience: 'studio-admin', algorithm: 'HS256' }), user: username });
  });
  app.get('/api/admin/verify', admin, (req, res) => res.json({ valid: true, user: req.admin.user }));
  app.get('/api/admin/artworks', admin, (req, res) => res.json({ artworks: artworks() }));
  app.get('/api/artworks', (req, res) => {
    for (const value of Object.values(req.query)) if (typeof value !== 'string') throw failure('Filters must each be a single text value');
    let items = artworks();
    for (const key of ['category', 'availability']) if (req.query[key] && req.query[key] !== 'All') items = items.filter(a => a[key]?.toLowerCase() === req.query[key].toLowerCase());
    if (req.query.featured === 'true') items = items.filter(a => a.featured);
    if (req.query.search) { const q = req.query.search.toLowerCase().trim(); items = items.filter(a => ['name','category','shortDescription','material'].some(k => a[k]?.toLowerCase().includes(q))); }
    items.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
    res.json({ total: items.length, artworks: items.map(publicArtwork) });
  });
  app.get('/api/artworks/:id', (req, res) => {
    const art = artworks().find(a => a.id === req.params.id);
    if (!art) throw failure('Artwork not found', 404);
    res.json(publicArtwork(art));
  });
  app.get('/data/artworks.json', (req, res) => res.json(artworks().map(publicArtwork)));
  app.get('/api/categories', (req, res) => {
    const counts = new Map();
    for (const art of artworks()) counts.set(art.category, (counts.get(art.category) || 0) + 1);
    res.json([...counts].map(([name, count]) => ({ name, count })));
  });
  app.post('/api/contact', limit(10, 60 * 60 * 1000), async (req, res) => {
    const enquiry = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), name: text(req.body.name, 'name', true, 150), phone: text(req.body.phone || '', 'phone', false, 30), email: text(req.body.email || '', 'email', false, 254), message: text(req.body.message, 'message', true, 5000), artworkId: text(req.body.artworkId || '', 'artwork', false, 100) };
    if (!enquiry.phone && !enquiry.email) throw failure('Phone or email is required');
    if (enquiry.phone && !/^[+\d\s()-]{7,30}$/.test(enquiry.phone)) throw failure('Enter a valid phone number');
    if (enquiry.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enquiry.email)) throw failure('Enter a valid email address');
    const list = fs.existsSync(enquiriesFile) ? readJson(enquiriesFile) : [];
    list.push({ ...enquiry, notificationDelivered: false });
    atomicWrite(enquiriesFile, list);
    let delivered = false;
    if (process.env.ENQUIRY_WEBHOOK_URL) {
      try {
        const response = await fetch(process.env.ENQUIRY_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.ENQUIRY_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.ENQUIRY_WEBHOOK_TOKEN}` } : {}) }, body: JSON.stringify(enquiry), signal: AbortSignal.timeout(5000) });
        delivered = response.ok;
      } catch { console.error('Enquiry notification failed; enquiry remains saved in Studio inbox.'); }
      // Re-read after awaiting to preserve enquiries submitted concurrently.
      const latest = readJson(enquiriesFile);
      const stored = latest.find(e => e.id === enquiry.id);
      stored.notificationDelivered = delivered;
      atomicWrite(enquiriesFile, latest);
    }
    res.status(201).json({ success: true, notificationDelivered: delivered, message: delivered ? 'Your enquiry was saved and the studio was notified.' : 'Your enquiry was saved in the studio inbox. For a quicker response, please also contact Ashima on WhatsApp.' });
  });
  app.get('/api/admin/enquiries', admin, (req, res) => res.json({ enquiries: fs.existsSync(enquiriesFile) ? readJson(enquiriesFile) : [] }));
  function saveArtwork(req, res, creating) {
    try {
      const list = artworks();
      const index = creating ? -1 : list.findIndex(a => a.id === req.params.id);
      if (!creating && index < 0) throw failure('Artwork not found', 404);
      const defaults = creating ? { id: `art-${crypto.randomUUID()}`, currency: 'INR', originalPrice: null, featured: false, availability: 'Available', isPriceVisible: true, isHandmade: true, isCustomizable: false, displayOrder: Math.max(0, ...list.map(a => a.displayOrder || 0)) + 1, size: '', material: '', shortDescription: '', detailedDescription: '' } : list[index];
      const image = verifiedUpload(req);
      const art = validateArtwork({ ...req.body, ...(image ? { image } : {}) }, defaults);
      if (!art.image) throw failure('Please upload an artwork image');
      art.slug = defaults.slug || `${art.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'artwork'}-${art.id.slice(4)}`;
      if (creating) list.push(art); else list[index] = art;
      atomicWrite(dataFile, list);
      req.uploadSaved = true;
      res.status(creating ? 201 : 200).json({ success: true, artwork: art });
    } catch (err) { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); throw err; }
  }
  app.post('/api/admin/artworks', admin, upload.single('imageFile'), (req, res) => saveArtwork(req, res, true));
  app.put('/api/admin/artworks/:id', admin, upload.single('imageFile'), (req, res) => saveArtwork(req, res, false));
  app.patch('/api/admin/artworks/:id/price', admin, (req, res) => {
    if (req.body.price === undefined) throw failure('Price is required');
    saveArtwork(req, res, false);
  });
  app.delete('/api/admin/artworks/:id', admin, (req, res) => {
    const list = artworks();
    if (!list.some(a => a.id === req.params.id)) throw failure('Artwork not found', 404);
    atomicWrite(dataFile, list.filter(a => a.id !== req.params.id));
    res.json({ success: true });
  });
  app.get('/api/admin/export', admin, (req, res) => res.download(dataFile, 'shridaa-artworks.json'));
  app.get('/artwork/:slug/', (req, res) => {
    const art = artworks().find(a => a.slug === req.params.slug);
    if (!art) throw failure('Artwork not found', 404);
    res.type('html').send(artworkPage(publicArtwork(art)));
  });
  app.get('/sitemap.xml', (req, res) => res.type('xml').send(sitemap(artworks())));
  app.use('/assets/uploads', express.static(uploadDir, { dotfiles: 'deny', index: false }));
  app.use(express.static(publicDir, { dotfiles: 'deny' }));
  app.use((req, res) => req.path.startsWith('/api/') ? res.status(404).json({ error: 'Endpoint not found' }) : res.status(404).sendFile(path.join(publicDir, '404.html')));
  app.use((err, req, res, next) => {
    if (req.file && !req.uploadSaved && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    const status = err instanceof multer.MulterError ? 400 : err.status || 500;
    if (status === 500) console.error('Request failed:', err.message);
    res.status(status).json({ error: status === 500 ? 'The request could not be saved or loaded. Please try again.' : err.message });
  });
  return app;
}
module.exports = { createApp, atomicWrite, readJson, publicArtwork, validateArtwork };
