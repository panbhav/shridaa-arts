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
  lightboxIndex: 0,
  shortlist: JSON.parse(localStorage.getItem('shridaa_shortlist') || '[]')
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
    text += ` (Listed Price: ₹${Number(artwork.price).toLocaleString('en-IN')}, Shipping Excluded)`;
  }
  text += `. Could you please share ordering, advance pre-payment (UPI on 9983466388), and shipping details for my location?`;
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
  const isShortlisted = window.ShridaaApp.shortlist.includes(artwork.id);
  
  return `
    <article class="artwork-card" data-id="${artwork.id}">
      <button type="button" 
              class="card-shortlist-btn ${isShortlisted ? 'active' : ''}" 
              onclick="event.stopPropagation(); window.ShridaaApp.toggleShortlist('${artwork.id}')" 
              aria-label="${isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}"
              title="${isShortlisted ? 'Saved in Shortlist' : 'Add to Shortlist'}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isShortlisted ? '#C59A4E' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>

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
          <div class="card-quick-actions">
            <span class="quick-view-btn">View Details</span>
            <button type="button" class="wall-preview-btn" onclick="event.stopPropagation(); window.ShridaaApp.openWallVisualizer('${artwork.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              ✦ Wall Preview
            </button>
          </div>
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
            <span class="card-shipping-tag">Shipping Excluded</span>
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

  // Update modal shortlist button text/state
  updateModalShortlistBtn(artwork.id);

  // Open modal
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Push state to URL hash without jumping
  window.location.hash = `artwork=${artwork.id}`;
}

function updateModalShortlistBtn(artId) {
  const btn = document.getElementById('modalShortlistBtn');
  const txt = document.getElementById('modalShortlistText');
  if (!btn || !txt) return;
  const isSaved = window.ShridaaApp.shortlist.includes(artId);
  txt.textContent = isSaved ? 'Saved in Shortlist ✓' : 'Add to Shortlist';
  btn.style.color = isSaved ? '#C59A4E' : '';
  btn.style.borderColor = isSaved ? '#C59A4E' : '';
}

// ✦ SHORTLIST MANAGEMENT FUNCTIONS
function toggleShortlist(artworkId) {
  const idx = window.ShridaaApp.shortlist.indexOf(artworkId);
  const art = window.ShridaaApp.artworks.find(a => a.id === artworkId);
  if (idx > -1) {
    window.ShridaaApp.shortlist.splice(idx, 1);
    showToast(`Removed from your Shortlist`, 'info');
  } else {
    window.ShridaaApp.shortlist.push(artworkId);
    showToast(`Saved "${art ? art.name : 'Artwork'}" to Shortlist`, 'success');
  }
  
  localStorage.setItem('shridaa_shortlist', JSON.stringify(window.ShridaaApp.shortlist));
  updateShortlistBadge();
  renderShortlist();
  
  // Update card buttons across document
  document.querySelectorAll(`.artwork-card[data-id="${artworkId}"] .card-shortlist-btn`).forEach(btn => {
    const isSaved = window.ShridaaApp.shortlist.includes(artworkId);
    btn.classList.toggle('active', isSaved);
    btn.querySelector('svg').setAttribute('fill', isSaved ? '#C59A4E' : 'none');
  });

  // Update detail modal button if open
  if (window.ShridaaApp.selectedArtwork && window.ShridaaApp.selectedArtwork.id === artworkId) {
    updateModalShortlistBtn(artworkId);
  }
}

function updateShortlistBadge() {
  const count = window.ShridaaApp.shortlist.length;
  
  // Header badge
  const headerCount = document.getElementById('shortlistCount');
  if (headerCount) {
    headerCount.textContent = count;
    headerCount.style.display = count > 0 ? 'flex' : 'none';
  }
  
  // Mobile bar badge
  const mobileBarBadge = document.getElementById('mobileBarBadge');
  if (mobileBarBadge) {
    mobileBarBadge.textContent = count;
    mobileBarBadge.style.display = count > 0 ? 'flex' : 'none';
  }

  // Mobile drawer counter
  const mobileCounter = document.getElementById('mobileShortlistCounter');
  if (mobileCounter) {
    mobileCounter.textContent = `${count} Saved`;
  }
  
  // Drawer count badge
  const drawerCount = document.getElementById('shortlistCountBadge');
  if (drawerCount) {
    drawerCount.textContent = `${count} ${count === 1 ? 'Artwork' : 'Artworks'}`;
  }
}

function openShortlist() {
  const drawer = document.getElementById('shortlistDrawer');
  const backdrop = document.getElementById('shortlistBackdrop');
  if (drawer) drawer.classList.add('active');
  if (backdrop) backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
  renderShortlist();
}

function closeShortlist() {
  const drawer = document.getElementById('shortlistDrawer');
  const backdrop = document.getElementById('shortlistBackdrop');
  if (drawer) drawer.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
  
  if (!document.getElementById('artworkModal') || document.getElementById('artworkModal').style.display === 'none') {
    document.body.style.overflow = '';
  }
}

function renderShortlist() {
  const emptyState = document.getElementById('shortlistEmptyState');
  const itemsList = document.getElementById('shortlistItemsList');
  const footer = document.getElementById('shortlistFooter');
  const totalValEl = document.getElementById('shortlistTotalVal');
  const waBtn = document.getElementById('shortlistWhatsappBtn');
  
  if (!itemsList) return;

  const savedArtworks = window.ShridaaApp.shortlist
    .map(id => window.ShridaaApp.artworks.find(a => a.id === id))
    .filter(Boolean);

  if (savedArtworks.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    itemsList.innerHTML = '';
    if (footer) footer.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (footer) footer.style.display = 'block';

  let totalValue = 0;
  itemsList.innerHTML = savedArtworks.map(art => {
    if (art.price) totalValue += Number(art.price);
    return `
      <div class="shortlist-item">
        <img src="${art.fallbackImage || art.image}" alt="${art.name}" class="shortlist-item-img">
        <div class="shortlist-item-info">
          <h4 class="shortlist-item-title">${art.name}</h4>
          <span class="shortlist-item-meta">${art.size || 'Lippan Mud & Mirror'}</span>
          <span class="shortlist-item-price">${formatPrice(art.price, art.currency, art.isPriceVisible)}</span>
        </div>
        <button type="button" class="shortlist-remove-btn" onclick="window.ShridaaApp.toggleShortlist('${art.id}')" title="Remove from shortlist">✕</button>
      </div>
    `;
  }).join('');

  if (totalValEl) {
    totalValEl.textContent = '₹' + totalValue.toLocaleString('en-IN');
  }

  if (waBtn) {
    const names = savedArtworks.map(a => `• ${a.name} (${formatPrice(a.price)})`).join('%0A');
    const waText = `Hello Ashima, I have curated a shortlist of ${savedArtworks.length} Lippan art pieces from Shridaa Arts:%0A%0A${names}%0A%0ATotal Art Value: ₹${totalValue.toLocaleString('en-IN')} (Shipping Excluded)%0A%0ACould we discuss order delivery, shipping calculation, and advance pre-payment (UPI on 9983466388)?`;
    waBtn.href = `https://wa.me/919983466388?text=${waText}`;
  }
}

