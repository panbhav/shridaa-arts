/**
 * Shridaa Arts — Interactive Frontend Application
 * Handmade Lippan Art Portfolio by Ashima Goyal
 */

// Global State
window.ShridaaApp = {
  artworks: [],
  categories: [],
  featuredArtworks: [],
  activeCategory: 'All',
  activeAvailability: 'All',
  searchQuery: '',
  sortOption: 'featured',
  selectedArtwork: null,
  lightboxImages: [],
  lightboxIndex: 0
};

// Utilities
function formatPrice(price, currency = 'INR', isVisible = true) {
  if (!isVisible || price === null || price === undefined) {
    return 'Price on Request';
  }
  return '₹' + Number(price).toLocaleString('en-IN');
}

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

// Generate pre-filled WhatsApp enquiry link for an artwork
function generateArtworkWhatsAppUrl(artwork) {
  const phone = '919983466388';
  let text = `Hello Shridaa Arts, I am interested in the artwork "${artwork.name}"`;
  if (artwork.price && artwork.isPriceVisible !== false) {
    text += ` (Listed Price: ₹${Number(artwork.price).toLocaleString('en-IN')})`;
  }
  text += `. Could you please share more details?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

// Data Fetching & Rendering
function renderAll() {
  // Filter featured
  window.ShridaaApp.featuredArtworks = window.ShridaaApp.artworks.filter(a => a.featured);

  // Extract dynamic categories
  const catMap = {};
  window.ShridaaApp.artworks.forEach(a => {
    if (a.category) {
      catMap[a.category] = (catMap[a.category] || 0) + 1;
    }
  });
  window.ShridaaApp.categories = Object.keys(catMap).map(name => ({
    name,
    count: catMap[name]
  }));

  // Update hero price from Swarna Mandala Mirror if found
  const swarna = window.ShridaaApp.artworks.find(a => a.slug === 'swarna-mandala-mirror' || a.id === 'art-001');
  if (swarna) {
    const heroPriceEl = document.getElementById('heroFeaturedPrice');
    if (heroPriceEl) {
      heroPriceEl.textContent = formatPrice(swarna.price, swarna.currency, swarna.isPriceVisible);
    }
  }

  // Render components
  renderFeaturedArtworks();
  renderCategories();
  renderCategoryPills();
  renderFullGallery();
}

async function loadArtworksData() {
  try {
    // Check if user has saved updated artworks locally in browser
    const localSaved = localStorage.getItem('shridaa_local_artworks');
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          window.ShridaaApp.artworks = parsed;
          renderAll();
          handleRoute();
          return;
        }
      } catch (e) {
        console.warn('Could not parse local artworks:', e);
      }
    }

    let response;
    let data;
    try {
      response = await fetch('api/artworks');
      if (!response.ok) response = await fetch('/api/artworks');
      if (!response.ok) throw new Error('API unavailable');
      data = await response.json();
      window.ShridaaApp.artworks = data.artworks || data;
    } catch (e) {
      // Fallback to static JSON for GitHub Pages & static hosting
      response = await fetch('data/artworks.json');
      if (!response.ok) response = await fetch('./data/artworks.json');
      data = await response.json();
      window.ShridaaApp.artworks = data.artworks || data;
    }

    renderAll();

    // Check URL parameters or hash on load
    handleRoute();

  } catch (err) {
    console.error('Error loading artworks data:', err);
    showToast('Failed to load artwork portfolio', 'error');
  }
}

// Reusable Artwork Card HTML
function createArtworkCardHtml(artwork) {
  const priceDisplay = formatPrice(artwork.price, artwork.currency, artwork.isPriceVisible);
  const origPriceDisplay = artwork.originalPrice ? formatPrice(artwork.originalPrice) : '';
  const availClass = artwork.availability === 'Sold' ? 'sold' : (artwork.availability === 'Made to Order' ? 'made-to-order' : '');
  
  return `
    <article class="artwork-card" data-id="${artwork.id}">
      <div class="artwork-card-img-wrap" onclick="window.ShridaaApp.openDetail('${artwork.id}')">
        <picture>
          <source srcset="${artwork.image}" type="image/webp">
          <img src="${artwork.fallbackImage || artwork.image}" 
               alt="${artwork.name} - Handmade Lippan Art by Ashima Goyal" 
               class="artwork-card-img" 
               loading="lazy">
        </picture>
        <span class="availability-badge ${availClass}">${artwork.availability || 'Available'}</span>
        <div class="quick-view-overlay">
          <span class="quick-view-btn">View Details</span>
        </div>
      </div>
      <div class="artwork-card-body">
        <span class="artwork-card-category">${artwork.category || 'Lippan Art'}</span>
        <h3 class="artwork-card-title">${artwork.name}</h3>
        <p class="artwork-card-meta">${artwork.size ? `${artwork.size} • ` : ''}Handcrafted Clay & Mirrors</p>
        <div class="artwork-card-footer">
          <div class="artwork-price-display">
            <span class="price-val">${priceDisplay}</span>
            ${origPriceDisplay ? `<span class="price-orig">${origPriceDisplay}</span>` : ''}
          </div>
          <button type="button" class="card-details-link" onclick="window.ShridaaApp.openDetail('${artwork.id}')">
            View Details →
          </button>
        </div>
      </div>
    </article>
  `;
}

// Render Featured Artworks on Homepage
function renderFeaturedArtworks() {
  const container = document.getElementById('featuredGrid');
  if (!container) return;

  const featured = window.ShridaaApp.featuredArtworks.length > 0 
    ? window.ShridaaApp.featuredArtworks 
    : window.ShridaaApp.artworks.slice(0, 6);

  container.innerHTML = featured.map(createArtworkCardHtml).join('');
}

// Render Category Cards on Homepage
function renderCategories() {
  const container = document.getElementById('categoryGrid');
  if (!container) return;

  container.innerHTML = window.ShridaaApp.categories.map(cat => `
    <div class="category-card" onclick="window.ShridaaApp.filterByCategory('${cat.name}')">
      <div class="category-icon">✦</div>
      <h3 class="category-title">${cat.name}</h3>
      <span class="category-count">${cat.count} ${cat.count === 1 ? 'Design' : 'Designs'}</span>
    </div>
  `).join('');
}

// Render Category Filter Pills on Gallery Page
function renderCategoryPills() {
  const container = document.getElementById('categoryPillsBar');
  if (!container) return;

  const pills = [
    { name: 'All', count: window.ShridaaApp.artworks.length },
    ...window.ShridaaApp.categories
  ];

  container.innerHTML = pills.map(cat => `
    <button type="button" 
            class="category-pill ${window.ShridaaApp.activeCategory === cat.name ? 'active' : ''}" 
            onclick="window.ShridaaApp.filterByCategory('${cat.name}')" 
            role="tab" 
            aria-selected="${window.ShridaaApp.activeCategory === cat.name}">
      ${cat.name} (${cat.count})
    </button>
  `).join('');
}

// Filter and Sort Full Gallery
function getFilteredArtworks() {
  let list = [...window.ShridaaApp.artworks];

  // Category filter
  if (window.ShridaaApp.activeCategory && window.ShridaaApp.activeCategory !== 'All') {
    list = list.filter(a => a.category && a.category.toLowerCase() === window.ShridaaApp.activeCategory.toLowerCase());
  }

  // Availability filter
  if (window.ShridaaApp.activeAvailability && window.ShridaaApp.activeAvailability !== 'All') {
    list = list.filter(a => a.availability && a.availability.toLowerCase() === window.ShridaaApp.activeAvailability.toLowerCase());
  }

  // Search Query
  if (window.ShridaaApp.searchQuery) {
    const q = window.ShridaaApp.searchQuery.toLowerCase().trim();
    list = list.filter(a => 
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.category && a.category.toLowerCase().includes(q)) ||
      (a.shortDescription && a.shortDescription.toLowerCase().includes(q)) ||
      (a.material && a.material.toLowerCase().includes(q))
    );
  }

  // Sorting
  switch (window.ShridaaApp.sortOption) {
    case 'price-asc':
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case 'price-desc':
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    case 'name-asc':
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'featured':
    default:
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.displayOrder || 99) - (b.displayOrder || 99));
      break;
  }

  return list;
}

// Render Full Gallery
function renderFullGallery() {
  const grid = document.getElementById('fullArtworksGrid');
  const countEl = document.getElementById('resultsCount');
  const emptyState = document.getElementById('emptyState');
  const resetBtn = document.getElementById('resetFiltersBtn');
  if (!grid) return;

  const filtered = getFilteredArtworks();

  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} of ${window.ShridaaApp.artworks.length} creations`;
  }

  const isFiltered = window.ShridaaApp.activeCategory !== 'All' || 
                     window.ShridaaApp.activeAvailability !== 'All' || 
                     window.ShridaaApp.searchQuery !== '';
                     
  if (resetBtn) {
    resetBtn.style.display = isFiltered ? 'inline-block' : 'none';
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
  } else {
    if (emptyState) emptyState.style.display = 'none';
    grid.innerHTML = filtered.map(createArtworkCardHtml).join('');
  }
}

