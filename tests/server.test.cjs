const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createApp, atomicWrite } = require('../lib/server.cjs');
const { artworkPage, sitemap } = require('../lib/pages.cjs');
let server, base, storage, token;
const password = 'test-only-strong-password-837';
const root=path.resolve(__dirname,'..');
async function request(url,options={},authenticated=false) {
  const response=await fetch(base+url,{...options,headers:{...(options.body instanceof FormData ? {} : {'Content-Type':'application/json'}),...(authenticated?{Authorization:'Bearer '+token}:{}),...options.headers}});
  return {status:response.status,type:response.headers.get('content-type'),body:response.headers.get('content-type')?.includes('application/json')?await response.json():await response.text()};
}
before(async()=>{
  storage=fs.mkdtempSync(path.join(os.tmpdir(),'shridaa-test-'));
  // Fixtures must remain stable when the artist edits the real catalogue.
  fs.writeFileSync(path.join(storage,'artworks.json'),JSON.stringify([{id:'art-001',slug:'swarna-mandala-mirror',name:'Test Mirror',category:'Wall Mirrors',price:3499,originalPrice:3999,currency:'INR',availability:'Available',featured:true,isPriceVisible:true,image:'assets/artworks/swarna-mandala-mirror.jpg',gallery:[],size:'12 inches',shortDescription:'Test artwork'}]));
  const app=createApp({storageDir:storage,username:'test-admin',password,secret:'test-only-secret-'.repeat(4)});
  server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));base='http://127.0.0.1:'+server.address().port;
  const login=await request('/api/admin/login',{method:'POST',body:JSON.stringify({username:'test-admin',password})});
  assert.equal(login.status,200);token=login.body.token;
});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));if(path.dirname(storage)===os.tmpdir() && path.basename(storage).startsWith('shridaa-test-'))fs.rmSync(storage,{recursive:true,force:true});});
test('configuration rejects published defaults',()=>assert.throws(()=>createApp({storageDir:storage,username:'admin',password:'admin123',secret:'secret'}),/Secure admin configuration/));
test('public catalogue and canonical JSON agree',async()=>{
  const api=await request('/api/artworks');const json=await request('/data/artworks.json');
  assert.equal(api.status,200);assert.deepEqual(api.body.artworks,json.body);assert.equal(api.body.total,1);
});
test('private files and missing assets have real 404 responses',async()=>{
  for(const file of ['/server.js','/package.json','/.env','/data/enquiries.json','/missing.css','/unknown/page']) assert.equal((await request(file)).status,404,file);
  assert.equal((await request('/api/missing')).status,404);
});
test('invalid repeated filters return 400',async()=>assert.equal((await request('/api/artworks?search=a&search=b')).status,400));
test('admin endpoints require verified tokens',async()=>{
  assert.equal((await request('/api/admin/artworks')).status,401);
  assert.equal((await request('/api/admin/verify',{headers:{Authorization:'Bearer shridaa_studio_session_123'}})).status,401);
});
test('full edits persist and hidden prices stay private',async()=>{
  const r=await request('/api/admin/artworks/art-001',{method:'PUT',body:JSON.stringify({name:'Artist\'s <Mirror> & Art',isPriceVisible:false,availability:'Made to Order'})},true);
  assert.equal(r.status,200);assert.equal(r.body.artwork.price,3499);
  const api=await request('/api/artworks/art-001');assert.equal(api.body.price,null);assert.equal(api.body.originalPrice,null);
  assert.equal((await request('/data/artworks.json')).body[0].price,null);
  assert.equal((await request('/api/admin/artworks',{},true)).body.artworks[0].price,3499);
  const page=await request('/artwork/swarna-mandala-mirror/');assert.equal(page.status,200);assert.ok(page.body.includes('Artist&#39;s &lt;Mirror&gt; &amp; Art'));assert.ok(page.body.includes('Price on Request'));assert.ok(!page.body.includes('3499'));
  assert.equal((await request('/api/artworks?availability=Made%20to%20Order')).body.total,1);
});
test('invalid artwork values do not modify storage',async()=>{
  const previous=fs.readFileSync(path.join(storage,'artworks.json'),'utf8');
  for(const payload of [{price:-1},{price:'Infinity'},{name:{}},{featured:'falseish'},{availability:'Unknown'},{image:'../.env'},{originalPrice:2}]) assert.equal((await request('/api/admin/artworks/art-001',{method:'PUT',body:JSON.stringify(payload)},true)).status,400);
  assert.equal(fs.readFileSync(path.join(storage,'artworks.json'),'utf8'),previous);
});
test('creation, photo edit and delete/recreate persist unique identities',async()=>{
  async function add() {
    const form=new FormData();form.set('name','New & Handmade');form.set('category','Wall Art');form.set('price','0');form.set('featured','true');
    form.set('imageFile',new Blob([fs.readFileSync(path.join(root,'public/assets/artworks/swarna-mandala-mirror.jpg'))],{type:'image/jpeg'}),'photo.jpg');
    const r=await request('/api/admin/artworks',{method:'POST',body:form},true);assert.equal(r.status,201);return r.body.artwork;
  }
  const first=await add();assert.equal(first.price,0);assert.ok(fs.existsSync(path.join(storage,'uploads',path.basename(first.image))));
  assert.equal((await request('/'+first.image)).status,200);
  const form=new FormData();form.set('imageFile',new Blob([fs.readFileSync(path.join(root,'public/assets/artworks/mayura-peacock-mandala.jpg'))],{type:'image/jpeg'}),'second.jpg');
  const update=await request('/api/admin/artworks/'+first.id,{method:'PUT',body:form},true);
  assert.equal(update.status,200);assert.notEqual(update.body.artwork.image,first.image);assert.equal(update.body.artwork.fallbackImage,update.body.artwork.image);assert.deepEqual(update.body.artwork.gallery,[update.body.artwork.image]);
  assert.equal((await request('/api/admin/artworks/'+first.id,{method:'DELETE'},true)).status,200);
  const second=await add();assert.notEqual(first.id,second.id);
});
test('invalid image signature is rejected and removed',async()=>{
  const count=fs.readdirSync(path.join(storage,'uploads')).length;
  const form=new FormData();form.set('name','Bad image');form.set('category','Wall Art');form.set('price','12');form.set('imageFile',new Blob(['<script>bad</script>'],{type:'image/jpeg'}),'fake.jpg');
  assert.equal((await request('/api/admin/artworks',{method:'POST',body:form},true)).status,400);
  assert.equal(fs.readdirSync(path.join(storage,'uploads')).length,count);
});
test('enquiries persist and require authentication to read',async()=>{
  const r=await request('/api/contact',{method:'POST',body:JSON.stringify({name:'Test customer',phone:'9999999999',message:'Please share details.'})});
  assert.equal(r.status,201);assert.equal(r.body.notificationDelivered,false);assert.match(r.body.message,/saved/);
  assert.equal((await request('/api/admin/enquiries')).status,401);
  assert.equal((await request('/api/admin/enquiries',{},true)).body.enquiries[0].message,'Please share details.');
});
test('corrupt storage fails without overwriting the catalogue',async()=>{
  const file=path.join(storage,'artworks.json');const original=fs.readFileSync(file,'utf8');
  try {fs.writeFileSync(file,'broken');assert.equal((await request('/api/artworks')).status,500);assert.equal((await request('/api/admin/artworks/art-001',{method:'PUT',body:'{"price":100}'},true)).status,500);assert.equal(fs.readFileSync(file,'utf8'),'broken');} finally {fs.writeFileSync(file,original);}
});
test('atomic saves retain the previous version',()=>{
  const file=path.join(storage,'backup-test.json');atomicWrite(file,[1]);atomicWrite(file,[2]);assert.deepEqual(JSON.parse(fs.readFileSync(file+'.bak','utf8')),[1]);assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),[2]);
});
test('login attempts are rate limited',async()=>{
  let r;for(let i=0;i<11;i++) r=await request('/api/admin/login',{method:'POST',body:'{"username":"wrong","password":"wrong"}'});assert.equal(r.status,429);
});
test('SEO output escapes content and uses artwork page URLs',()=>{
  const xml=sitemap([{slug:'test',image:'assets/test.jpg',name:'A & B'}]);assert.ok(xml.includes('/artwork/test/'));assert.ok(xml.includes('A &amp; B'));assert.ok(!xml.includes('#artwork='));
  const html=artworkPage({slug:'test',name:'<script>',shortDescription:'A & B',image:'assets/test.jpg',isPriceVisible:false});assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('"offers"'));
});