// ✦ WALL ART VISUALIZER FUNCTIONS
function openWallVisualizer(artworkId) {
  const art = artworkId 
    ? window.ShridaaApp.artworks.find(a => a.id === artworkId) 
    : window.ShridaaApp.selectedArtwork;
    
  if (!art) return;

  const modal = document.getElementById('wallVisualizerModal');
  const imgEl = document.getElementById('wallArtImg');
  const nameEl = document.getElementById('wallVisArtName');
  const priceEl = document.getElementById('wallArtPrice');
  const dimEl = document.getElementById('wallArtDim');
  const waBtn = document.getElementById('wallVisWhatsappBtn');
  const shortlistBtn = document.getElementById('wallVisShortlistBtn');

  if (imgEl) imgEl.src = art.fallbackImage || art.image;
  if (nameEl) nameEl.textContent = art.name;
  if (priceEl) priceEl.textContent = formatPrice(art.price, art.currency, art.isPriceVisible);
  if (dimEl) dimEl.textContent = art.size || '16 × 16 inches';

  if (waBtn) {
    const text = `Hello Ashima, I used the Wall Visualizer on your website and loved "${art.name}". I would like to enquire about placing this piece in my home and check advance pre-payment and shipping charges.`;
    waBtn.href = `https://wa.me/919983466388?text=${encodeURIComponent(text)}`;
  }

  if (shortlistBtn) {
    shortlistBtn.onclick = () => {
      toggleShortlist(art.id);
      const isSaved = window.ShridaaApp.shortlist.includes(art.id);
      shortlistBtn.innerHTML = isSaved 
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="#C59A4E" stroke="#C59A4E" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> Saved`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> Save to Shortlist`;
    };
  }

  if (modal) modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeWallVisualizer() {
  const modal = document.getElementById('wallVisualizerModal');
  if (modal) modal.classList.remove('active');
  if (!document.getElementById('artworkModal') || document.getElementById('artworkModal').style.display === 'none') {
    document.body.style.overflow = '';
  }
}

// ✦ SMART COMMISSION ESTIMATOR INITIALIZER
function setupCommissionEstimator() {
  const container = document.getElementById('commissionEstimator');
  if (!container) return;

  const shapePills = document.querySelectorAll('#estShapePills .est-pill');
  const detailPills = document.querySelectorAll('#estDetailPills .est-pill');
  const sizeSlider = document.getElementById('estSizeSlider');
  const sizeDisplay = document.getElementById('estSizeDisplay');
  const priceResult = document.getElementById('estPriceResult');
  const timeResult = document.getElementById('estTimeResult');
  const waBtn = document.getElementById('estWhatsappBtn');

  let currentShape = 'round';
  let currentFactor = 1.0;
  let currentDetail = 'standard';
  let currentRate = 13;
  let currentSize = 16;

  function calculateEstimate() {
    // Pricing formula based on square inches, detail density rate, and geometry factor
    const area = currentSize * currentSize;
    const baseCost = 1400 + (area * 0.005 * currentRate * 10 * currentFactor);
    const lowEst = Math.round(baseCost / 100) * 100;
    const highEst = Math.round((baseCost * 1.22) / 100) * 100;

    let days = '5–7 days';
    if (currentSize >= 28) days = '12–16 days';
    else if (currentSize >= 20) days = '8–12 days';

    if (sizeDisplay) sizeDisplay.textContent = `${currentSize} × ${currentSize} inches`;
    if (priceResult) priceResult.textContent = `₹${lowEst.toLocaleString('en-IN')} – ₹${highEst.toLocaleString('en-IN')}`;
    if (timeResult) timeResult.textContent = `⏱ Handcrafting Time: ${days}`;

    if (waBtn) {
      const msg = `Hello Ashima, I calculated a bespoke Lippan art commission on your website:%0A- Shape: ${currentShape.toUpperCase()}%0A- Size: ${currentSize} × ${currentSize} inches%0A- Complexity: ${currentDetail.toUpperCase()}%0A- Estimated Range: ₹${lowEst.toLocaleString('en-IN')} – ₹${highEst.toLocaleString('en-IN')} (Shipping Excluded)%0A%0ACan we discuss motif customization, shipping, and advance pre-payment (direct transfer on 9983466388)?`;
      waBtn.href = `https://wa.me/919983466388?text=${msg}`;
    }
  }

  shapePills.forEach(pill => {
    pill.addEventListener('click', () => {
      shapePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentShape = pill.dataset.shape;
      currentFactor = parseFloat(pill.dataset.factor) || 1.0;
      calculateEstimate();
    });
  });

  detailPills.forEach(pill => {
    pill.addEventListener('click', () => {
      detailPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentDetail = pill.dataset.detail;
      currentRate = parseFloat(pill.dataset.rate) || 13;
      calculateEstimate();
    });
  });

  if (sizeSlider) {
    sizeSlider.addEventListener('input', (e) => {
      currentSize = parseInt(e.target.value, 10);
      calculateEstimate();
    });
  }

  // Initial calculation
  calculateEstimate();
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

    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.querySelectorAll(`[href="./"], [href="#home"]`).forEach(el => el.classList.add('active'));
      if (window.history && window.history.replaceState) {
        const cleanPath = window.location.pathname.replace(/\/home\/?$/, '/');
        window.history.replaceState(null, '', cleanPath);
      }
      return;
    }

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
  } else if (hash === 'home') {
    showSection('home');
    if (window.history && window.history.replaceState) {
      const cleanPath = window.location.pathname.replace(/\/home\/?$/, '/');
      window.history.replaceState(null, '', cleanPath);
    }
  } else if (['about', 'categories', 'craftsmanship', 'reviews', 'contact'].includes(hash)) {
    showSection(hash);
  } else {
    showSection('home');
  }
}

