const fs = require('node:fs');
const path = require('node:path');
const { publicArtwork } = require('../lib/server.cjs');
const { artworkPage, sitemap } = require('../lib/pages.cjs');
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'public');
const output = path.join(root, 'dist');
require('dotenv').config({ quiet: true });
const storage = process.env.STORAGE_DIR || path.join(root,'data');
const catalogueFile = fs.existsSync(path.join(storage,'artworks.json')) ? path.join(storage,'artworks.json') : path.join(root,'data/artworks.json');
const items = JSON.parse(fs.readFileSync(catalogueFile, 'utf8'));
if (!Array.isArray(items) || new Set(items.map(a => a.id)).size !== items.length || new Set(items.map(a => a.slug)).size !== items.length) throw new Error('Invalid catalogue identifiers');
function exactFile(relative) {
  if (relative.startsWith('assets/uploads/')) {
    const uploaded = path.join(storage,'uploads',path.basename(relative));
    if (!fs.existsSync(uploaded)) throw new Error(`Missing uploaded image: ${relative}`);
    return;
  }
  let current = src;
  for (const part of relative.replace(/^\//,'').split('/')) {
    if (!part || part === '..' || !fs.readdirSync(current).includes(part)) throw new Error(`Missing asset or incorrect capitalization: ${relative}`);
    current = path.join(current, part);
  }
  if (!fs.statSync(current).isFile()) throw new Error(`Not a file: ${relative}`);
}
for (const art of items) for (const asset of [art.image,art.fallbackImage,...(art.gallery || [])].filter(Boolean)) exactFile(asset);
const catalogue = JSON.stringify(items.map(publicArtwork), null, 2) + '\n';
fs.writeFileSync(path.join(src,'data/artworks.json'), catalogue);
fs.writeFileSync(path.join(src,'sitemap.xml'), sitemap(items));
fs.mkdirSync(output,{recursive:true});
// Clear only our verified build output; never operate on a computed parent directory.
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Unsafe output directory');
for (const name of fs.readdirSync(output)) fs.rmSync(path.join(output,name), { recursive:true, force:true });
fs.cpSync(src, output,{recursive:true});
if (fs.existsSync(path.join(storage,'uploads'))) fs.cpSync(path.join(storage,'uploads'),path.join(output,'assets/uploads'),{recursive:true});
for (const art of items) { const folder=path.join(output,'artwork',art.slug); fs.mkdirSync(folder,{recursive:true}); fs.writeFileSync(path.join(folder,'index.html'),artworkPage(publicArtwork(art))); }
// Explicit static-mode behavior: no browser-only CMS and no pretend enquiry submission.
const htmlFile=path.join(output,'index.html');
fs.writeFileSync(htmlFile,fs.readFileSync(htmlFile,'utf8').replace('<body class="site-body">','<body class="site-body" data-static-site="true">'));
console.log(`Built ${items.length} artworks and detail pages in dist/. Deploy public + Node for the CMS, or dist/ for a static portfolio.`);
