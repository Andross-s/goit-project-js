/**
 * ArtistsHub – main entry. Initializes header, artists section, feedback slider, modal.
 */

import {
  getArtists,
  getArtistById,
  getArtistAlbums,
  getFeedbacks,
  request,
  showLoader,
  hideLoader,
  showToast,
} from './js/api.js';

// ----- Header: smooth scroll, burger menu -----
const HEADER_OFFSET = 80;

function scrollToSection(selector) {
  const el = document.querySelector(selector);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

function initHeader() {
  document.querySelectorAll('.nav-link, .burger-menu__link').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        scrollToSection(href);
        const menu = document.querySelector('[data-burger-menu]');
        if (menu && !menu.hidden) {
          menu.hidden = true;
          document.querySelector('[data-burger]')?.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      }
    });
  });

  const burger = document.querySelector('[data-burger]');
  const burgerMenu = document.querySelector('[data-burger-menu]');
  const burgerClose = document.querySelector('[data-burger-close]');
  if (burger && burgerMenu) {
    burger.addEventListener('click', () => {
      const open = burgerMenu.hidden;
      burgerMenu.hidden = !open;
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    burgerClose?.addEventListener('click', () => {
      burgerMenu.hidden = true;
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  }

  const logo = document.querySelector('.header__logo');
  if (logo) {
    logo.addEventListener('click', e => {
      if (window.location.hash) {
        e.preventDefault();
        window.location.hash = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
}

// ----- Artists section -----
const artistsListEl = document.querySelector('[data-artists-list]');
const loadMoreWrap = document.querySelector('[data-load-more-wrap]');
const loadMoreBtn = document.querySelector('[data-load-more]');
let artistsPage = 1;
const ARTISTS_PER_PAGE = 8;
let hasMoreArtists = true;

function renderArtistCard(artist) {
  const card = document.createElement('article');
  card.className = 'artist-card';
  card.dataset.artistId = artist.id;
  const imgUrl = artist.imageUrl || artist.image || artist.photo || '';
  const name = artist.name || 'Artist';
  const shortInfo = artist.shortInfo || artist.bio || artist.description || '';
  const genres = Array.isArray(artist.genres) ? artist.genres : (artist.genre ? [artist.genre] : []);
  card.innerHTML = `
    <div class="artist-card__img-wrap">
      <img class="artist-card__img" src="${imgUrl || 'https://via.placeholder.com/300x300/1a1a2e/666?text=No+image'}" alt="${escapeHtml(name)}" loading="lazy" width="300" height="300" />
    </div>
    <div class="artist-card__genres">${genres.map(g => `<span class="artist-card__genre">${escapeHtml(g)}</span>`).join('')}</div>
    <h3 class="artist-card__name">${escapeHtml(name)}</h3>
    <p class="artist-card__short">${escapeHtml(shortInfo)}</p>
    <button type="button" class="artist-card__btn button button--outline" data-learn-more>Learn More</button>
  `;
  const btn = card.querySelector('[data-learn-more]');
  btn.addEventListener('click', () => openArtistModal(artist.id));
  return card;
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function appendArtists(items) {
  if (!items || !Array.isArray(items)) return;
  items.forEach(artist => {
    artistsListEl?.appendChild(renderArtistCard(artist));
  });
}

async function loadArtists(page = 1, append = false) {
  const data = await getArtists(page, ARTISTS_PER_PAGE);
  if (!data) return;
  const list = Array.isArray(data) ? data : (data.data || data.artists || data.items || []);
  const total = data.total ?? data.totalCount;
  if (!append && artistsListEl) artistsListEl.innerHTML = '';
  appendArtists(list);
  hasMoreArtists = list.length >= ARTISTS_PER_PAGE && (total == null || page * ARTISTS_PER_PAGE < total);
  if (loadMoreWrap) {
    loadMoreWrap.hidden = !hasMoreArtists;
  }
}

function initArtists() {
  loadArtists(1, false);
  loadMoreBtn?.addEventListener('click', () => {
    artistsPage += 1;
    loadArtists(artistsPage, true);
  });
}

// ----- Artist Modal -----
const modalBackdrop = document.querySelector('[data-modal-backdrop]');
const modalBody = document.querySelector('[data-modal-body]');
const modalLoader = document.querySelector('[data-modal-loader]');
const modalCloseBtn = document.querySelector('[data-modal-close]');

function formatYears(founded, disbanded) {
  if (founded == null && disbanded == null) return 'information missing';
  if (founded == null) return 'information missing';
  const end = disbanded != null ? disbanded : 'present';
  return `${founded} – ${end}`;
}

function renderModalContent(artist, albums = []) {
  const imgUrl = artist.imageUrl || artist.image || artist.photo || '';
  const name = artist.name || 'Artist';
  const bio = artist.biography || artist.bio || artist.description || '';
  const country = artist.country || artist.origin || '';
  const genres = Array.isArray(artist.genres) ? artist.genres : (artist.genre ? [artist.genre] : []);
  const years = formatYears(artist.foundedYear, artist.disbandedYear);
  const gender = artist.gender || '';
  const membersCount = artist.membersCount ?? artist.members ?? '';

  let albumsHtml = '';
  if (albums && albums.length > 0) {
    albumsHtml = albums.map(album => {
      const tracks = album.tracks || album.songs || album.compositions || [];
      const rows = tracks.map(t => {
        const duration = t.duration ?? t.length ?? '';
        const ytLink = t.youtubeUrl || t.youtube || t.link || '';
        const ytCell = ytLink
          ? `<a href="${escapeHtml(ytLink)}" target="_blank" rel="noopener noreferrer" class="modal__track-link" aria-label="Watch on YouTube">▶</a>`
          : '—';
        return `<tr><td>${escapeHtml(t.name || t.title || '')}</td><td>${escapeHtml(duration)}</td><td>${ytCell}</td></tr>`;
      }).join('');
      return `
        <div class="modal__album">
          <h4 class="modal__album-title">${escapeHtml(album.name || album.title || 'Album')}</h4>
          <table class="modal__tracks">
            <thead><tr><th>Track</th><th>Duration</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }).join('');
  }

  return `
    <h2 class="modal__name" id="modal-title">${escapeHtml(name)}</h2>
    <div class="modal__top">
      <img class="modal__img" src="${imgUrl || 'https://via.placeholder.com/300x300/1a1a2e/666?text=No+image'}" alt="${escapeHtml(name)}" width="300" height="300" />
      <div class="modal__meta">
        <p><strong>Years:</strong> ${escapeHtml(years)}</p>
        ${gender ? `<p><strong>Gender:</strong> ${escapeHtml(gender)}</p>` : ''}
        ${membersCount !== '' ? `<p><strong>Members:</strong> ${escapeHtml(String(membersCount))}</p>` : ''}
        ${country ? `<p><strong>Country:</strong> ${escapeHtml(country)}</p>` : ''}
        ${genres.length ? `<p><strong>Genres:</strong> ${genres.map(g => escapeHtml(g)).join(', ')}</p>` : ''}
      </div>
    </div>
    ${bio ? `<div class="modal__bio"><h3>Biography</h3><p>${escapeHtml(bio)}</p></div>` : ''}
    ${albumsHtml ? `<div class="modal__albums"><h3>Albums</h3>${albumsHtml}</div>` : ''}
  `;
}

function closeModal() {
  if (!modalBackdrop) return;
  modalBackdrop.hidden = true;
  document.body.style.overflow = '';
  if (modalBody) {
    modalBody.innerHTML = '';
    modalBody.hidden = true;
  }
  // Clearing innerHTML removes any listeners attached to modal content elements (per task).
}

function openArtistModal(id) {
  if (!modalBackdrop || !modalBody || !modalLoader) return;
  modalBackdrop.hidden = false;
  modalBody.hidden = true;
  modalLoader.hidden = false;
  document.body.style.overflow = 'hidden';

  (async () => {
    showLoader();
    const [artist, albumsData] = await Promise.all([
      request(`/artists/${id}`, { noLoader: true }),
      request(`/artists/${id}/albums`, { noLoader: true }),
    ]);
    hideLoader();
    modalLoader.hidden = true;
    if (!artist) {
      showToast('Failed to load artist details', 'error');
      closeModal();
      return;
    }
    const albums = Array.isArray(albumsData) ? albumsData : (albumsData?.data ?? albumsData?.albums ?? []);
    modalBody.innerHTML = renderModalContent(artist, albums);
    modalBody.hidden = false;

    modalBody.querySelectorAll('a[href^="http"]').forEach(a => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  })();
}

function initModal() {
  modalCloseBtn?.addEventListener('click', closeModal);
  modalBackdrop?.addEventListener('click', e => {
    if (e.target === modalBackdrop) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalBackdrop && !modalBackdrop.hidden) closeModal();
  });
}

// ----- Feedback section (Swiper + star rating) -----
let feedbackSwiper = null;

function initFeedback(data) {
  const list = Array.isArray(data) ? data : (data?.data ?? data?.feedbacks ?? []);
  const slidesContainer = document.querySelector('[data-feedback-slides]');
  if (!slidesContainer) return;
  slidesContainer.innerHTML = '';
  const take = 10;
  list.slice(0, take).forEach(fb => {
    const rating = Math.round(Number(fb.rating) || 0);
    const slide = document.createElement('div');
    slide.className = 'swiper-slide feedback__slide';
    slide.innerHTML = `
      <div class="feedback__card">
        <div class="feedback__stars" data-rating="${rating}"></div>
        <p class="feedback__text">${escapeHtml(fb.text || fb.comment || fb.feedback || '')}</p>
        <p class="feedback__author">${escapeHtml(fb.author || fb.userName || fb.name || 'Visitor')}</p>
      </div>
    `;
    slidesContainer.appendChild(slide);
  });

  feedbackSwiper = new window.Swiper('.feedback-swiper', {
    slidesPerView: 1,
    spaceBetween: 24,
    pagination: { el: '.feedback__pagination', clickable: true },
    navigation: {
      nextEl: '.feedback__btn--next',
      prevEl: '.feedback__btn--prev',
    },
    breakpoints: {
      768: { slidesPerView: 1 },
      1440: { slidesPerView: 1 },
    },
  });

  // Star rating: use simple HTML stars (no extra lib if not required)
  document.querySelectorAll('.feedback__stars').forEach(el => {
    const r = parseInt(el.dataset.rating, 10) || 0;
    el.innerHTML = Array(5).fill(0).map((_, i) => `<span class="feedback__star ${i < r ? 'feedback__star--active' : ''}" aria-hidden="true">★</span>`).join('');
  });
}

async function loadFeedback() {
  const data = await getFeedbacks();
  if (data) initFeedback(data);
}

// ----- Init -----
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initArtists();
  initModal();
  loadFeedback();
});
