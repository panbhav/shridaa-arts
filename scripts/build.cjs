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
// Static publishing uses GitHub; customers contact the studio directly.
const htmlFile=path.join(output,'index.html');
let html=fs.readFileSync(htmlFile,'utf8').replace('<body class="site-body">','<body class="site-body" data-static-site="true">');
html=html.replace('Your message will be saved in the studio inbox. You can also contact Ashima directly on WhatsApp.','Contact Ashima directly on WhatsApp or email to discuss an artwork or custom order.');
html=html.replace(/<form id="contactForm"[\s\S]*?<\/form>/,'<a class="btn btn-whatsapp" href="https://wa.me/919983466388" target="_blank" rel="noopener">Send your enquiry on WhatsApp</a>');
fs.writeFileSync(htmlFile,html);
const adminFile=path.join(output,'admin/index.html');
let admin=fs.readFileSync(adminFile,'utf8').replace('<body class="site-body">','<body class="site-body" data-admin-mode="github">');
admin=admin.replace('Welcome Ashima! Sign in to manage artwork information, update prices, or add new creations.','Connect to GitHub to add photographs, edit artwork details and publish your changes.');
// Match CRLF sources as well as LF sources.
admin=admin.replace(/<div class="form-group">(\s*<label for="adminUser">Username<\/label>)/,'<div class="form-group" hidden>$1');
admin=admin.replace('<label for="adminPass">Password</label>','<label for="adminPass">GitHub repository access token</label>');
admin=admin.replace('placeholder="Enter studio password"','placeholder="Paste your GitHub access token" autocomplete="off" spellcheck="false"');
admin=admin.replace('Sign In to Studio Manager','Connect to GitHub');
admin=admin.replace('aria-label="Show password" title="Show/Hide password"','aria-label="Show token" title="Show/Hide token"');
admin=admin.replace('<div class="admin-login-footer text-center">',`<div class="admin-login-footer text-center"><p>Use a fine-grained token for <strong>panbhav/shridaa-arts</strong> with <strong>Contents: Read and write</strong>. <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Create a token</a>.</p><p>Your token stays in this tab's memory. Connect again after closing or refreshing the page. Each save starts a website rebuild once GitHub Actions publishing is configured.</p>`);
admin=admin.replace(/  <section class="container section" id="enquiryInbox"[^\n]*\r?\n/,'');
fs.writeFileSync(adminFile,admin);
console.log(`Built ${items.length} artworks and detail pages in dist/, including the GitHub publishing admin.`);
