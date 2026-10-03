/**
 * Shridaa Arts — Studio Admin CMS Panel Logic
 * Secure, simple management for Ashima Goyal
 */

window.ShridaaAdmin = {
  token: sessionStorage.getItem('shridaa_admin_token') || localStorage.getItem('shridaa_admin_token') || null,
  artworks: [],
  editingId: null
};

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

  try {
    const res = await fetch('/api/admin/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      if (loginBox) loginBox.style.display = 'none';
      if (dashboard) dashboard.style.display = 'block';
      loadAdminDashboardData();
    } else {
      logoutAdmin();
    }
  } catch (err) {
    console.error('Error verifying admin session:', err);
    logoutAdmin();
  }
}

// Admin Login
async function handleAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById('adminUser').value;
  const password = document.getElementById('adminPass').value;
  const statusEl = document.getElementById('adminLoginStatus');
  const btn = document.getElementById('adminLoginBtn');

  try {
    btn.disabled = true;
    if (statusEl) {
      statusEl.textContent = 'Verifying credentials...';
      statusEl.className = 'admin-login-status';
    }

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok && data.token) {
      window.ShridaaAdmin.token = data.token;
      sessionStorage.setItem('shridaa_admin_token', data.token);
      localStorage.setItem('shridaa_admin_token', data.token);

      if (statusEl) statusEl.textContent = '';
      showToast('Welcome back, Ashima!', 'success');
      checkAdminSession();
    } else {
      throw new Error(data.error || 'Invalid credentials');
    }
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = err.message || 'Login failed';
      statusEl.className = 'admin-login-status error';
    }
    showToast(err.message || 'Login failed', 'error');
  } finally {
    btn.disabled = false;
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
    const res = await fetch('/api/artworks');
    const data = await res.json();
    window.ShridaaAdmin.artworks = data.artworks || data;
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

  try {
    const res = await fetch(`/api/admin/artworks/${artworkId}/price`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.ShridaaAdmin.token}`
      },
      body: JSON.stringify({ price: newPrice })
    });

    const data = await res.json();
    if (res.ok) {
      showToast(data.message || `Price updated to ₹${newPrice}`, 'success');
      // Refresh both admin view and public app data
      await loadAdminDashboardData();
      if (window.ShridaaApp && window.ShridaaApp.refresh) {
        window.ShridaaApp.refresh();
      }
    } else {
      throw new Error(data.error || 'Failed to update price');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Toggle Availability Quick Action
async function toggleAvailability(artworkId) {
  const art = window.ShridaaAdmin.artworks.find(a => a.id === artworkId);
  if (!art) return;

  const nextStatus = art.availability === 'Available' ? 'Sold' : 'Available';

  try {
    const res = await fetch(`/api/admin/artworks/${artworkId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.ShridaaAdmin.token}`
      },
      body: JSON.stringify({ availability: nextStatus })
    });

    if (res.ok) {
      showToast(`Status updated to ${nextStatus}`, 'success');
      await loadAdminDashboardData();
      if (window.ShridaaApp && window.ShridaaApp.refresh) window.ShridaaApp.refresh();
    }
  } catch (err) {
    showToast('Failed to toggle status', 'error');
  }
}

// Toggle Featured Quick Action
async function toggleFeatured(artworkId) {
  const art = window.ShridaaAdmin.artworks.find(a => a.id === artworkId);
  if (!art) return;

  const nextFeat = !art.featured;

  try {
    const res = await fetch(`/api/admin/artworks/${artworkId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.ShridaaAdmin.token}`
      },
      body: JSON.stringify({ featured: nextFeat })
    });

    if (res.ok) {
      showToast(nextFeat ? 'Marked as Featured' : 'Removed from Featured', 'success');
      await loadAdminDashboardData();
      if (window.ShridaaApp && window.ShridaaApp.refresh) window.ShridaaApp.refresh();
    }
  } catch (err) {
    showToast('Failed to toggle featured', 'error');
  }
}

// Delete Artwork
async function deleteArtwork(artworkId) {
  const art = window.ShridaaAdmin.artworks.find(a => a.id === artworkId);
  const name = art ? art.name : artworkId;
  
  if (!confirm(`Are you sure you want to remove "${name}" from the portfolio?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/artworks/${artworkId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${window.ShridaaAdmin.token}`
      }
    });

    if (res.ok) {
      showToast(`Artwork "${name}" removed`, 'success');
      await loadAdminDashboardData();
      if (window.ShridaaApp && window.ShridaaApp.refresh) window.ShridaaApp.refresh();
    } else {
      throw new Error('Failed to delete artwork');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
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
  const saveBtn = document.getElementById('adminSaveBtn');
  const isEditing = Boolean(window.ShridaaAdmin.editingId);
  const formData = new FormData(form);

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    let res;
    if (isEditing) {
      // Put request with json or multipart
      // If there's a new file attached, send FormData to POST or PUT
      const hasNewFile = document.getElementById('formArtImageFile').files.length > 0;
      if (hasNewFile) {
        // Upload file first or send multipart
        res = await fetch(`/api/admin/artworks/${window.ShridaaAdmin.editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.ShridaaAdmin.token}`
          },
          body: JSON.stringify({
            name: formData.get('name'),
            category: formData.get('category'),
            price: formData.get('price'),
            originalPrice: formData.get('originalPrice'),
            size: formData.get('size'),
            material: formData.get('material'),
            availability: formData.get('availability'),
            featured: document.getElementById('formArtFeatured').checked,
            isCustomizable: document.getElementById('formArtCustomizable').checked,
            shortDescription: formData.get('shortDescription'),
            detailedDescription: formData.get('detailedDescription')
          })
        });
      } else {
        res = await fetch(`/api/admin/artworks/${window.ShridaaAdmin.editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.ShridaaAdmin.token}`
          },
          body: JSON.stringify({
            name: formData.get('name'),
            category: formData.get('category'),
            price: formData.get('price'),
            originalPrice: formData.get('originalPrice'),
            size: formData.get('size'),
            material: formData.get('material'),
            availability: formData.get('availability'),
            featured: document.getElementById('formArtFeatured').checked,
            isCustomizable: document.getElementById('formArtCustomizable').checked,
            shortDescription: formData.get('shortDescription'),
            detailedDescription: formData.get('detailedDescription')
          })
        });
      }
    } else {
      // Create new artwork with multipart upload
      res = await fetch('/api/admin/artworks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.ShridaaAdmin.token}`
        },
        body: formData
      });
    }

    const data = await res.json();
    if (res.ok) {
      showToast(isEditing ? 'Artwork updated successfully!' : 'New artwork added to portfolio!', 'success');
      closeAdminModal();
      await loadAdminDashboardData();
      if (window.ShridaaApp && window.ShridaaApp.refresh) window.ShridaaApp.refresh();
    } else {
      throw new Error(data.error || 'Failed to save artwork');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Artwork';
  }
}

// Export Backup JSON
function exportBackupJson() {
  const token = window.ShridaaAdmin.token;
  if (!token) return;
  window.open(`/api/admin/export?token=${token}`, '_blank');
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
