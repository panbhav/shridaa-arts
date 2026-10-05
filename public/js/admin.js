/**
 * Shridaa Arts — Studio Admin CMS Panel Logic
 * Secure, simple management for Ashima Goyal
 * Supports both Live Server Mode and Static GitHub Pages Demo Mode
 */

window.ShridaaAdmin = {
  token: sessionStorage.getItem('shridaa_admin_token') || localStorage.getItem('shridaa_admin_token') || null,
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
  const token = window.ShridaaAdmin.token;
  const loginBox = document.getElementById('adminLoginBox');
  const dashboard = document.getElementById('adminDashboard');

  if (!token) {
    if (loginBox) loginBox.style.display = 'block';
    if (dashboard) dashboard.style.display = 'none';
    return;
  }

  // If static session token
  if (token.startsWith('shridaa_studio_session_')) {
    if (loginBox) loginBox.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
    loadAdminDashboardData();
    return;
  }

  // Try server verification
  try {
    const res = await fetch('/api/admin/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.valid) {
        if (loginBox) loginBox.style.display = 'none';
        if (dashboard) dashboard.style.display = 'block';
        loadAdminDashboardData();
        return;
      }
    }
    // If on static hosting (like GitHub Pages) or offline, maintain session
    if (window.location.hostname.includes('github.io') || window.location.protocol === 'file:') {
      if (loginBox) loginBox.style.display = 'none';
      if (dashboard) dashboard.style.display = 'block';
      loadAdminDashboardData();
      return;
    }
    logoutAdmin();
  } catch (err) {
    if (window.location.hostname.includes('github.io') || window.location.protocol === 'file:') {
      if (loginBox) loginBox.style.display = 'none';
      if (dashboard) dashboard.style.display = 'block';
      loadAdminDashboardData();
      return;
    }
    logoutAdmin();
  }
}

