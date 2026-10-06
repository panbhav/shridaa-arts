/* GitHub-backed static publishing. Credentials remain in private page memory. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShridaaGitHubPublisher = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  const config = Object.freeze({ owner: 'panbhav', repo: 'shridaa-arts', branch: 'main' });
  function validate(items) {
    if (!Array.isArray(items) || new Set(items.map(a => a.id)).size !== items.length || new Set(items.map(a => a.slug)).size !== items.length) throw new Error('The catalogue has invalid or duplicate identifiers.');
    for (const art of items) {
      if (!/^[\w-]+$/.test(art.id) || !/^[\w-]+$/.test(art.slug) || typeof art.name !== 'string' || !art.name.trim() || typeof art.category !== 'string' || !art.category.trim()) throw new Error('Invalid artwork name, category or identifier.');
      if (!Number.isFinite(art.price) || art.price < 0 || (art.originalPrice != null && (!Number.isFinite(art.originalPrice) || art.originalPrice < art.price))) throw new Error('Enter a valid price; original price must be at least the current price.');
      if (!['Available','Sold','Made to Order'].includes(art.availability)) throw new Error('Invalid artwork availability.');
      for (const image of [art.image,art.fallbackImage,...(art.gallery || [])].filter(Boolean)) if (!/^assets\/[\w./-]+\.(jpg|jpeg|png|webp)$/.test(image) || image.includes('..')) throw new Error('Invalid artwork image path.');
      if (!art.image) throw new Error('Please upload a photograph for the artwork.');
    }
    return items;
  }
  function patchArtwork(existing, input) {
    const art = { ...existing };
    for (const key of ['name','category','size','material','shortDescription','detailedDescription']) if (input[key] !== undefined) {
      if (typeof input[key] !== 'string' || input[key].length > 5000) throw new Error(`Invalid ${key}.`);
      art[key] = input[key].trim();
    }
    for (const key of ['price','originalPrice']) if (input[key] !== undefined) {
      if (key === 'originalPrice' && (input[key] === '' || input[key] === null)) art[key] = null;
      else { if (!['number','string'].includes(typeof input[key]) || input[key] === '') throw new Error('Enter a valid price.'); art[key] = Number(input[key]); }
    }
    for (const key of ['featured','isCustomizable','isPriceVisible']) if (input[key] !== undefined) {
      if (![true,false,'true','false'].includes(input[key])) throw new Error(`Invalid ${key}.`);
      art[key] = input[key] === true || input[key] === 'true';
    }
    if (input.availability !== undefined) art.availability = input.availability;
    return art;
  }
  function base64(bytes) {
    let binary = '';
    for (let i=0;i<bytes.length;i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(binary);
  }
  async function prepareImage(file) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 15*1024*1024) throw new Error('Choose a JPEG, PNG or WebP photo smaller than 15 MB.');
    let bitmap;
    try { bitmap = await createImageBitmap(file); } catch { throw new Error('This photograph could not be read. Please choose another image.'); }
    try {
      const scale = Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1,Math.round(bitmap.width*scale)); canvas.height = Math.max(1,Math.round(bitmap.height*scale));
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/webp',0.86));
      if (!blob || !['image/webp','image/png'].includes(blob.type)) throw new Error('This browser cannot optimize this photograph. Try an up-to-date browser.');
      return { content: base64(new Uint8Array(await blob.arrayBuffer())), extension: blob.type === 'image/webp' ? 'webp' : 'png', blob };
    } finally { bitmap.close(); }
  }
  class Publisher {
    #token = '';
    #head = '';
    #tree = '';
    #items = [];
    #busy = false;
    #fetch;
    #prepare;
    #notify;
    #previews = new Map();
    constructor({ fetch: transport = globalThis.fetch, prepare = prepareImage, onPublished = () => {} } = {}) { this.#fetch = transport; this.#prepare = prepare; this.#notify = onPublished; }
    disconnect() {
      this.#token = ''; this.#head = ''; this.#tree = ''; this.#items = [];
      for (const url of this.#previews.values()) URL.revokeObjectURL(url);
      this.#previews.clear();
    }
    previewImage(path) { return this.#previews.get(path) || path; }
    async #api(endpoint, method = 'GET', body) {
      if (!this.#token) throw new Error('Connect to GitHub before publishing.');
      let response;
      try {
        response = await this.#fetch(`https://api.github.com/repos/${config.owner}/${config.repo}${endpoint}`, { method, cache:'no-store', headers: { Accept:'application/vnd.github+json', Authorization:`Bearer ${this.#token}`, 'X-GitHub-Api-Version':'2026-03-10', ...(body ? {'Content-Type':'application/json'} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}) });
      } catch { throw new Error('Cannot reach GitHub. Check your connection; no website update has been confirmed.'); }
      if (!response.ok) {
        if (response.status === 401) { this.disconnect(); throw new Error('GitHub token expired or invalid. Connect again.'); }
        if (response.status === 403) throw new Error('GitHub refused this action. Check token permissions, repository rules or API rate limits.');
        if (response.status === 404) throw new Error('Repository or source file not found. Check access to panbhav/shridaa-arts.');
        if ([409,422].includes(response.status)) throw new Error('GitHub rejected the update. Reload the catalogue and check branch protection before trying again.');
        throw new Error(`GitHub could not complete this request (HTTP ${response.status}).`);
      }
      return response.json();
    }
    async connect(token) {
      this.disconnect();
      if (typeof token !== 'string' || !token.trim()) throw new Error('Enter your repository access token.');
      this.#token = token.trim();
      try {
        const repo = await this.#api('');
        if (!repo.permissions?.push) throw new Error('This GitHub account cannot write to this repository.');
        await this.load();
        return {token:'github-connected',user:config.owner};
      } catch (err) { this.disconnect(); throw err; }
    }
    async load() {
      if (this.#busy) throw new Error('Please wait for the current publication to finish.');
      const ref = await this.#api(`/git/ref/heads/${config.branch}`);
      const commit = await this.#api(`/git/commits/${ref.object.sha}`);
      const file = await this.#api(`/contents/data/artworks.json?ref=${ref.object.sha}`);
      if (file.encoding !== 'base64' || !file.content) throw new Error('GitHub did not return the source catalogue.');
      let items;
      try { const bytes = Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0)); items = validate(JSON.parse(new TextDecoder().decode(bytes))); }
      catch { throw new Error('The source catalogue is invalid. Restore a valid version in GitHub before publishing.'); }
      this.#head = ref.object.sha; this.#tree = commit.tree.sha; this.#items = items;
      return {artworks:structuredClone(items)};
    }
    async #publish(items, image) {
      validate(items);
      const ref = await this.#api(`/git/ref/heads/${config.branch}`);
      if (ref.object.sha !== this.#head) throw new Error('The catalogue changed in GitHub since you opened it. Reload this page before saving, so another update is not overwritten.');
      const json = await this.#api('/git/blobs','POST',{content:JSON.stringify(items,null,2)+'\n',encoding:'utf-8'});
      const entries = [{path:'data/artworks.json',mode:'100644',type:'blob',sha:json.sha}];
      if (image) { const blob = await this.#api('/git/blobs','POST',{content:image.content,encoding:'base64'}); entries.push({path:'public/'+image.path,mode:'100644',type:'blob',sha:blob.sha}); }
      const tree = await this.#api('/git/trees','POST',{base_tree:this.#tree,tree:entries});
      const commit = await this.#api('/git/commits','POST',{message:'Update artwork catalogue from Studio Manager',tree:tree.sha,parents:[this.#head]});
      // Never force push: concurrent branch updates must be rejected by GitHub.
      await this.#api(`/git/refs/heads/${config.branch}`,'PATCH',{sha:commit.sha,force:false});
      this.#head = commit.sha; this.#tree = tree.sha; this.#items = items;
      if (image?.blob) this.#previews.set(image.path,URL.createObjectURL(image.blob));
      this.#notify({commitUrl:`https://github.com/${config.owner}/${config.repo}/commit/${commit.sha}`,actionsUrl:`https://github.com/${config.owner}/${config.repo}/actions`,sha:commit.sha});
    }
    async request(url, options = {}) {
      const method = options.method || 'GET';
      const input = options.body instanceof FormData ? Object.fromEntries(options.body.entries()) : options.body ? JSON.parse(options.body) : {};
      if (url === 'api/admin/login') return this.connect(input.password);
      if (url === 'api/admin/verify') { if (!this.#token) throw new Error('Connect to GitHub.'); return {valid:true,user:config.owner}; }
      if (url === 'api/admin/artworks' && method === 'GET') return this.load();
      if (this.#busy) throw new Error('Please wait for the current publication to finish.');
      const match = url.match(/^api\/admin\/artworks(?:\/([\w-]+))?$/);
      if (!match || !['POST','PUT','DELETE'].includes(method) || (method !== 'POST' && !match[1]) || (method === 'POST' && match[1])) throw new Error('Unsupported studio action.');
      this.#busy = true;
      try {
        const items = structuredClone(this.#items);
        const index = match[1] ? items.findIndex(a=>a.id===match[1]) : -1;
        if (match[1] && index < 0) throw new Error('Artwork no longer exists. Reload the catalogue.');
        let artwork, image;
        if (method === 'DELETE') items.splice(index,1);
        else {
          if (method === 'POST') {
            const uuid = crypto.randomUUID();
            artwork = patchArtwork({id:'art-'+uuid,slug:'artwork-'+uuid,currency:'INR',originalPrice:null,availability:'Available',featured:false,isHandmade:true,isCustomizable:false,isPriceVisible:true,size:'',material:'',shortDescription:'',detailedDescription:'',displayOrder:Math.max(0,...items.map(a=>a.displayOrder || 0))+1},input);
          } else artwork = patchArtwork(items[index],input);
          if (input.imageFile?.size) {
            image = await this.#prepare(input.imageFile);
            image.path = `assets/artworks/upload-${crypto.randomUUID()}.${image.extension}`;
            artwork.image = artwork.fallbackImage = image.path; artwork.gallery = [image.path];
          }
          if (method === 'POST') items.push(artwork); else items[index] = artwork;
        }
        await this.#publish(items,image);
        return {success:true,artwork};
      } finally { this.#busy = false; }
    }
  }
  return {Publisher,config,validate,patchArtwork};
});
