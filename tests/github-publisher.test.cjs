const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Publisher,validate}=require('../public/js/github-publisher.js');
const fixture=[{id:'art-test',slug:'test',name:'Test',category:'Wall Art',price:100,originalPrice:200,availability:'Available',image:'assets/artworks/test.jpg',gallery:[],isPriceVisible:true}];
test('default transport preserves the browser fetch receiver',async()=>{
  const originalFetch=globalThis.fetch;let called=false;
  globalThis.fetch=async function(){
    assert.equal(this,globalThis,'Native browser fetch must not receive Publisher as its receiver');
    called=true;return {ok:true,json:async()=>({permissions:{push:false}})};
  };
  try {
    const publisher=new Publisher();
    await assert.rejects(publisher.connect('test-only-token'),/cannot write/);
    assert.ok(called);
  } finally {globalThis.fetch=originalFetch;}
});
function mock({denied=false,race=false}={}) {
  const calls=[]; let head='head-1', stored=structuredClone(fixture), staged, count=0;
  const notifications=[];
  const fetch=async(url,options)=>{
    const endpoint=url.replace('https://api.github.com/repos/panbhav/shridaa-arts','');
    const body=options.body?JSON.parse(options.body):undefined;
    calls.push({endpoint,...options,body});
    let data={};
    if(endpoint==='') data={permissions:{push:true}};
    else if(endpoint==='/git/ref/heads/main') data={object:{sha:head}};
    else if(endpoint.startsWith('/git/commits/') && options.method==='GET') data={tree:{sha:'tree-base'}};
    else if(endpoint.startsWith('/contents/')) data={encoding:'base64',content:Buffer.from(JSON.stringify(stored)).toString('base64')};
    else if(endpoint==='/git/blobs') {
      if(denied)return {ok:false,status:403};
      if(body.encoding==='utf-8')staged=JSON.parse(body.content);
      data={sha:'blob-'+ ++count};
    } else if(endpoint==='/git/trees')data={sha:'tree-new'};
    else if(endpoint==='/git/commits')data={sha:'commit-new'};
    else if(endpoint==='/git/refs/heads/main') {
      if(race)return {ok:false,status:422};
      head=body.sha;stored=staged;
    } else throw new Error('Unexpected request '+endpoint);
    return {ok:true,json:async()=>data};
  };
  const publisher=new Publisher({fetch,onPublished:p=>notifications.push(p),prepare:async()=>({content:'cGhvdG8=',extension:'webp',blob:new Blob(['photo'],{type:'image/webp'})})});
  return {publisher,calls,notifications,setHead:value=>head=value,getStored:()=>stored};
}
const edit=(publisher,patch)=>publisher.request('api/admin/artworks/art-test',{method:'PUT',body:JSON.stringify(patch)});
test('edits publish through one atomic, non-forced Git commit',async()=>{
  const m=mock();await m.publisher.connect('test-private-token');await edit(m.publisher,{price:150,isPriceVisible:false,name:'Artist & Mirror'});
  assert.equal(m.getStored()[0].price,150);assert.equal(m.getStored()[0].isPriceVisible,false);
  const tree=m.calls.find(c=>c.endpoint==='/git/trees').body;
  assert.equal(tree.base_tree,'tree-base');assert.deepEqual(tree.tree.map(e=>e.path),['data/artworks.json']);
  assert.deepEqual(m.calls.find(c=>c.endpoint==='/git/commits').body.parents,['head-1']);
  assert.deepEqual(m.calls.find(c=>c.endpoint==='/git/refs/heads/main').body,{sha:'commit-new',force:false});
  assert.equal(m.notifications.length,1);
  for(const c of m.calls){assert.equal(c.headers.Authorization,'Bearer test-private-token');assert.ok(!JSON.stringify(c.body || {}).includes('test-private-token'));assert.ok(!c.endpoint.includes('test-private-token'));}
  assert.ok(!JSON.stringify(m.publisher).includes('test-private-token'));
});
test('new photo and catalogue enter the same tree; replacing a photo updates all references',async()=>{
  const m=mock();await m.publisher.connect('test');
  const body=new FormData();body.set('imageFile',new Blob(['photo'],{type:'image/jpeg'}),'photo.jpg');
  await m.publisher.request('api/admin/artworks/art-test',{method:'PUT',body});
  const tree=m.calls.find(c=>c.endpoint==='/git/trees').body.tree;
  assert.equal(tree.length,2);assert.match(tree[1].path,/^public\/assets\/artworks\/upload-.*\.webp$/);
  const art=m.getStored()[0];assert.equal(art.image,art.fallbackImage);assert.deepEqual(art.gallery,[art.image]);
  assert.match(m.publisher.previewImage(art.image),/^blob:/);m.publisher.disconnect();
});
test('concurrent branch updates stop publication before any writes',async()=>{
  const m=mock();await m.publisher.connect('test');m.setHead('someone-elses-commit');
  await assert.rejects(edit(m.publisher,{price:120}),/changed in GitHub/);
  assert.ok(!m.calls.some(c=>c.method!=='GET'));assert.equal(m.notifications.length,0);
});
test('a race during publication cannot force overwrite or claim success',async()=>{
  const m=mock({race:true});await m.publisher.connect('test');
  await assert.rejects(edit(m.publisher,{price:120}),/rejected/);
  assert.equal(m.getStored()[0].price,100);assert.equal(m.notifications.length,0);
  assert.equal(m.calls.find(c=>c.endpoint==='/git/refs/heads/main').body.force,false);
});
test('permission failures leave the source unchanged',async()=>{
  const m=mock({denied:true});await m.publisher.connect('test');await assert.rejects(edit(m.publisher,{price:120}),/refused/);
  assert.equal(m.getStored()[0].price,100);assert.equal(m.notifications.length,0);
});
test('invalid values fail before any write and connection credentials clear on logout',async()=>{
  const m=mock();await m.publisher.connect('test');
  for(const patch of [{price:-1},{price:''},{originalPrice:1},{featured:'wrong'},{availability:'Unknown'}])await assert.rejects(edit(m.publisher,patch));
  assert.ok(!m.calls.some(c=>c.method!=='GET'));m.publisher.disconnect();
  await assert.rejects(m.publisher.request('api/admin/verify'),/Connect/);
});
test('creation and deletion persist unique identities',async()=>{
  const m=mock();await m.publisher.connect('test');
  const body=new FormData();body.set('name','New');body.set('category','Wall Art');body.set('price','0');body.set('imageFile',new Blob(['photo'],{type:'image/jpeg'}),'photo.jpg');
  const first=await m.publisher.request('api/admin/artworks',{method:'POST',body});
  assert.equal(m.getStored().length,2);assert.equal(first.artwork.price,0);
  await m.publisher.request('api/admin/artworks/'+first.artwork.id,{method:'DELETE'});
  const second=await m.publisher.request('api/admin/artworks',{method:'POST',body});
  assert.notEqual(first.artwork.id,second.artwork.id);m.publisher.disconnect();
});
test('unsafe image paths and duplicate identifiers are rejected',()=>{
  assert.throws(()=>validate([{...fixture[0],image:'assets/../secret.jpg'}]),/image path/);
  assert.throws(()=>validate([...fixture,...fixture]),/duplicate identifiers/);
});