// Open Dedicated Artwork Detail Modal
function openArtworkDetail(artworkId) {
  const artwork = window.ShridaaApp.artworks.find(a => a.id === artworkId || a.slug === artworkId);
  if (!artwork) return;

  window.ShridaaApp.selectedArtwork = artwork;
  const modal = document.getElementById('artworkModal');
  if (!modal) return;

  // Set modal elements
  document.getElementById('modalArtworkTitle').textContent = artwork.name;
  document.getElementById('modalCategory').textContent = artwork.category || 'Lippan Art';
  
  const availEl = document.getElementById('modalAvailability');
  availEl.textContent = artwork.availability || 'Available';
  availEl.className = 'availability-badge ' + (artwork.availability === 'Sold' ? 'sold' : (artwork.availability === 'Made to Order' ? 'made-to-order' : ''));

  document.getElementById('modalPrice').textContent = formatPrice(artwork.price, artwork.currency, artwork.isPriceVisible);
  const origPriceEl = document.getElementById('modalOriginalPrice');
  if (origPriceEl) {
    origPriceEl.textContent = artwork.originalPrice ? formatPrice(artwork.originalPrice) : '';
  }

  document.getElementById('modalShortDesc').textContent = artwork.shortDescription || '';
  document.getElementById('modalDetailedDesc').textContent = artwork.detailedDescription || artwork.shortDescription || '';
  document.getElementById('modalSize').textContent = artwork.size || 'Custom dimensions available';
  document.getElementById('modalMaterial').textContent = artwork.material || 'MDF Base, Clay Dough Relief, Reflective Glass Mirrors';
  document.getElementById('modalCustomizable').textContent = artwork.isCustomizable ? 'Yes, available in custom sizes & colors' : 'Standard design';

  // Images
  const mainImg = document.getElementById('modalMainImg');
  mainImg.src = artwork.fallbackImage || artwork.image;
  mainImg.alt = `${artwork.name} - Handmade Lippan Art`;

  // Gallery thumbnails
  const gallery = artwork.gallery && artwork.gallery.length > 0 ? artwork.gallery : [artwork.image];
  window.ShridaaApp.lightboxImages = gallery;
  window.ShridaaApp.lightboxIndex = 0;

  const thumbsStrip = document.getElementById('modalThumbsStrip');
  if (thumbsStrip) {
    if (gallery.length > 1) {
      thumbsStrip.style.display = 'flex';
      thumbsStrip.innerHTML = gallery.map((imgSrc, idx) => `
        <button type="button" class="detail-thumb-btn ${idx === 0 ? 'active' : ''}" onclick="window.ShridaaApp.switchDetailImage('${imgSrc}', ${idx})">
          <img src="${imgSrc}" class="detail-thumb-img" alt="Thumbnail ${idx + 1}">
        </button>
      `).join('');
    } else {
      thumbsStrip.style.display = 'none';
      thumbsStrip.innerHTML = '';
    }
  }

  // WhatsApp Link
  const waBtn = document.getElementById('modalWhatsappBtn');
  if (waBtn) {
    waBtn.href = generateArtworkWhatsAppUrl(artwork);
  }

  // Open modal
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Push state to URL hash without jumping
  window.location.hash = `artwork=${artwork.id}`;
}

