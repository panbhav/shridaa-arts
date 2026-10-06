/**
 * Shridaa Arts — Studio Admin CMS Panel Logic
 * Secure, simple management for Ashima Goyal
 * Supports Node-hosted CMS and GitHub-backed static publishing.
 */

const githubMode = document.body.dataset.adminMode === 'github';
const githubPublisher = githubMode ? new window.ShridaaGitHubPublisher.Publisher({onPublished: publication => {
  const status = document.getElementById('publishStatus');
  status.hidden = false;
  document.getElementById('publishMessage').textContent = 'Saved to GitHub. The website rebuild is pending; check publishing progress below.';
  document.getElementById('publishCommit').href = publication.commitUrl;
  document.getElementById('publishProgress').href = publication.actionsUrl;
}}) : null;

window.ShridaaAdmin = {
  token: getAdminToken(),
  artworks: [],
  editingId: null
};

// Toast Notification Utility (Standalone support for Admin Portal)
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
window.showToast = window.showToast || showToast;

// Check session on load or view change
async function checkAdminSession() {
  if (!window.ShridaaAdmin.token) { showAdminLogin(); return; }
  try {
    await adminRequest('api/admin/verify');
    document.getElementById('adminLoginBox').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    await loadAdminDashboardData(); await loadEnquiries();
  } catch (err) { showAdminLogin(); showToast(err.message, 'error'); }
}

// Admin Login
async function handleAdminLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('adminLoginBtn');
  const status = document.getElementById('adminLoginStatus');
  btn.disabled = true;
  try {
    const password = document.getElementById('adminPass').value;
    document.getElementById('adminPass').value = '';
    const data = await adminRequest('api/admin/login', { method: 'POST', body: JSON.stringify({ username: document.getElementById('adminUser').value.trim(), password }) });
    window.ShridaaAdmin.token = data.token;
    try { if (!githubMode) sessionStorage.setItem('shridaa_admin_token', data.token); localStorage.removeItem('shridaa_admin_token'); localStorage.removeItem('shridaa_local_artworks'); } catch {}
    document.getElementById('adminPass').value = '';
    status.textContent = ''; await checkAdminSession();
  } catch (err) { status.textContent = err.message; status.className = 'admin-login-status error'; }
  finally { btn.disabled = false; }
}

// Admin Logout
function logoutAdmin() {
  githubPublisher?.disconnect();
  window.ShridaaAdmin.artworks = [];
  document.getElementById('adminTableBody').replaceChildren();
  window.ShridaaAdmin.token = null;
  try { sessionStorage.removeItem('shridaa_admin_token'); localStorage.removeItem('shridaa_admin_token'); } catch {}
  showAdminLogin();
  showToast('Signed out of Studio Manager', 'info');
}

// Load Artworks Data for Dashboard
async function loadAdminDashboardData() {
  const data = await adminRequest('api/admin/artworks');
  window.ShridaaAdmin.artworks = data.artworks;
  renderAdminStats(); renderAdminTable(document.getElementById('adminSearchInput')?.value || '');
}

// Render Stats Cards
function renderAdminStats() {
  const artworks = window.ShridaaAdmin.artworks;
  const totalEl = document.getElementById('adminTotalCount');
  const availEl = document.getElementById('adminAvailableCount');
  const featEl = document.getElementById('adminFeaturedCount');
  const catEl = document.getElementById('adminCategoryCount');

  if (totalEl) totalEl.textContent = artworks.length;
  if (availEl) availEl.textContent = artworks.filter(a => a.availability === 'Available').length;
  if (featEl) featEl.textContent = artworks.filter(a => a.featured).length;

  const cats = new Set(artworks.map(a => a.category).filter(Boolean));
  if (catEl) catEl.textContent = cats.size;
}