// Reviews Carousel Side Scroll
function setupReviewsCarousel() {
  const track = document.getElementById('reviewsScrollTrack');
  const prevBtn = document.getElementById('reviewsScrollPrev');
  const nextBtn = document.getElementById('reviewsScrollNext');
  const dotsContainer = document.getElementById('reviewsDots');
  if (!track) return;

  const cards = track.querySelectorAll('.review-card');
  if (!cards.length) return;

  function getCardStep() {
    const card = cards[0];
    return card ? card.offsetWidth + 24 : 360;
  }

  // Generate pagination dots
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    cards.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.className = `review-dot ${idx === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Go to review ${idx + 1}`);
      dot.addEventListener('click', () => {
        track.scrollTo({ left: idx * getCardStep(), behavior: 'smooth' });
      });
      dotsContainer.appendChild(dot);
    });
  }

  function updateDots() {
    if (!dotsContainer) return;
    const step = getCardStep();
    const activeIdx = Math.min(
      cards.length - 1,
      Math.max(0, Math.round(track.scrollLeft / step))
    );
    const dots = dotsContainer.querySelectorAll('.review-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === activeIdx);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -getCardStep(), behavior: 'smooth' });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: getCardStep(), behavior: 'smooth' });
    });
  }

  track.addEventListener('scroll', updateDots, { passive: true });
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
window.ShridaaApp.toggleShortlist = toggleShortlist;
window.ShridaaApp.openShortlist = openShortlist;
window.ShridaaApp.closeShortlist = closeShortlist;
window.ShridaaApp.openWallVisualizer = openWallVisualizer;
window.ShridaaApp.closeWallVisualizer = closeWallVisualizer;

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadArtworksData();
  setupReviewsCarousel();
  setupCommissionEstimator();
  updateShortlistBadge();

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

  // Handle Brand Logo & Home clicks to always keep clean root URL without /home or #home
  document.querySelectorAll('#brandLogo, .brand-logo, a[href="./"], a[href="#home"]').forEach(homeBtn => {
    homeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showSection('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (window.history && window.history.replaceState) {
        const cleanPath = window.location.pathname.replace(/\/home\/?$/, '/');
        window.history.replaceState(null, '', cleanPath);
      }
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

  // Shortlist Drawer Triggers
  const openShortlistBtn = document.getElementById('openShortlistBtn');
  const closeShortlistBtn = document.getElementById('closeShortlistBtn');
  const shortlistBackdrop = document.getElementById('shortlistBackdrop');
  const mobileShortlistLink = document.getElementById('mobileShortlistLink');
  const mobileBarShortlistBtn = document.getElementById('mobileBarShortlistBtn');
  const emptyBrowseBtn = document.getElementById('emptyBrowseBtn');

  if (openShortlistBtn) openShortlistBtn.addEventListener('click', openShortlist);
  if (closeShortlistBtn) closeShortlistBtn.addEventListener('click', closeShortlist);
  if (shortlistBackdrop) shortlistBackdrop.addEventListener('click', closeShortlist);
  if (mobileShortlistLink) {
    mobileShortlistLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
      openShortlist();
    });
  }
  if (mobileBarShortlistBtn) mobileBarShortlistBtn.addEventListener('click', openShortlist);
  if (emptyBrowseBtn) {
    emptyBrowseBtn.addEventListener('click', () => {
      closeShortlist();
      showSection('artworks');
    });
  }

  // Modal Wall Preview & Shortlist Buttons
  const modalWallPreviewBtn = document.getElementById('modalWallPreviewBtn');
  const modalShortlistBtn = document.getElementById('modalShortlistBtn');
  if (modalWallPreviewBtn) {
    modalWallPreviewBtn.addEventListener('click', () => {
      if (window.ShridaaApp.selectedArtwork) {
        openWallVisualizer(window.ShridaaApp.selectedArtwork.id);
      }
    });
  }
  if (modalShortlistBtn) {
    modalShortlistBtn.addEventListener('click', () => {
      if (window.ShridaaApp.selectedArtwork) {
        toggleShortlist(window.ShridaaApp.selectedArtwork.id);
      }
    });
  }

  // Wall Visualizer Modal Controls
  const wallVisCloseBtn = document.getElementById('wallVisCloseBtn');
  const wallVisualizerModal = document.getElementById('wallVisualizerModal');
  const wallStage = document.getElementById('wallStage');
  const wallScaleSlider = document.getElementById('wallScaleSlider');
  const wallScaleVal = document.getElementById('wallScaleVal');
  const wallArtworkMount = document.getElementById('wallArtworkMount');

  if (wallVisCloseBtn) wallVisCloseBtn.addEventListener('click', closeWallVisualizer);
  if (wallVisualizerModal) {
    wallVisualizerModal.addEventListener('click', (e) => {
      if (e.target === wallVisualizerModal) closeWallVisualizer();
    });
  }

  // Wall Paint Swatches
  document.querySelectorAll('#wallSwatches .wall-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('#wallSwatches .wall-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const color = swatch.dataset.color || '#EAE6DF';
      if (wallStage) wallStage.style.setProperty('--wall-bg', color);
    });
  });

  // Room Scene Switcher
  document.querySelectorAll('#roomSceneButtons .vis-btn-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#roomSceneButtons .vis-btn-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const scene = btn.dataset.scene;
      
      const consoleEl = document.getElementById('furnitureConsole');
      const sofaEl = document.getElementById('furnitureSofa');
      const mandirEl = document.getElementById('furnitureMandir');

      if (consoleEl) consoleEl.style.display = scene === 'console' ? 'flex' : 'none';
      if (sofaEl) sofaEl.style.display = scene === 'sofa' ? 'block' : 'none';
      if (mandirEl) mandirEl.style.display = scene === 'mandir' ? 'flex' : 'none';
    });
  });

  // Wall Scale Slider
  if (wallScaleSlider && wallArtworkMount && wallScaleVal) {
    wallScaleSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      wallScaleVal.textContent = `${val}%`;
      const scale = val / 100;
      wallArtworkMount.style.setProperty('--art-scale', scale);
    });
  }

  // Keyboard navigation for modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      closeArtworkDetail();
      closeWallVisualizer();
      closeShortlist();
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