function switchDetailImage(src, index) {
  const mainImg = document.getElementById('modalMainImg');
  if (mainImg) mainImg.src = src;
  window.ShridaaApp.lightboxIndex = index;
  
  const thumbs = document.querySelectorAll('.detail-thumb-btn');
  thumbs.forEach((t, i) => {
    t.classList.toggle('active', i === index);
  });
}

function closeArtworkDetail() {
  const modal = document.getElementById('artworkModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
  
  // Clean hash if was artwork
  if (window.location.hash.startsWith('#artwork=')) {
    history.pushState('', document.title, window.location.pathname + window.location.search);
  }
}

// Lightbox
function openLightbox(images, startIndex = 0, caption = '') {
  const lb = document.getElementById('lightboxModal');
  const lbImg = document.getElementById('lightboxImg');
  const lbCaption = document.getElementById('lightboxCaption');
  if (!lb || !lbImg) return;

  window.ShridaaApp.lightboxImages = images;
  window.ShridaaApp.lightboxIndex = startIndex;

  lbImg.src = images[startIndex];
  if (lbCaption) lbCaption.textContent = caption || (window.ShridaaApp.selectedArtwork ? window.ShridaaApp.selectedArtwork.name : 'Artwork Inspection');

  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightboxModal');
  if (lb) lb.style.display = 'none';
  if (!document.getElementById('artworkModal') || document.getElementById('artworkModal').style.display === 'none') {
    document.body.style.overflow = '';
  }
}

function navigateLightbox(dir) {
  const images = window.ShridaaApp.lightboxImages;
  if (!images || images.length === 0) return;
  
  let newIdx = window.ShridaaApp.lightboxIndex + dir;
  if (newIdx < 0) newIdx = images.length - 1;
  if (newIdx >= images.length) newIdx = 0;
  
  window.ShridaaApp.lightboxIndex = newIdx;
  const lbImg = document.getElementById('lightboxImg');
  if (lbImg) lbImg.src = images[newIdx];
}

// Router & Section Switching
function showSection(sectionId) {
  const mainContent = document.getElementById('mainContent');
  const allArtworksView = document.getElementById('allArtworksView');
  const adminView = document.getElementById('adminView');

  // Nav links highlight
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    link.classList.remove('active');
  });

  if (sectionId === 'artworks') {
    mainContent.style.display = 'none';
    if (adminView) adminView.style.display = 'none';
    allArtworksView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelectorAll('[href="#artworks"]').forEach(el => el.classList.add('active'));
    renderFullGallery();
  } else if (sectionId === 'admin') {
    mainContent.style.display = 'none';
    allArtworksView.style.display = 'none';
    if (adminView) adminView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.ShridaaAdmin && window.ShridaaAdmin.checkSession) {
      window.ShridaaAdmin.checkSession();
    }
  } else {
    // Normal Home view
    if (allArtworksView) allArtworksView.style.display = 'none';
    if (adminView) adminView.style.display = 'none';
    mainContent.style.display = 'block';

    const targetEl = document.getElementById(sectionId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    document.querySelectorAll(`[href="#${sectionId}"]`).forEach(el => el.classList.add('active'));
  }
}