// Render Artworks Management Table
function renderAdminTable(filterQuery = '') {
  const tbody = document.getElementById('adminTableBody');
  if (!tbody) return;

  let list = [...window.ShridaaAdmin.artworks];
  if (filterQuery) {
    const q = filterQuery.toLowerCase().trim();
    list = list.filter(a => 
      a.name.toLowerCase().includes(q) ||
      (a.category && a.category.toLowerCase().includes(q)) ||
      (a.id && a.id.toLowerCase().includes(q))
    );
  }

  tbody.innerHTML = list.map(raw => {
    const art = window.ShridaaUI.htmlArtwork(raw);
    const imgUrl = adminImage(raw.fallbackImage || raw.image);
    const isAvail = art.availability === 'Available';
    const isFeat = art.featured === true;

    return `
      <tr data-id="${art.id}">
        <td>
          <img src="${imgUrl}" class="table-thumb" alt="${art.name}">
        </td>
        <td>
          <strong>${art.name}</strong><br>
          <small class="text-muted">${art.id} • ${art.size || 'Size N/A'}</small>
        </td>
        <td>
          <span class="detail-category">${art.category || '—'}</span>
        </td>
        <td>
          <div class="inline-price-edit">
            <span>₹</span>
            <input type="number" 
                   class="inline-price-input" 
                   id="priceInput-${art.id}" 
                   value="${art.price || 0}" 
                   min="0">
            <button type="button" 
                    class="inline-price-btn" 
                    data-admin-action="price" data-art-id="${art.id}"
                    title="Click to save updated price">
              Save
            </button>
          </div>
        </td>
        <td>
          <button type="button" 
                  class="btn-icon ${isAvail ? 'text-success' : ''}" 
                  data-admin-action="availability" data-art-id="${art.id}"
                  title="Toggle status">
            ${art.availability || 'Available'}
          </button>
        </td>
        <td>
          <button type="button" 
                  class="btn-icon ${isFeat ? 'text-gold' : ''}" 
                  data-admin-action="featured" data-art-id="${art.id}"
                  title="Toggle featured">
            ${isFeat ? '★ Featured' : '☆ Standard'}
          </button>
        </td>
        <td>
          <div class="admin-row-actions">
            <button type="button" class="btn-icon" data-admin-action="edit" data-art-id="${art.id}" title="Full Edit">
              Edit
            </button>
            <button type="button" class="btn-icon btn-icon-danger" data-admin-action="delete" data-art-id="${art.id}" title="Delete Artwork">
              ✕
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// 1-Click Inline Price Save
async function quickSavePrice(artworkId) {
  const input = document.getElementById('priceInput-' + artworkId);
  const price = Number(input.value);
  if (input.value === '' || !Number.isFinite(price) || price < 0) { showToast('Enter a valid price', 'error'); return; }
  const current = window.ShridaaAdmin.artworks.find(a => a.id === artworkId);
  await saveQuick(artworkId, { price, ...(current.originalPrice && current.originalPrice < price ? { originalPrice: null } : {}) }, 'Price saved');
}

// Toggle Availability Quick Action
async function toggleAvailability(artworkId) {
  const art=window.ShridaaAdmin.artworks.find(a=>a.id===artworkId);
  const statuses=['Available','Sold','Made to Order'];
  await saveQuick(artworkId,{availability:statuses[(statuses.indexOf(art.availability)+1)%statuses.length]},'Availability saved');
}

// Toggle Featured Quick Action
async function toggleFeatured(artworkId) {
  const art=window.ShridaaAdmin.artworks.find(a=>a.id===artworkId);
  await saveQuick(artworkId,{featured:!art.featured},'Featured status saved');
}

// Delete Artwork
async function deleteArtwork(artworkId) {
  const art = window.ShridaaAdmin.artworks.find(a => a.id === artworkId);
  if (!confirm('Remove ' + art.name + ' from the portfolio?')) return;
  try { await adminRequest('api/admin/artworks/' + encodeURIComponent(artworkId),{method:'DELETE'}); await loadAdminDashboardData(); showToast(githubMode ? 'Removal saved to GitHub; website rebuild pending' : 'Artwork removed from the server','success'); }
  catch(err) { showToast(err.message,'error'); }
}

// Helper to read, scale, and compress uploaded photo for fast loading and storage
function readAndOptimizeImage(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(null);
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// Open Add Artwork Modal
function openAddArtworkModal() {
  window.ShridaaAdmin.editingId = null;
  const modal = document.getElementById('adminArtworkModal');
  const heading = document.getElementById('adminModalHeading');
  const form = document.getElementById('adminArtworkForm');
  const preview = document.getElementById('formArtCurrentImgPreview');
  const fileInput = document.getElementById('formArtImageFile');

  if (heading) heading.textContent = 'Add New Artwork';
  if (form) form.reset();
  if (fileInput) fileInput.value = '';
  if (preview) {
    preview.style.display = 'none';
    preview.innerHTML = '';
  }

  document.getElementById('editArtworkId').value = '';
  document.getElementById('formArtAvailability').value = 'Available';
  document.getElementById('formArtFeatured').checked = false;
  document.getElementById('formArtPriceVisible').checked = true;
  document.getElementById('formArtCustomizable').checked = true;

  if (modal) modal.style.display = 'flex';
}

// Open Edit Artwork Modal
function openEditArtworkModal(artworkId) {
  const art = window.ShridaaAdmin.artworks.find(a => a.id === artworkId);
  if (!art) return;

  window.ShridaaAdmin.editingId = artworkId;
  const modal = document.getElementById('adminArtworkModal');
  const heading = document.getElementById('adminModalHeading');
  const preview = document.getElementById('formArtCurrentImgPreview');
  const fileInput = document.getElementById('formArtImageFile');

  if (heading) heading.textContent = `Edit "${art.name}"`;
  if (fileInput) fileInput.value = '';

  document.getElementById('editArtworkId').value = art.id;
  document.getElementById('formArtName').value = art.name;
  document.getElementById('formArtCategory').value = art.category || '';
  document.getElementById('formArtPrice').value = art.price ?? '';
  document.getElementById('formArtOrigPrice').value = art.originalPrice || '';
  document.getElementById('formArtSize').value = art.size || '';
  document.getElementById('formArtMaterial').value = art.material || '';
  document.getElementById('formArtAvailability').value = art.availability || 'Available';
  document.getElementById('formArtFeatured').checked = Boolean(art.featured);
  document.getElementById('formArtPriceVisible').checked = art.isPriceVisible !== false;
  document.getElementById('formArtCustomizable').checked = Boolean(art.isCustomizable);
  document.getElementById('formArtShortDesc').value = art.shortDescription || '';
  document.getElementById('formArtDetailedDesc').value = art.detailedDescription || '';

  if (preview) {
    preview.style.display = 'block';
    preview.innerHTML = `
      <small class="text-muted">Current Artwork Photo:</small><br>
      <img src="${adminImage(art.fallbackImage || art.image)}" alt="${window.ShridaaUI.escapeHtml(art.name)}">
    `;
  }

  if (modal) modal.style.display = 'flex';
}

function closeAdminModal() {
  const modal = document.getElementById('adminArtworkModal');
  if (modal) modal.style.display = 'none';
}

// Handle Add / Edit Form Submit
async function handleAdminArtworkFormSubmit(e) {
  e.preventDefault();
  const form=document.getElementById('adminArtworkForm');
  const saveBtn=form.querySelector('button[type="submit"]');
  const data=new FormData(form);
  for(const key of ['featured','isCustomizable','isPriceVisible']) data.set(key,String(document.getElementById({featured:'formArtFeatured',isCustomizable:'formArtCustomizable',isPriceVisible:'formArtPriceVisible'}[key]).checked));
  const file=document.getElementById('formArtImageFile').files[0];
  if (!file) data.delete('imageFile');
  if (file && file.size > 15*1024*1024) { showToast('Please choose an image smaller than 15 MB','error'); return; }
  saveBtn.disabled=true; saveBtn.textContent='Saving...';
  try {
    const id=window.ShridaaAdmin.editingId;
    await adminRequest('api/admin/artworks' + (id ? '/' + encodeURIComponent(id) : ''), {method:id ? 'PUT' : 'POST',body:data});
    await loadAdminDashboardData(); closeAdminModal(); showToast(githubMode ? 'Saved to GitHub; website rebuild pending' : 'Artwork saved to the server','success');
  } catch(err) { showToast(err.message,'error'); }
  finally {saveBtn.disabled=false;saveBtn.textContent='Save Artwork';}
}

// Export Backup JSON
function exportBackupJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.ShridaaAdmin.artworks, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `shridaa-artworks-${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Downloaded updated artworks.json backup!', 'success');
}

// Bind admin methods to window
window.ShridaaAdmin.checkSession = checkAdminSession;
window.ShridaaAdmin.quickSavePrice = quickSavePrice;
window.ShridaaAdmin.toggleAvailability = toggleAvailability;
window.ShridaaAdmin.toggleFeatured = toggleFeatured;
window.ShridaaAdmin.deleteArtwork = deleteArtwork;
window.ShridaaAdmin.openEditModal = openEditArtworkModal;

// DOM setup for Admin
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('adminLoginForm');
  const logoutBtn = document.getElementById('adminLogoutBtn');
  const openAddBtn = document.getElementById('openAddArtworkBtn');
  const exportBtn = document.getElementById('exportBackupBtn');
  const adminSearch = document.getElementById('adminSearchInput');
  const modalClose = document.getElementById('adminModalCloseBtn');
  const cancelBtn = document.getElementById('adminCancelBtn');
  const artworkForm = document.getElementById('adminArtworkForm');

  // Password Visibility Toggle Button
  const togglePassBtn = document.getElementById('toggleAdminPass');
  const passInput = document.getElementById('adminPass');
  if (togglePassBtn && passInput) {
    togglePassBtn.addEventListener('click', () => {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      const eyeShow = togglePassBtn.querySelector('.eye-show');
      const eyeHide = togglePassBtn.querySelector('.eye-hide');
      if (eyeShow) eyeShow.style.display = isPass ? 'none' : 'block';
      if (eyeHide) eyeHide.style.display = isPass ? 'block' : 'none';
      const credential = githubMode ? 'token' : 'password';
      togglePassBtn.setAttribute('aria-label', (isPass ? 'Hide ' : 'Show ') + credential);
      togglePassBtn.setAttribute('title', (isPass ? 'Hide ' : 'Show ') + credential);
    });
  }

  if (loginForm) loginForm.addEventListener('submit', handleAdminLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', logoutAdmin);
  if (openAddBtn) openAddBtn.addEventListener('click', openAddArtworkModal);
  if (exportBtn) exportBtn.addEventListener('click', exportBackupJson);

  if (adminSearch) {
    adminSearch.addEventListener('input', (e) => {
      renderAdminTable(e.target.value);
    });
  }

  // Image File Change Listener for instant preview
  const artImageInput = document.getElementById('formArtImageFile');
  if (artImageInput) {
    artImageInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      const preview = document.getElementById('formArtCurrentImgPreview');
      if (file && preview) {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          preview.style.display = 'block';
          preview.innerHTML = `
            <small style="color: var(--color-terracotta); font-weight: 700; display: block; margin-bottom: 4px;">✓ New Photo Selected:</small>
            <img src="${loadEvt.target.result}" alt="New Photo Preview" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid var(--color-terracotta);">
          `;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (modalClose) modalClose.addEventListener('click', closeAdminModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeAdminModal);
  if (artworkForm) artworkForm.addEventListener('submit', handleAdminArtworkFormSubmit);
});

function getAdminToken() { if (githubMode) return null; try {return sessionStorage.getItem('shridaa_admin_token') || null;} catch {return null;} }
function adminImage(path) { return window.ShridaaUI.escapeHtml(githubPublisher ? githubPublisher.previewImage(window.ShridaaUI.safeImage(path)) : window.ShridaaUI.safeImage(path)); }
function showAdminLogin() {
  document.getElementById('adminLoginBox').style.display='block'; document.getElementById('adminDashboard').style.display='none';
  const inbox=document.getElementById('enquiryInbox'); if(inbox) inbox.hidden=true;
}
async function adminRequest(url,options={}) {
  if (githubPublisher) return githubPublisher.request(url,options);
  const headers={...(options.body instanceof FormData ? {} : {'Content-Type':'application/json'}), ...(window.ShridaaAdmin.token ? {Authorization:'Bearer '+window.ShridaaAdmin.token} : {}),...options.headers};
  let response;
  try {response=await fetch(url,{...options,headers,cache:'no-store'});} catch {throw new Error('Cannot reach the studio server. No changes were saved.');}
  if(!response.headers.get('content-type')?.includes('application/json')) throw new Error('The Studio Manager requires the Node server. Static hosting supports the portfolio only.');
  const data=await response.json();
  if(!response.ok) {if(response.status===401 && !url.endsWith('/login')) logoutAdmin();throw new Error(data.error || 'The server could not save this change.');}
  return data;
}
async function saveQuick(id,patch,message) {
  try {await adminRequest('api/admin/artworks/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(patch)});await loadAdminDashboardData();showToast(githubMode ? message + ' to GitHub; website rebuild pending' : message,'success');}
  catch(err) {showToast(err.message,'error');}
}
async function loadEnquiries() {
  if (githubMode) return;
  const section=document.getElementById('enquiryInbox'); if(!section) return;
  const data=await adminRequest('api/admin/enquiries');
  section.hidden=false;
  const list=document.getElementById('enquiryInboxList'); list.replaceChildren();
  if(!data.enquiries.length) {list.textContent='No enquiries yet.';return;}
  for(const enquiry of [...data.enquiries].reverse()) {
    const card=document.createElement('article');card.className='enquiry-card';
    for(const line of [enquiry.name,new Date(enquiry.createdAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}),enquiry.phone,enquiry.email,enquiry.message]) {const p=document.createElement('p');p.textContent=line;card.append(p);}
    list.append(card);
  }
}
document.addEventListener('click',async event=>{
  const btn=event.target.closest('[data-admin-action]'); if(!btn || btn.disabled) return;
  const id=btn.dataset.artId;btn.disabled=true;
  try {switch(btn.dataset.adminAction) {case 'price':await quickSavePrice(id);break;case 'availability':await toggleAvailability(id);break;case 'featured':await toggleFeatured(id);break;case 'edit':openEditArtworkModal(id);break;case 'delete':await deleteArtwork(id);break;}}
  finally {btn.disabled=false;}
});
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('refreshEnquiriesBtn')?.addEventListener('click',()=>loadEnquiries().catch(err=>showToast(err.message,'error')));});
document.addEventListener('keydown',event=>{ if(event.key==='Escape') closeAdminModal(); });
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('reloadCatalogueBtn')?.addEventListener('click',()=>loadAdminDashboardData().then(()=>showToast('Latest catalogue loaded')).catch(err=>showToast(err.message,'error')));});