// Admin Login
async function handleAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById('adminUser').value.trim();
  const password = document.getElementById('adminPass').value;
  const statusEl = document.getElementById('adminLoginStatus');
  const btn = document.getElementById('adminLoginBtn');

  try {
    if (btn) btn.disabled = true;
    if (statusEl) {
      statusEl.textContent = 'Verifying credentials...';
      statusEl.className = 'admin-login-status';
    }

    let authenticated = false;
    let token = null;

    // 1. First attempt verification against backend API (if server is running)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.token) {
          token = data.token;
          authenticated = true;
        } else if (res.status === 401) {
          throw new Error(data.error || 'Invalid credentials');
        }
      }
    } catch (apiErr) {
      if (apiErr.message === 'Invalid credentials') {
        throw apiErr;
      }
      console.warn('Backend API unavailable (static hosting); evaluating studio credentials client-side:', apiErr);
    }

    // 2. If static hosting (like GitHub Pages where POST /api returns 404 HTML)
    if (!authenticated) {
      if (username === 'admin' && (password === 'shridaa@art2026' || password === 'admin123')) {
        token = 'shridaa_studio_session_' + Date.now();
        authenticated = true;
      } else {
        throw new Error('Invalid username or password. Please verify your credentials.');
      }
    }

    if (authenticated && token) {
      window.ShridaaAdmin.token = token;
      sessionStorage.setItem('shridaa_admin_token', token);
      localStorage.setItem('shridaa_admin_token', token);

      if (statusEl) statusEl.textContent = '';
      showToast('Welcome back, Ashima! Signed in to Studio Manager.', 'success');
      checkAdminSession();
    }
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = err.message || 'Login failed';
      statusEl.className = 'admin-login-status error';
    }
    showToast(err.message || 'Login failed', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Admin Logout
function logoutAdmin() {
  window.ShridaaAdmin.token = null;
  sessionStorage.removeItem('shridaa_admin_token');
  localStorage.removeItem('shridaa_admin_token');
  
  const loginBox = document.getElementById('adminLoginBox');
  const dashboard = document.getElementById('adminDashboard');
  if (loginBox) loginBox.style.display = 'block';
  if (dashboard) dashboard.style.display = 'none';
  showToast('Signed out of Studio Manager', 'info');
}

// Load Artworks Data for Dashboard
async function loadAdminDashboardData() {
  try {
    let artworks = [];
    const localSaved = localStorage.getItem('shridaa_local_artworks');
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          artworks = parsed;
        }
      } catch (e) {}
    }

    if (artworks.length === 0) {
      try {
        const res = await fetch('/api/artworks');
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          artworks = data.artworks || data;
        } else {
          throw new Error('Fallback to static file');
        }
      } catch (e) {
        let res = await fetch('data/artworks.json');
        if (!res.ok) res = await fetch('../data/artworks.json');
        artworks = await res.json();
      }
    }

    window.ShridaaAdmin.artworks = artworks;
    renderAdminStats();
    renderAdminTable();
  } catch (err) {
    console.error('Error fetching admin artworks:', err);
    showToast('Failed to load artwork list', 'error');
  }
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

  tbody.innerHTML = list.map(art => {
    const imgUrl = art.fallbackImage || art.image;
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
                    onclick="window.ShridaaAdmin.quickSavePrice('${art.id}')"
                    title="Click to save updated price">
              Save
            </button>
          </div>
        </td>
        <td>
          <button type="button" 
                  class="btn-icon ${isAvail ? 'text-success' : ''}" 
                  onclick="window.ShridaaAdmin.toggleAvailability('${art.id}')"
                  title="Toggle status">
            ${art.availability || 'Available'}
          </button>
        </td>
        <td>
          <button type="button" 
                  class="btn-icon ${isFeat ? 'text-gold' : ''}" 
                  onclick="window.ShridaaAdmin.toggleFeatured('${art.id}')"
                  title="Toggle featured">
            ${isFeat ? '★ Featured' : '☆ Standard'}
          </button>
        </td>
        <td>
          <div class="admin-row-actions">
            <button type="button" class="btn-icon" onclick="window.ShridaaAdmin.openEditModal('${art.id}')" title="Full Edit">
              Edit
            </button>
            <button type="button" class="btn-icon btn-icon-danger" onclick="window.ShridaaAdmin.deleteArtwork('${art.id}')" title="Delete Artwork">
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
  const inputEl = document.getElementById(`priceInput-${artworkId}`);
  if (!inputEl) return;
  const newPrice = Number(inputEl.value);

  if (isNaN(newPrice) || newPrice < 0) {
    showToast('Please enter a valid price', 'error');
    return;
  }

  // If server is available, attempt backend patch
  if (window.ShridaaAdmin.token && !window.ShridaaAdmin.token.startsWith('shridaa_studio_session_')) {
    try {
      await fetch(`/api/admin/artworks/${artworkId}/price`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.ShridaaAdmin.token}`
        },
        body: JSON.stringify({ price: newPrice })
      });
    } catch (e) {
      console.warn('Backend server patch error (continuing local update):', e);
    }
  }

  // Update in-memory data
  const artIndex = window.ShridaaAdmin.artworks.findIndex(a => a.id === artworkId);
  if (artIndex !== -1) {
    window.ShridaaAdmin.artworks[artIndex].price = newPrice;
  }
  if (window.ShridaaApp && window.ShridaaApp.artworks) {
    const appIndex = window.ShridaaApp.artworks.findIndex(a => a.id === artworkId);
    if (appIndex !== -1) {
      window.ShridaaApp.artworks[appIndex].price = newPrice;
    }
  }

  // Save to localStorage for instant live persistence across sessions
  localStorage.setItem('shridaa_local_artworks', JSON.stringify(window.ShridaaAdmin.artworks));

  showToast(`Price updated to ₹${newPrice.toLocaleString('en-IN')}`, 'success');
  renderAdminTable();
  if (window.ShridaaApp && window.ShridaaApp.renderAll) {
    window.ShridaaApp.renderAll();
  }
}

// Toggle Availability Quick Action
async function toggleAvailability(artworkId) {
  const art = window.ShridaaAdmin.artworks.find(a => a.id === artworkId);
  if (!art) return;

  const nextStatus = art.availability === 'Available' ? 'Sold' : 'Available';

  if (window.ShridaaAdmin.token && !window.ShridaaAdmin.token.startsWith('shridaa_studio_session_')) {
    try {
      await fetch(`/api/admin/artworks/${artworkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.ShridaaAdmin.token}`
        },
        body: JSON.stringify({ availability: nextStatus })
      });
    } catch (e) {}
  }

  art.availability = nextStatus;
  if (window.ShridaaApp && window.ShridaaApp.artworks) {
    const appArt = window.ShridaaApp.artworks.find(a => a.id === artworkId);
    if (appArt) appArt.availability = nextStatus;
  }

  localStorage.setItem('shridaa_local_artworks', JSON.stringify(window.ShridaaAdmin.artworks));
  showToast(`Status updated to ${nextStatus}`, 'success');
  renderAdminStats();
  renderAdminTable();
  if (window.ShridaaApp && window.ShridaaApp.renderAll) window.ShridaaApp.renderAll();
}

// Toggle Featured Quick Action
async function toggleFeatured(artworkId) {
  const art = window.ShridaaAdmin.artworks.find(a => a.id === artworkId);
  if (!art) return;

  const nextFeat = !art.featured;

  if (window.ShridaaAdmin.token && !window.ShridaaAdmin.token.startsWith('shridaa_studio_session_')) {
    try {
      await fetch(`/api/admin/artworks/${artworkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.ShridaaAdmin.token}`
        },
        body: JSON.stringify({ featured: nextFeat })
      });
    } catch (e) {}
  }

  art.featured = nextFeat;
  if (window.ShridaaApp && window.ShridaaApp.artworks) {
    const appArt = window.ShridaaApp.artworks.find(a => a.id === artworkId);
    if (appArt) appArt.featured = nextFeat;
  }

  localStorage.setItem('shridaa_local_artworks', JSON.stringify(window.ShridaaAdmin.artworks));
  showToast(nextFeat ? 'Marked as Featured Piece' : 'Set to Standard Collection', 'success');
  renderAdminStats();
  renderAdminTable();
  if (window.ShridaaApp && window.ShridaaApp.renderAll) window.ShridaaApp.renderAll();
}

// Delete Artwork
async function deleteArtwork(artworkId) {
  const art = window.ShridaaAdmin.artworks.find(a => a.id === artworkId);
  const name = art ? art.name : artworkId;
  
  if (!confirm(`Are you sure you want to remove "${name}" from the portfolio?`)) {
    return;
  }

  if (window.ShridaaAdmin.token && !window.ShridaaAdmin.token.startsWith('shridaa_studio_session_')) {
    try {
      await fetch(`/api/admin/artworks/${artworkId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${window.ShridaaAdmin.token}` }
      });
    } catch (e) {}
  }

  window.ShridaaAdmin.artworks = window.ShridaaAdmin.artworks.filter(a => a.id !== artworkId);
  if (window.ShridaaApp && window.ShridaaApp.artworks) {
    window.ShridaaApp.artworks = window.ShridaaApp.artworks.filter(a => a.id !== artworkId);
  }

  localStorage.setItem('shridaa_local_artworks', JSON.stringify(window.ShridaaAdmin.artworks));
  showToast(`Artwork "${name}" removed`, 'success');
  renderAdminStats();
  renderAdminTable();
  if (window.ShridaaApp && window.ShridaaApp.renderAll) window.ShridaaApp.renderAll();
}

// Open Add Artwork Modal
function openAddArtworkModal() {
  window.ShridaaAdmin.editingId = null;
  const modal = document.getElementById('adminArtworkModal');
  const heading = document.getElementById('adminModalHeading');
  const form = document.getElementById('adminArtworkForm');
  const preview = document.getElementById('formArtCurrentImgPreview');

  if (heading) heading.textContent = 'Add New Artwork';
  if (form) form.reset();
  if (preview) preview.style.display = 'none';

  document.getElementById('editArtworkId').value = '';
  document.getElementById('formArtAvailability').value = 'Available';
  document.getElementById('formArtFeatured').checked = false;
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

  if (heading) heading.textContent = `Edit "${art.name}"`;

  document.getElementById('editArtworkId').value = art.id;
  document.getElementById('formArtName').value = art.name;
  document.getElementById('formArtCategory').value = art.category || '';
  document.getElementById('formArtPrice').value = art.price || '';
  document.getElementById('formArtOrigPrice').value = art.originalPrice || '';
  document.getElementById('formArtSize').value = art.size || '';
  document.getElementById('formArtMaterial').value = art.material || '';
  document.getElementById('formArtAvailability').value = art.availability || 'Available';
  document.getElementById('formArtFeatured').checked = Boolean(art.featured);
  document.getElementById('formArtCustomizable').checked = Boolean(art.isCustomizable);
  document.getElementById('formArtShortDesc').value = art.shortDescription || '';
  document.getElementById('formArtDetailedDesc').value = art.detailedDescription || '';

  if (preview) {
    preview.style.display = 'block';
    preview.innerHTML = `
      <small class="text-muted">Current Artwork Photo:</small><br>
      <img src="${art.fallbackImage || art.image}" alt="${art.name}">
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
  const form = document.getElementById('adminArtworkForm');
  const saveBtn = document.getElementById('adminSaveArtworkBtn') || document.getElementById('adminSaveBtn') || (form ? form.querySelector('button[type="submit"]') : null);
  const isEditing = Boolean(window.ShridaaAdmin.editingId);
  const formData = new FormData(form);

  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    const newArtData = {
      name: formData.get('name').trim(),
      category: formData.get('category').trim(),
      price: Number(formData.get('price')),
      originalPrice: formData.get('originalPrice') ? Number(formData.get('originalPrice')) : null,
      size: formData.get('size') ? formData.get('size').trim() : '12 × 12 inches',
      material: formData.get('material') ? formData.get('material').trim() : 'MDF Base, Clay Relief, Mirrors',
      availability: formData.get('availability'),
      featured: document.getElementById('formArtFeatured').checked,
      isCustomizable: document.getElementById('formArtCustomizable').checked,
      shortDescription: formData.get('shortDescription') ? formData.get('shortDescription').trim() : '',
      detailedDescription: formData.get('detailedDescription') ? formData.get('detailedDescription').trim() : ''
    };

    if (isEditing) {
      const artIndex = window.ShridaaAdmin.artworks.findIndex(a => a.id === window.ShridaaAdmin.editingId);
      if (artIndex !== -1) {
        window.ShridaaAdmin.artworks[artIndex] = {
          ...window.ShridaaAdmin.artworks[artIndex],
          ...newArtData
        };
      }
      if (window.ShridaaApp && window.ShridaaApp.artworks) {
        const appIndex = window.ShridaaApp.artworks.findIndex(a => a.id === window.ShridaaAdmin.editingId);
        if (appIndex !== -1) {
          window.ShridaaApp.artworks[appIndex] = {
            ...window.ShridaaApp.artworks[appIndex],
            ...newArtData
          };
        }
      }
    } else {
      const newId = `art-${String(window.ShridaaAdmin.artworks.length + 1).padStart(3, '0')}`;
      const defaultImg = 'Assets/artworks/swarna-mandala-mirror.webp';
      const createdItem = {
        id: newId,
        slug: newArtData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
        currency: 'INR',
        isPriceVisible: true,
        isHandmade: true,
        displayOrder: window.ShridaaAdmin.artworks.length + 1,
        image: defaultImg,
        fallbackImage: 'Assets/artworks/swarna-mandala-mirror.jpg',
        gallery: [defaultImg],
        ...newArtData
      };
      window.ShridaaAdmin.artworks.unshift(createdItem);
      if (window.ShridaaApp && window.ShridaaApp.artworks) {
        window.ShridaaApp.artworks.unshift(createdItem);
      }
    }

    localStorage.setItem('shridaa_local_artworks', JSON.stringify(window.ShridaaAdmin.artworks));
    showToast(isEditing ? 'Artwork updated successfully!' : 'New artwork added to portfolio!', 'success');
    closeAdminModal();
    renderAdminStats();
    renderAdminTable();
    if (window.ShridaaApp && window.ShridaaApp.renderAll) window.ShridaaApp.renderAll();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Artwork';
    }
  }
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
      togglePassBtn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
      togglePassBtn.setAttribute('title', isPass ? 'Hide password' : 'Show password');
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

  if (modalClose) modalClose.addEventListener('click', closeAdminModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeAdminModal);
  if (artworkForm) artworkForm.addEventListener('submit', handleAdminArtworkFormSubmit);
});