function handleRoute() {
  const hash = window.location.hash.replace('#', '');
  
  if (hash.startsWith('artwork=')) {
    const artId = hash.split('=')[1];
    openArtworkDetail(artId);
  } else if (hash === 'artworks') {
    showSection('artworks');
  } else if (hash === 'admin') {
    const base = window.location.pathname.replace(/\/index\.html$/, '');
    const adminUrl = base.endsWith('/') ? `${base}admin/` : `${base}/admin/`;
    window.location.replace(adminUrl);
    return;
  } else if (['home', 'about', 'categories', 'craftsmanship', 'contact'].includes(hash)) {
    showSection(hash);
  } else {
    showSection('home');
  }
}

// Global App Namespace Exposure
window.ShridaaApp.openDetail = openArtworkDetail;
window.ShridaaApp.switchDetailImage = switchDetailImage;
window.ShridaaApp.renderAll = renderAll;
window.ShridaaApp.filterByCategory = function(category) {
  window.ShridaaApp.activeCategory = category;
  showSection('artworks');
  renderCategoryPills();
  renderFullGallery();
};
window.ShridaaApp.refresh = loadArtworksData;

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadArtworksData();

  // Sticky Header Scroll effect
  const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Mobile Drawer
  const menuToggle = document.getElementById('menuToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const drawerClose = document.getElementById('drawerClose');

  function openDrawer() {
    mobileDrawer.classList.add('active');
    drawerBackdrop.classList.add('active');
    menuToggle.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    mobileDrawer.classList.remove('active');
    drawerBackdrop.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  if (menuToggle) menuToggle.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  // Close drawer on clicking nav link
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      closeDrawer();
    });
  });

  // Handle smooth navigation clicks without exposing # in the URL
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const hash = link.getAttribute('href');
      if (!hash || hash === '#' || hash.startsWith('#artwork=')) return;

      e.preventDefault();
      const targetSection = hash.replace('#', '');
      showSection(targetSection);

      // Clean the address bar so '#' does not appear in browser URL
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });
  });

  // Hero Explore Button
  const heroExploreBtn = document.getElementById('heroExploreBtn');
  if (heroExploreBtn) {
    heroExploreBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showSection('artworks');
    });
  }

  // View All Button in Featured Section
  const viewAllBtn = document.getElementById('viewAllArtworksBtn');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
      showSection('artworks');
    });
  }

  // Gallery Search Input
  const searchInput = document.getElementById('gallerySearchInput');
  const searchClear = document.getElementById('searchClearBtn');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      window.ShridaaApp.searchQuery = e.target.value;
      if (searchClear) {
        searchClear.style.display = e.target.value ? 'block' : 'none';
      }
      renderFullGallery();
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      window.ShridaaApp.searchQuery = '';
      searchClear.style.display = 'none';
      renderFullGallery();
    });
  }

  // Availability Select
  const availSelect = document.getElementById('availabilitySelect');
  if (availSelect) {
    availSelect.addEventListener('change', (e) => {
      window.ShridaaApp.activeAvailability = e.target.value;
      renderFullGallery();
    });
  }

  // Sort Select
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      window.ShridaaApp.sortOption = e.target.value;
      renderFullGallery();
    });
  }

  // Reset Filters Buttons
  const resetBtn = document.getElementById('resetFiltersBtn');
  const emptyResetBtn = document.getElementById('emptyResetBtn');
  function resetAllFilters() {
    window.ShridaaApp.activeCategory = 'All';
    window.ShridaaApp.activeAvailability = 'All';
    window.ShridaaApp.searchQuery = '';
    window.ShridaaApp.sortOption = 'featured';

    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.style.display = 'none';
    if (availSelect) availSelect.value = 'All';
    if (sortSelect) sortSelect.value = 'featured';

    renderCategoryPills();
    renderFullGallery();
  }

  if (resetBtn) resetBtn.addEventListener('click', resetAllFilters);
  if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetAllFilters);

  // Artwork Detail Modal Close
  const modalClose = document.getElementById('modalCloseBtn');
  const modalBackdrop = document.getElementById('artworkModal');
  if (modalClose) modalClose.addEventListener('click', closeArtworkDetail);
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeArtworkDetail();
    });
  }

  // Modal Zoom / Lightbox Trigger
  const zoomBtn = document.getElementById('modalZoomBtn');
  const mainImg = document.getElementById('modalMainImg');
  if (zoomBtn) {
    zoomBtn.addEventListener('click', () => {
      if (window.ShridaaApp.selectedArtwork) {
        openLightbox(
          window.ShridaaApp.lightboxImages, 
          window.ShridaaApp.lightboxIndex,
          window.ShridaaApp.selectedArtwork.name
        );
      }
    });
  }
  if (mainImg) {
    mainImg.addEventListener('click', () => {
      if (window.ShridaaApp.selectedArtwork) {
        openLightbox(
          window.ShridaaApp.lightboxImages, 
          window.ShridaaApp.lightboxIndex,
          window.ShridaaApp.selectedArtwork.name
        );
      }
    });
  }

  // Share Artwork Button
  const shareBtn = document.getElementById('modalShareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (!window.ShridaaApp.selectedArtwork) return;
      const shareUrl = `${window.location.origin}${window.location.pathname}#artwork=${window.ShridaaApp.selectedArtwork.id}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToast('Artwork link copied to clipboard!', 'success');
        });
      } else {
        showToast('Link: ' + shareUrl, 'info');
      }
    });
  }

  // Lightbox Close & Navigation
  const lbClose = document.getElementById('lightboxClose');
  const lbPrev = document.getElementById('lightboxPrev');
  const lbNext = document.getElementById('lightboxNext');
  const lbModal = document.getElementById('lightboxModal');

  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbPrev) lbPrev.addEventListener('click', () => navigateLightbox(-1));
  if (lbNext) lbNext.addEventListener('click', () => navigateLightbox(1));
  if (lbModal) {
    lbModal.addEventListener('click', (e) => {
      if (e.target === lbModal) closeLightbox();
    });
  }

  // Keyboard navigation for modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      closeArtworkDetail();
    } else if (e.key === 'ArrowLeft') {
      if (lbModal && lbModal.style.display === 'flex') navigateLightbox(-1);
    } else if (e.key === 'ArrowRight') {
      if (lbModal && lbModal.style.display === 'flex') navigateLightbox(1);
    }
  });

  // Contact Form Submission
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = document.getElementById('formStatus');
      const submitBtn = document.getElementById('contactSubmitBtn');
      const formData = new FormData(contactForm);
      const payload = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        message: formData.get('message')
      };

      try {
        if (submitBtn) submitBtn.disabled = true;
        if (statusEl) {
          statusEl.textContent = 'Sending message to Ashima...';
          statusEl.className = 'form-status';
        }

        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          if (statusEl) {
            statusEl.textContent = 'Thank you! Your enquiry has been received. Ashima will contact you soon.';
            statusEl.className = 'form-status success';
          }
          contactForm.reset();
          showToast('Message sent successfully!', 'success');
        } else {
          throw new Error('Submission failed');
        }
      } catch (err) {
        if (statusEl) {
          statusEl.textContent = 'Could not send message automatically. Please tap the WhatsApp button to chat directly!';
          statusEl.className = 'form-status error';
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Listen to hash changes for SPA routing
  window.addEventListener('hashchange', handleRoute);
});
