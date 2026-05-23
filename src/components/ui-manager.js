/**
 * Quranic Planet — UI Components
 * Handles all UI interactions: panels, modals, search, loading screen
 */

const WEATHER_ICONS = {
  celestial_glow: '✨',
  hot_desert: '🌞',
  temperate: '🌤️',
  stormy: '⛈️',
  snowy: '❄️',
  mystical_fog: '🌫️',
  perpetual_spring: '🌸',
  sacred_night: '🌙',
  volcanic: '🌋',
  golden_hour: '🌅',
  cosmic: '🌌',
  rainy: '🌧️',
  windy: '💨',
  serene: '🕊️',
  thunderous: '⚡',
  lunar: '🌙',
  solar: '☀️',
  dawn: '🌄',
  twilight: '🌇',
  calm_waters: '🌊',
  crisp_mountain: '🏔️',
};

export class UIManager {
  constructor(suras) {
    this.suras = suras;
    this.currentFilter = 'all';
    this.selectedSura = null;
    this.panelOpen = false;

    // Cache DOM elements
    this.elements = {
      loadingScreen: document.getElementById('loading-screen'),
      loadingBar: document.getElementById('loading-bar'),
      loadingStatus: document.getElementById('loading-status'),
      gameContainer: document.getElementById('game-container'),
      locationText: document.getElementById('location-text'),
      panel: document.getElementById('country-panel'),
      panelClose: document.getElementById('panel-close'),
      panelSuraNumber: document.getElementById('panel-sura-number'),
      panelNameAr: document.getElementById('panel-name-ar'),
      panelNameEn: document.getElementById('panel-name-en'),
      panelBadge: document.getElementById('panel-badge'),
      panelBiomeBanner: document.getElementById('panel-biome-banner'),
      panelBiomeLabel: document.getElementById('panel-biome-label'),
      panelAyatCount: document.getElementById('panel-ayat-count'),
      panelWordCount: document.getElementById('panel-word-count'),
      panelJuz: document.getElementById('panel-juz'),
      panelTier: document.getElementById('panel-tier'),
      panelTheme: document.getElementById('panel-theme'),
      panelLandmarks: document.getElementById('panel-landmarks'),
      panelWeather: document.getElementById('panel-weather'),
      searchModal: document.getElementById('search-modal'),
      searchInput: document.getElementById('search-input'),
      searchResults: document.getElementById('search-results'),
      searchClose: document.getElementById('search-close'),
      btnSearch: document.getElementById('btn-search'),
      btnMushaf: document.getElementById('btn-mushaf'),
      statSuras: document.getElementById('stat-suras'),
      statAyat: document.getElementById('stat-ayat'),
      btnExplore: document.getElementById('btn-explore'),
      btnRecite: document.getElementById('btn-recite'),
    };

    // Audio element for recitation
    this._audio = null;
    this._isPlaying = false;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Panel close
    this.elements.panelClose?.addEventListener('click', () => this.closePanel());

    // Search
    this.elements.btnSearch?.addEventListener('click', () => this.openSearch());
    this.elements.searchClose?.addEventListener('click', () => this.closeSearch());
    this.elements.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));

    // Search backdrop close
    this.elements.searchModal?.querySelector('.modal-backdrop')?.addEventListener('click', () => this.closeSearch());

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.handleSearch(this.elements.searchInput?.value || '');
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.elements.searchModal && !this.elements.searchModal.classList.contains('hidden')) {
          this.closeSearch();
        } else if (this.panelOpen) {
          this.closePanel();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.openSearch();
      }
    });

    // Explore Country button
    this.elements.btnExplore?.addEventListener('click', () => {
      if (this.selectedSura) {
        document.dispatchEvent(new CustomEvent('navigate-to-sura', {
          detail: { suraId: this.selectedSura.id, zoom: 3.5 }
        }));
      }
    });

    // Listen to Recitation button
    this.elements.btnRecite?.addEventListener('click', () => {
      if (this.selectedSura) {
        this.playRecitation(this.selectedSura);
      }
    });
  }

  // ---- Loading Screen ----

  setLoadingProgress(percent, status) {
    if (this.elements.loadingBar) {
      this.elements.loadingBar.style.width = `${percent}%`;
    }
    if (this.elements.loadingStatus && status) {
      this.elements.loadingStatus.textContent = status;
    }
  }

  hideLoadingScreen() {
    return new Promise((resolve) => {
      this.setLoadingProgress(100, 'Bismillah — Welcome to Quranic Planet');
      setTimeout(() => {
        this.elements.loadingScreen?.classList.add('fade-out');
        this.elements.gameContainer?.classList.remove('hidden');
        setTimeout(() => {
          if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'none';
          }
          resolve();
        }, 1000);
      }, 500);
    });
  }

  // ---- Country Panel ----

  openPanel(sura) {
    if (!sura || !this.elements.panel) return;
    this.selectedSura = sura;
    this.panelOpen = true;

    // Update panel content
    this.elements.panelSuraNumber.textContent = sura.id;
    this.elements.panelNameAr.textContent = sura.nameAr;
    this.elements.panelNameEn.textContent = sura.nameEn;

    // Badge
    const badge = this.elements.panelBadge;
    badge.textContent = sura.type === 'meccan' ? 'Meccan' : 'Medinan';
    badge.className = `panel-badge ${sura.type}`;

    // Biome banner
    const banner = this.elements.panelBiomeBanner;
    banner.style.background = `linear-gradient(135deg, ${sura.colorPrimary}40, ${sura.colorSecondary}60)`;
    this.elements.panelBiomeLabel.textContent = sura.biomeLabel || sura.biome.replace(/_/g, ' ');

    // Stats
    this.elements.panelAyatCount.textContent = sura.ayat.toLocaleString();
    this.elements.panelWordCount.textContent = sura.words.toLocaleString();
    this.elements.panelJuz.textContent = Array.isArray(sura.juz) ? sura.juz.join('-') : sura.juz;

    const tierLabels = { hub: 'Hub', t1: '★ Hero', t2: '◆ Feature', t3: '● Discovery' };
    this.elements.panelTier.textContent = tierLabels[sura.tier] || sura.tier;

    // Theme
    this.elements.panelTheme.textContent = sura.themeSummary;

    // Landmarks
    const landmarksHtml = (sura.landmarks || [])
      .map(l => `<li>${l}</li>`)
      .join('');
    this.elements.panelLandmarks.innerHTML = landmarksHtml;

    // Weather
    const weatherKey = sura.weather || 'serene';
    const weatherIcon = WEATHER_ICONS[weatherKey] || '🌤️';
    const weatherName = weatherKey.replace(/_/g, ' ');
    this.elements.panelWeather.innerHTML = `
      <span class="weather-icon">${weatherIcon}</span>
      <span class="weather-text">${weatherName}</span>
    `;

    // Show panel
    this.elements.panel.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.elements.panel.classList.add('visible');
    });

    // Update location display
    this.updateLocation(`${sura.nameEn} — Surah ${sura.id}`);
  }

  closePanel() {
    if (!this.elements.panel) return;
    this.panelOpen = false;
    this.selectedSura = null;
    this.elements.panel.classList.remove('visible');
    setTimeout(() => {
      this.elements.panel.classList.add('hidden');
    }, 500);
    this.updateLocation('The Ocean of Revelation');
    // Stop any playing audio
    this.stopRecitation();
  }

  // ---- Audio Recitation ----

  /**
   * Play the first ayah of the selected Surah using EveryAyah.com CDN.
   * Uses Mishary Rashid Alafasy recitation (128kbps).
   */
  playRecitation(sura) {
    const suraNum = String(sura.id).padStart(3, '0');
    const ayahNum = '001';
    const url = `https://everyayah.com/data/Alafasy_128kbps/${suraNum}${ayahNum}.mp3`;

    // Stop any current playback
    this.stopRecitation();

    // Create and play audio
    this._audio = new Audio(url);
    this._isPlaying = true;

    // Update button text
    const btn = this.elements.btnRecite;
    if (btn) {
      btn.innerHTML = '<span>⏸️</span> Playing...';
      btn.classList.add('playing');
    }

    this._audio.addEventListener('ended', () => {
      this._isPlaying = false;
      if (btn) {
        btn.innerHTML = '<span>🎧</span> Listen to Recitation';
        btn.classList.remove('playing');
      }
    });

    this._audio.addEventListener('error', () => {
      this._isPlaying = false;
      if (btn) {
        btn.innerHTML = '<span>🎧</span> Listen to Recitation';
        btn.classList.remove('playing');
      }
    });

    this._audio.play().catch(() => {
      this._isPlaying = false;
      if (btn) {
        btn.innerHTML = '<span>🎧</span> Listen to Recitation';
        btn.classList.remove('playing');
      }
    });
  }

  stopRecitation() {
    if (this._audio) {
      this._audio.pause();
      this._audio.currentTime = 0;
      this._audio = null;
      this._isPlaying = false;
      const btn = this.elements.btnRecite;
      if (btn) {
        btn.innerHTML = '<span>🎧</span> Listen to Recitation';
        btn.classList.remove('playing');
      }
    }
  }

  // ---- Search ----

  openSearch() {
    this.elements.searchModal?.classList.remove('hidden');
    setTimeout(() => {
      this.elements.searchInput?.focus();
    }, 100);
    this.handleSearch('');
  }

  closeSearch() {
    this.elements.searchModal?.classList.add('hidden');
    if (this.elements.searchInput) {
      this.elements.searchInput.value = '';
    }
  }

  handleSearch(query) {
    const q = query.toLowerCase().trim();
    let results = [...this.suras];

    // Filter by type
    if (this.currentFilter === 'meccan') {
      results = results.filter(s => s.type === 'meccan');
    } else if (this.currentFilter === 'medinan') {
      results = results.filter(s => s.type === 'medinan');
    }

    // Filter by query
    if (q) {
      results = results.filter(s =>
        s.nameEn.toLowerCase().includes(q) ||
        s.nameAr.includes(q) ||
        s.id.toString() === q ||
        (s.biomeLabel || '').toLowerCase().includes(q) ||
        (s.themeSummary || '').toLowerCase().includes(q)
      );
    }

    this.renderSearchResults(results);
  }

  renderSearchResults(results) {
    if (!this.elements.searchResults) return;

    if (results.length === 0) {
      this.elements.searchResults.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--color-text-muted);">
          <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
          <div>No Suras found</div>
        </div>
      `;
      return;
    }

    this.elements.searchResults.innerHTML = results.map(sura => `
      <div class="search-result-item" data-sura-id="${sura.id}">
        <div class="result-number">${sura.id}</div>
        <div class="result-info">
          <div class="result-name-en">${sura.nameEn}</div>
          <div class="result-name-ar">${sura.nameAr}</div>
          <div class="result-meta">${sura.ayat} Ayat · ${sura.words} Words · Juz' ${Array.isArray(sura.juz) ? sura.juz.join('-') : sura.juz}</div>
        </div>
        <span class="result-badge ${sura.type}">${sura.type}</span>
      </div>
    `).join('');

    // Attach click handlers
    this.elements.searchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const suraId = parseInt(item.dataset.suraId);
        const sura = this.suras.find(s => s.id === suraId);
        if (sura) {
          this.closeSearch();
          this.openPanel(sura);
          // Dispatch event so the map can navigate
          document.dispatchEvent(new CustomEvent('navigate-to-sura', { detail: { suraId } }));
        }
      });
    });
  }

  // ---- Location Display ----

  updateLocation(text) {
    if (this.elements.locationText) {
      this.elements.locationText.textContent = text;
    }
  }

  // ---- Stats ----

  updateStats(exploredSuras = 0, masteredAyat = 0, connections = 0) {
    if (this.elements.statSuras) {
      this.elements.statSuras.textContent = `${exploredSuras} / 114`;
    }
    if (this.elements.statAyat) {
      this.elements.statAyat.textContent = `${masteredAyat.toLocaleString()} / 6,236`;
    }
    const connEl = document.getElementById('stat-connections');
    if (connEl) {
      connEl.textContent = connections.toString();
    }
  }
}

/**
 * Creates animated loading particles on the loading screen
 */
export function createLoadingParticles() {
  const container = document.getElementById('loading-particles');
  if (!container) return;

  const particleCount = 50;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const size = Math.random() * 3 + 1;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const duration = Math.random() * 4 + 3;
    const delay = Math.random() * 3;
    const opacity = Math.random() * 0.5 + 0.1;

    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: radial-gradient(circle, rgba(212, 175, 55, ${opacity}), transparent);
      border-radius: 50%;
      left: ${x}%;
      top: ${y}%;
      animation: float ${duration}s ${delay}s ease-in-out infinite;
      pointer-events: none;
    `;

    container.appendChild(particle);
  }
}
