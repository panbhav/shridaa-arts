const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function frontend(storage = '{}') {
  const nodes = {};
  const context = vm.createContext({ window: {}, localStorage: { getItem: () => storage, setItem: () => {} }, document: { addEventListener: () => {}, getElementById: id => nodes[id] || null }, console, setTimeout });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/js/ui.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/js/app.js'),'utf8'),context);
  return { context, nodes, ui: context.window.ShridaaUI, app: context.window.ShridaaApp };
}
test('malformed or wrongly typed shortlist storage does not stop initialization',()=>{
  for(const stored of ['broken','{}','null','42','[1,null,"art-001","art-001"]']) {
    const {app}=frontend(stored);assert.ok(Array.isArray(app.shortlist));assert.ok(app.shortlist.every(id=>typeof id==='string'));assert.equal(new Set(app.shortlist).size,app.shortlist.length);
  }
});
test('catalogue text is escaped and not placed in executable handlers',()=>{
  const {context}=frontend();
  const html=vm.runInContext(`createArtworkCardHtml({id:'art-test',slug:'art-test',name:'Artist\\\'s <img onerror=evil()> & Art',category:'A & B',image:'javascript:evil()',size:'<script>evil()</script>',price:50,isPriceVisible:false,originalPrice:100})`,context);
  assert.ok(!html.includes('onclick='));assert.ok(!html.includes('src="javascript:'));assert.ok(!html.includes('<img onerror='));assert.ok(html.includes('&lt;img onerror=evil()&gt;'));assert.ok(!html.includes('₹100'));assert.ok(html.includes('Price on Request'));
});
test('Made to Order filter has a distinct working state',()=>{
  const {context,app}=frontend();app.artworks=[{id:'one',name:'One',availability:'Sold'},{id:'two',name:'Two',availability:'Made to Order'}];app.activeAvailability='Made to Order';
  const filtered=vm.runInContext('getFilteredArtworks()',context);assert.equal(filtered.length,1);assert.equal(filtered[0].id,'two');
});
test('shortlist WhatsApp query preserves special characters without hidden price disclosure',()=>{
  const {context,app,nodes}=frontend();app.artworks=[{id:'one',name:'Artist & Mirror #1',price:500,isPriceVisible:false,image:'assets/test.jpg'}];app.shortlist=['one'];
  for(const id of ['shortlistItemsList','shortlistTotalVal','shortlistWhatsappBtn']) nodes[id]={};
  vm.runInContext('renderShortlist()',context);
  const url=new URL(nodes.shortlistWhatsappBtn.href);const message=url.searchParams.get('text');
  assert.ok(message.includes('Artist & Mirror #1'));assert.ok(message.includes('Price on Request'));assert.ok(!message.includes('500'));assert.ok(!nodes.shortlistTotalVal.textContent.includes('500'));
});
