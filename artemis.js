/**
 * Artemis II Lunar Launch Tracker
 * MJOLNIR Armory
 */

(function() {
  'use strict';

  // ============================================
  // Configuration
  // ============================================
  const CONFIG = {
    configUrl: './artemis.json',
    nasaApiKey: 'kcUwJUFoSKuFp197r7qDCHgDgMdcquaaVIqXm2xF',
    apis: {
      launchLibrary: 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?search=artemis&limit=5',
      spaceflightNews: 'https://api.spaceflightnewsapi.net/v4/articles/?search=artemis&limit=6',
      nasaImages: 'https://images-api.nasa.gov/search?q=artemis%20moon%20mission&media_type=image',
      nasaApod: 'https://api.nasa.gov/planetary/apod?api_key=kcUwJUFoSKuFp197r7qDCHgDgMdcquaaVIqXm2xF',
      nasaTechTransfer: 'https://api.nasa.gov/techtransfer/patent/?engine&api_key=kcUwJUFoSKuFp197r7qDCHgDgMdcquaaVIqXm2xF'
    },
    refreshIntervals: {
      countdown: 1000,
      news: 900000,
      images: 3600000
    }
  };

  // ============================================
  // State
  // ============================================
  let missionData = null;
  let launchDate = null;
  let countdownInterval = null;

  // Carousel state
  let newsCarousel = {
    articles: [],
    currentIndex: 0
  };

  let galleryCarousel = {
    images: [],
    currentIndex: 0,
    autoRotate: true,
    intervalId: null,
    rotationDelay: 6000
  };

  // ============================================
  // DOM Elements
  // ============================================
  const elements = {
    missionStatusPill: document.getElementById('mission-status-pill'),
    countdown: document.getElementById('countdown'),
    countdownDays: document.getElementById('countdown-days'),
    countdownHours: document.getElementById('countdown-hours'),
    countdownMinutes: document.getElementById('countdown-minutes'),
    countdownSeconds: document.getElementById('countdown-seconds'),
    launchDate: document.getElementById('launch-date'),
    launchSite: document.getElementById('launch-site'),
    timeline: document.getElementById('timeline'),
    statusCurrent: document.getElementById('status-current'),
    statusVehicle: document.getElementById('status-vehicle'),
    statusSpacecraft: document.getElementById('status-spacecraft'),
    statusCrew: document.getElementById('status-crew'),
    statusDuration: document.getElementById('status-duration'),
    statusDestination: document.getElementById('status-destination'),
    newsCarousel: document.getElementById('news-carousel'),
    newsCarouselPrev: document.querySelector('.carousel-nav.prev'),
    newsCarouselNext: document.querySelector('.carousel-nav.next'),
    gallery: document.getElementById('gallery'),
    galleryCarouselPrev: document.getElementById('gallery-carousel-prev'),
    galleryCarouselNext: document.getElementById('gallery-carousel-next'),
    galleryCarouselDots: document.getElementById('gallery-carousel-dots'),
    lightbox: document.getElementById('lightbox'),
    lightboxImage: document.getElementById('lightbox-image'),
    lightboxCaption: document.getElementById('lightbox-caption'),
    lightboxClose: document.querySelector('.lightbox-close')
  };

  // ============================================
  // Security - HTML Sanitization
  // ============================================
  // Sanitize HTML to prevent XSS attacks
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Sanitize URL to prevent javascript: and data: URLs
  function sanitizeUrl(url) {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.toLowerCase().startsWith('javascript:') ||
        trimmed.toLowerCase().startsWith('data:')) {
      return '';
    }
    return escapeHtml(trimmed);
  }

  // ============================================
  // Network Utilities - Retry Logic
  // ============================================
  async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response;
      } catch (error) {
        if (i === retries - 1) {
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  // ============================================
  // Initialization
  // ============================================
  async function init() {
    initLightbox();
    initCarouselControls();
    await loadMissionConfig();
    startCountdown();
    // loadNews(); // Disabled - news section removed
    loadGallery();

    // setInterval(loadNews, CONFIG.refreshIntervals.news); // Disabled - news section removed
    setInterval(loadGallery, CONFIG.refreshIntervals.images);
  }

  // ============================================
  // Mission Configuration
  // ============================================
  async function loadMissionConfig() {
    try {
      const response = await fetchWithRetry(CONFIG.configUrl);
      missionData = await response.json();
      launchDate = new Date(missionData.mission.launchDate);
      updateMissionInfo();
      renderTimeline();
      fetchLaunchDate();
    } catch (error) {
      console.error('Error loading mission config:', error);
      launchDate = new Date('2026-09-01T12:00:00Z');
      updateMissionInfo();
    }
  }

  function updateMissionInfo() {
    if (!missionData) return;

    const mission = missionData.mission;

    if (elements.missionStatusPill) {
      elements.missionStatusPill.textContent = mission.status;
    }
    if (elements.launchDate) {
      elements.launchDate.textContent = `Launch: ${mission.launchDateDisplay}`;
    }
    if (elements.launchSite) {
      elements.launchSite.textContent = mission.launchSite;
    }
    if (elements.statusCurrent) {
      elements.statusCurrent.textContent = mission.status;
    }
    if (elements.statusVehicle) {
      elements.statusVehicle.textContent = mission.vehicle;
    }
    if (elements.statusSpacecraft) {
      elements.statusSpacecraft.textContent = mission.spacecraft;
    }
    if (elements.statusCrew) {
      elements.statusCrew.textContent = `${mission.crew} Astronauts`;
    }
    if (elements.statusDuration) {
      elements.statusDuration.textContent = mission.duration;
    }
    if (elements.statusDestination) {
      elements.statusDestination.textContent = mission.landingSite;
    }
  }

  // ============================================
  // Launch Library 2 API
  // ============================================
  async function fetchLaunchDate() {
    try {
      const response = await fetchWithRetry(CONFIG.apis.launchLibrary);
      const data = await response.json();
      const artemisLaunch = data.results?.find(launch =>
        launch.name?.toLowerCase().includes('artemis ii') ||
        launch.name?.toLowerCase().includes('artemis 2')
      );

      if (artemisLaunch?.net) {
        launchDate = new Date(artemisLaunch.net);

        if (elements.launchDate) {
          const options = { year: 'numeric', month: 'long' };
          elements.launchDate.textContent = `Launch: ${launchDate.toLocaleDateString('en-US', options)}`;
        }

        if (artemisLaunch.status?.name) {
          const statusText = artemisLaunch.status.name.toUpperCase();
          if (elements.missionStatusPill) {
            elements.missionStatusPill.textContent = statusText;
          }
          if (elements.statusCurrent) {
            elements.statusCurrent.textContent = statusText;
          }
        }
      }
    } catch (error) {
      // Using fallback launch date
    }
  }

  // ============================================
  // Countdown Timer
  // ============================================
  function startCountdown() {
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, CONFIG.refreshIntervals.countdown);
  }

  function updateCountdown() {
    if (!launchDate) return;

    const now = new Date();
    const diff = launchDate - now;
    const isAfterLaunch = diff < 0;
    const absDiff = Math.abs(diff);

    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

    if (elements.countdownDays) {
      elements.countdownDays.textContent = padNumber(days, 3);
    }
    if (elements.countdownHours) {
      elements.countdownHours.textContent = padNumber(hours);
    }
    if (elements.countdownMinutes) {
      elements.countdownMinutes.textContent = padNumber(minutes);
    }
    if (elements.countdownSeconds) {
      elements.countdownSeconds.textContent = padNumber(seconds);
    }

    if (elements.countdown) {
      elements.countdown.classList.toggle('elapsed', isAfterLaunch);
    }

    if (isAfterLaunch && missionData) {
      updateMilestoneStatus(absDiff / 1000);
    }
  }

  function padNumber(num, length = 2) {
    return String(num).padStart(length, '0');
  }

  // ============================================
  // Mission Timeline
  // ============================================
  function renderTimeline() {
    if (!elements.timeline || !missionData) return;

    const milestones = missionData.milestones;
    elements.timeline.innerHTML = '';

    milestones.forEach(milestone => {
      const milestoneEl = createMilestoneElement(milestone);
      elements.timeline.appendChild(milestoneEl);
    });
  }

  function createMilestoneElement(milestone) {
    const el = document.createElement('div');
    el.className = `milestone ${escapeHtml(milestone.status)}`;
    el.setAttribute('role', 'listitem');
    el.setAttribute('data-milestone-id', escapeHtml(milestone.id));

    el.innerHTML = `
      <div class="milestone-icon">${getMilestoneIcon(milestone.icon)}</div>
      <span class="milestone-name">${escapeHtml(milestone.name)}</span>
      <span class="milestone-time">${escapeHtml(milestone.time)}</span>
      <span class="milestone-status">${escapeHtml(milestone.status)}</span>
      <div class="milestone-tooltip">
        <p>${escapeHtml(milestone.description)}</p>
      </div>
    `;

    return el;
  }

  function getMilestoneIcon(iconName) {
    const icons = {
      'rocket': '🚀',
      'globe': '🌍',
      'arrow-right': '➡️',
      'moon': '🌙',
      'landing': '🛬',
      'footprints': '👣',
      'rocket-up': '⬆️',
      'earth': '🌎'
    };
    return icons[iconName] || '●';
  }

  function updateMilestoneStatus(elapsedSeconds) {
    if (!missionData) return;

    missionData.milestones.forEach((milestone, index) => {
      const el = document.querySelector(`[data-milestone-id="${milestone.id}"]`);
      if (!el) return;

      if (elapsedSeconds >= milestone.timeSeconds) {
        const nextMilestone = missionData.milestones[index + 1];
        if (!nextMilestone || elapsedSeconds < nextMilestone.timeSeconds) {
          milestone.status = 'active';
        } else {
          milestone.status = 'complete';
        }
      } else {
        milestone.status = 'pending';
      }

      el.className = `milestone ${milestone.status}`;
      el.querySelector('.milestone-status').textContent = milestone.status;
    });
  }

  // ============================================
  // News Feed
  // ============================================
  async function loadNews() {
    try {
      const response = await fetchWithRetry(CONFIG.apis.spaceflightNews);
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        renderNews(data.results);
      } else {
        renderFallbackNews();
      }
    } catch (error) {
      // Using fallback news
      renderFallbackNews();
    }
  }

  function renderNews(articles) {
    if (!elements.newsCarousel) return;

    newsCarousel.articles = articles.slice(0, 6).map(article => ({
      title: article.title,
      summary: article.summary,
      imageUrl: article.image_url,
      url: article.url,
      source: article.news_site,
      date: article.published_at
    }));

    renderNewsCarousel();
  }

  function renderFallbackNews() {
    if (!elements.newsCarousel || !missionData) return;
    newsCarousel.articles = missionData.fallbackNews;
    renderNewsCarousel();
  }

  function renderNewsCarousel() {
    const { newsCarousel: carousel, newsCarouselPrev: prev, newsCarouselNext: next } = elements;
    if (!carousel) return;

    carousel.innerHTML = '';
    newsCarousel.articles.forEach(article => {
      const card = createNewsCard(article);
      carousel.appendChild(card);
    });

    setupCarousel(carousel, prev, next);
  }

  function setupCarousel(carousel, prev, next) {
    let currentIndex = 0;
    const items = carousel.children;
    const totalItems = items.length;
    if (totalItems === 0) return;

    const itemWidth = items[0].offsetWidth + parseInt(getComputedStyle(carousel).gap);

    const updateButtons = () => {
      prev.disabled = currentIndex === 0;
      next.disabled = currentIndex >= totalItems - 2;
    };

    prev.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        carousel.scrollBy({ left: -itemWidth, behavior: 'smooth' });
        updateButtons();
      }
    });

    next.addEventListener('click', () => {
      if (currentIndex < totalItems - 2) {
        currentIndex++;
        carousel.scrollBy({ left: itemWidth, behavior: 'smooth' });
        updateButtons();
      }
    });

    updateButtons();
  }

  function createNewsCard(article) {
    const card = document.createElement('article');
    card.className = 'news-article';

    const date = new Date(article.date);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const placeholderSvg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225"><rect fill="%2308121a" width="400" height="225"/><text x="200" y="112" fill="%239db1c6" font-size="12" text-anchor="middle" font-family="monospace">IMAGE UNAVAILABLE</text></svg>`;

    const safeUrl = sanitizeUrl(article.url);
    const safeImageUrl = sanitizeUrl(article.imageUrl) || placeholderSvg;
    const safeTitle = escapeHtml(article.title);
    const safeSummary = escapeHtml(article.summary);
    const safeSource = escapeHtml(article.source);

    card.innerHTML = `
      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">
        <img
          class="article-image"
          src="${safeImageUrl}"
          alt="${safeTitle}"
          loading="lazy"
          onerror="this.src='${placeholderSvg}'"
        >
        <div class="article-content">
          <h3 class="article-title">${safeTitle}</h3>
          <p class="article-summary">${safeSummary}</p>
          <div class="article-meta">
            <span>${safeSource}</span>
            <span>${formattedDate}</span>
          </div>
        </div>
      </a>
    `;
    return card;
  }

  // ============================================
  // Photo Gallery
  // ============================================
  async function loadGallery() {
    try {
      const response = await fetchWithRetry(CONFIG.apis.nasaImages);
      const data = await response.json();

      if (data.collection?.items?.length > 0) {
        renderGallery(data.collection.items);
      } else {
        renderFallbackGallery();
      }
    } catch (error) {
      // Using fallback gallery
      renderFallbackGallery();
    }
  }

  function renderGallery(items) {
    if (!elements.gallery) return;

    const images = items
      .filter(item => item.links?.[0]?.href)
      .slice(0, 8)
      .map(item => {
        const data = item.data?.[0] || {};
        return {
          url: item.links[0].href,
          title: data.title || 'NASA Artemis Image',
          description: data.description?.substring(0, 100) || ''
        };
      });

    galleryCarousel.images = images;
    galleryCarousel.currentIndex = 0;

    renderGalleryCarouselView();
    updateGalleryCarouselControls();
    startGalleryAutoRotate();
  }

  function renderFallbackGallery() {
    if (!elements.gallery || !missionData) {
      return;
    }

    galleryCarousel.images = missionData.fallbackImages;
    galleryCarousel.currentIndex = 0;

    renderGalleryCarouselView();
    updateGalleryCarouselControls();
    startGalleryAutoRotate();
  }

  function renderGalleryCarouselView() {
    if (!elements.gallery) return;

    if (galleryCarousel.images.length === 0) {
      elements.gallery.innerHTML = '<div class="gallery-loading"><div class="loading-spinner"></div><span>No images available</span></div>';
      return;
    }

    elements.gallery.innerHTML = '';

    const image = galleryCarousel.images[galleryCarousel.currentIndex];
    const galleryItem = createGalleryItem(image);
    galleryItem.classList.add('carousel-active');

    elements.gallery.appendChild(galleryItem);
  }

  function updateGalleryCarouselControls() {
    if (!elements.galleryCarouselDots) return;

    // Create pagination dots
    elements.galleryCarouselDots.innerHTML = '';
    galleryCarousel.images.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.className = `carousel-dot ${index === galleryCarousel.currentIndex ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Go to image ${index + 1}`);
      dot.addEventListener('click', () => goToGallerySlide(index));
      elements.galleryCarouselDots.appendChild(dot);
    });

    // Update nav button states
    if (elements.galleryCarouselPrev) {
      elements.galleryCarouselPrev.disabled = galleryCarousel.images.length <= 1;
    }
    if (elements.galleryCarouselNext) {
      elements.galleryCarouselNext.disabled = galleryCarousel.images.length <= 1;
    }
  }

  function goToGallerySlide(index) {
    if (index < 0 || index >= galleryCarousel.images.length) return;

    stopGalleryAutoRotate();
    galleryCarousel.currentIndex = index;
    renderGalleryCarouselView();
    updateGalleryCarouselControls();
    startGalleryAutoRotate();
  }

  function nextGallerySlide() {
    const nextIndex = (galleryCarousel.currentIndex + 1) % galleryCarousel.images.length;
    goToGallerySlide(nextIndex);
  }

  function prevGallerySlide() {
    const prevIndex = (galleryCarousel.currentIndex - 1 + galleryCarousel.images.length) % galleryCarousel.images.length;
    goToGallerySlide(prevIndex);
  }

  function startGalleryAutoRotate() {
    if (!galleryCarousel.autoRotate || galleryCarousel.images.length <= 1) return;

    stopGalleryAutoRotate();
    galleryCarousel.intervalId = setInterval(() => {
      nextGallerySlide();
    }, galleryCarousel.rotationDelay);
  }

  function stopGalleryAutoRotate() {
    if (galleryCarousel.intervalId) {
      clearInterval(galleryCarousel.intervalId);
      galleryCarousel.intervalId = null;
    }
  }

  function createGalleryItem(image) {
    const item = document.createElement('div');
    item.className = 'gallery-item';

    const safeUrl = sanitizeUrl(image.url);
    const safeTitle = escapeHtml(image.title);
    const safeDescription = escapeHtml(image.description);

    item.innerHTML = `
      <img
        src="${safeUrl}"
        alt="${safeTitle}"
        loading="lazy"
        onerror="this.parentElement.style.display='none'"
      >
      <div class="gallery-item-overlay">
        <span class="gallery-item-title">${safeTitle}</span>
        <span class="gallery-item-desc">${safeDescription}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      openLightbox(safeUrl, safeTitle);
    });

    return item;
  }

  // ============================================
  // Lightbox
  // ============================================
  function initLightbox() {
    if (!elements.lightbox) return;

    if (elements.lightboxClose) {
      elements.lightboxClose.addEventListener('click', closeLightbox);
    }

    elements.lightbox.addEventListener('click', (e) => {
      if (e.target === elements.lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });
  }

  function openLightbox(imageUrl, caption) {
    if (!elements.lightbox || !elements.lightboxImage) return;

    elements.lightboxImage.src = imageUrl;
    elements.lightboxImage.alt = caption;

    if (elements.lightboxCaption) {
      elements.lightboxCaption.textContent = caption;
    }

    elements.lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!elements.lightbox) return;

    elements.lightbox.classList.remove('active');
    document.body.style.overflow = '';

    if (elements.lightboxImage) {
      elements.lightboxImage.src = '';
    }
  }

  // ============================================
  // Carousel Controls
  // ============================================
  function initCarouselControls() {
    // Gallery carousel controls
    if (elements.galleryCarouselPrev) {
      elements.galleryCarouselPrev.addEventListener('click', prevGallerySlide);
    }
    if (elements.galleryCarouselNext) {
      elements.galleryCarouselNext.addEventListener('click', nextGallerySlide);
    }

    // Keyboard navigation
    document.addEventListener('keydown', handleCarouselKeyboard);

    // Pause gallery auto-rotate on hover
    if (elements.gallery) {
      const galleryContainer = elements.gallery.closest('.gallery-carousel-container');
      if (galleryContainer) {
        galleryContainer.addEventListener('mouseenter', stopGalleryAutoRotate);
        galleryContainer.addEventListener('mouseleave', startGalleryAutoRotate);
      }
    }

    // Cleanup intervals on page unload
    window.addEventListener('beforeunload', () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      stopGalleryAutoRotate();
    });
  }

  function handleCarouselKeyboard(e) {
    // Only handle if not in lightbox or other modal
    if (elements.lightbox?.classList.contains('active')) return;

    if (e.key === 'ArrowLeft') {
      prevGallerySlide();
    } else if (e.key === 'ArrowRight') {
      nextGallerySlide();
    }
  }

  // ============================================
  // Initialize on DOM Ready
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
