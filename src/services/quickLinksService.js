/**
 * Quick Links Service
 * Manages quick access links for the dock-style widget
 */

const STORAGE_KEY = 'hashbase_quicklinks';

/**
 * Get all quick links
 * @returns {Array<{id: string, url: string, title: string, lucideIcon: string, order: number}>}
 */
export function getQuickLinks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const links = JSON.parse(saved);
      // Sort by order
      return links.sort((a, b) => a.order - b.order);
    }
  } catch (error) {
    console.error('Error loading quick links:', error);
  }
  return [];
}

/**
 * Save quick links
 * @param {Array} links - Array of link objects
 */
export function saveQuickLinks(links) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch (error) {
    console.error('Error saving quick links:', error);
  }
}

/**
 * Add a new quick link
 * @param {string} url - URL to add
 * @param {string} title - Display title
 * @param {string} lucideIcon - Lucide icon name
 * @returns {Object} The created link object
 */
export function addQuickLink(url, title, lucideIcon = 'Link2') {
  const links = getQuickLinks();
  const newLink = {
    id: `link-${Date.now()}`,
    url: normalizeUrl(url),
    title: title || extractDomain(url),
    lucideIcon: lucideIcon || 'Link2',
    order: links.length
  };
  
  links.push(newLink);
  saveQuickLinks(links);
  return newLink;
}

/**
 * Update an existing quick link
 * @param {string} id - Link ID
 * @param {Object} updates - Fields to update
 */
export function updateQuickLink(id, updates) {
  const links = getQuickLinks();
  const index = links.findIndex(link => link.id === id);
  
  if (index !== -1) {
    links[index] = { ...links[index], ...updates };
    
    // Normalize URL if changed
    if (updates.url) {
      links[index].url = normalizeUrl(updates.url);
    }
    
    saveQuickLinks(links);
  }
}

/**
 * Delete a quick link
 * @param {string} id - Link ID to delete
 */
export function deleteQuickLink(id) {
  const links = getQuickLinks();
  const filtered = links.filter(link => link.id !== id);
  
  // Reorder remaining links
  filtered.forEach((link, index) => {
    link.order = index;
  });
  
  saveQuickLinks(filtered);
}

/**
 * Reorder quick links
 * @param {Array<string>} orderedIds - Array of link IDs in new order
 */
export function reorderQuickLinks(orderedIds) {
  const links = getQuickLinks();
  const linkMap = new Map(links.map(link => [link.id, link]));
  
  const reordered = orderedIds
    .map(id => linkMap.get(id))
    .filter(Boolean)
    .map((link, index) => ({ ...link, order: index }));
  
  saveQuickLinks(reordered);
}

/**
 * Normalize URL (add https:// if missing)
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  if (!url) return '';
  
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Extract domain from URL for default title
 * @param {string} url - URL to extract from
 * @returns {string} Domain name
 */
function extractDomain(url) {
  try {
    const normalized = normalizeUrl(url);
    const urlObj = new URL(normalized);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
