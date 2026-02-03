/**
 * API client for Sound Wave backend.
 * Base URL: https://sound-wave.b.goit.study
 */

const BASE_URL = 'https://sound-wave.b.goit.study';

const loaderEl = document.querySelector('[data-loader]');
const toastContainer = document.querySelector('[data-toast-container]');

export function showLoader() {
  if (loaderEl) {
    loaderEl.hidden = false;
    loaderEl.removeAttribute('aria-hidden');
  }
}

export function hideLoader() {
  if (loaderEl) {
    loaderEl.hidden = true;
    loaderEl.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Show toast notification (push message) for errors or success.
 * @param {string} message
 * @param { 'error' | 'success' } type
 */
export function showToast(message, type = 'error') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.textContent = message;
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  const t = setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
    clearTimeout(t);
  }, 4000);
}

/**
 * Fetch from API with loader and error handling.
 * @param {string} path - e.g. '/artists', '/artists/1', '/feedbacks'
 * @param {RequestInit & { noLoader?: boolean }} [options]
 * @returns {Promise<any>} Parsed JSON or null on failure
 */
export async function request(path, options = {}) {
  const { noLoader, ...fetchOptions } = options;
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  if (!noLoader) showLoader();
  try {
    const headers = { ...fetchOptions.headers };
    if (fetchOptions.body != null) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, { ...fetchOptions, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || data.error || `Request failed: ${res.status}`;
      showToast(msg, 'error');
      return null;
    }
    return data;
  } catch (err) {
    const msg = err.message || 'Network error. Please try again.';
    showToast(msg, 'error');
    return null;
  } finally {
    if (!noLoader) hideLoader();
  }
}

export function getArtists(page = 1, limit = 8) {
  return request(`/artists?page=${page}&limit=${limit}`);
}

export function getArtistById(id) {
  return request(`/artists/${id}`);
}

export function getArtistAlbums(id) {
  return request(`/artists/${id}/albums`);
}

export function getFeedbacks() {
  return request('/feedbacks');
}
