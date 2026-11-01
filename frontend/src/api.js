/**
 * FinScope AI — API Service
 * Handles all communication with the FastAPI backend.
 * Auto-detects backend URL (proxy or direct).
 */

const BACKEND_URL = 'http://localhost:8000';
const API_BASE = `${BACKEND_URL}/api`;

class ApiService {
  async _fetch(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `API error: ${res.status}`);
      }

      return res.json();
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error('Cannot connect to backend. Make sure the server is running on port 8000.');
      }
      throw err;
    }
  }

  // ─── Documents ───

  async uploadDocument(file) {
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Upload failed');
    }

    return res.json();
  }

  async getDocuments() {
    return this._fetch('/documents');
  }

  async deleteDocument(docId) {
    return this._fetch(`/documents/${docId}`, { method: 'DELETE' });
  }

  // ─── Chat ───

  async chat(query, filterDoc = null) {
    return this._fetch('/chat', {
      method: 'POST',
      body: JSON.stringify({ query, filter_doc: filterDoc }),
    });
  }

  // ─── Stats & Dashboard ───

  async getStats() {
    return this._fetch('/stats');
  }

  async getDashboard() {
    return this._fetch('/dashboard');
  }

  // ─── System ───

  async loadSamples() {
    return this._fetch('/load-samples', { method: 'POST' });
  }

  async reset() {
    return this._fetch('/reset', { method: 'POST' });
  }

  async healthCheck() {
    return fetch(BACKEND_URL).then(r => r.json());
  }
}

const api = new ApiService();
export default api;
