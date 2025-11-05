/**
 * Email HTML Parser
 * Extracts meaningful content from complex HTML emails and presents it in a clean format
 */

/**
 * Parse HTML email and extract structured data
 * @param {string} html - Raw HTML content
 * @returns {Object} Parsed email data
 */
export function parseEmailHTML(html) {
  // Create a temporary DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extract all text content
  const allText = doc.body.textContent || '';
  
  // Extract tables
  const tables = extractTables(doc);
  
  // Extract links
  const links = extractLinks(doc);
  
  // Extract images
  const images = extractImages(doc);
  
  // Clean up whitespace
  const cleanText = allText
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  return {
    text: cleanText,
    tables,
    links,
    images,
    hasStructuredContent: tables.length > 0 || links.length > 0
  };
}

/**
 * Extract tables from HTML
 */
function extractTables(doc) {
  const tables = [];
  const tableElements = doc.querySelectorAll('table');
  
  tableElements.forEach((table, tableIndex) => {
    // Check if this is a layout table (used for email structure)
    // Layout tables typically have:
    // - Single column with width="100%"
    // - Nested tables
    // - Very few cells with mostly empty content
    const isLayoutTable = isLikelyLayoutTable(table);
    
    if (isLayoutTable) {
      return; // Skip layout tables
    }
    
    const rows = [];
    const trs = Array.from(table.querySelectorAll(':scope > tbody > tr, :scope > tr'));
    
    if (trs.length === 0) {
      return; // No rows found
    }
    
    trs.forEach((tr) => {
      const cells = [];
      const tds = Array.from(tr.querySelectorAll(':scope > td, :scope > th'));
      
      tds.forEach((td) => {
        const text = td.textContent.trim();
        // Include cells even if empty to maintain table structure
        cells.push({
          text: text || '',
          isHeader: td.tagName === 'TH',
          colspan: parseInt(td.getAttribute('colspan')) || 1,
          rowspan: parseInt(td.getAttribute('rowspan')) || 1,
          align: td.getAttribute('align') || 'left'
        });
      });
      
      if (cells.length > 0) {
        rows.push(cells);
      }
    });
    
    // Only add tables with meaningful content
    if (rows.length > 0 && hasDataContent(rows)) {
      tables.push({
        id: `table-${tableIndex}`,
        rows,
        columnCount: Math.max(...rows.map(r => r.reduce((sum, cell) => sum + cell.colspan, 0)))
      });
    }
  });
  
  return tables;
}

/**
 * Check if a table is likely a layout table (for email structure)
 */
function isLikelyLayoutTable(table) {
  // Check for nested tables (common in email layouts)
  const nestedTables = table.querySelectorAll('table');
  if (nestedTables.length > 0) {
    return true;
  }
  
  // Check if table has very few cells
  const cellCount = table.querySelectorAll('td, th').length;
  if (cellCount === 0 || cellCount === 1) {
    return true;
  }
  
  // Check if table has width="100%" and role="presentation" (common layout indicators)
  const width = table.getAttribute('width');
  const role = table.getAttribute('role');
  if ((width === '100%' || width === '600') && role === 'presentation') {
    return true;
  }
  
  return false;
}

/**
 * Check if table rows contain meaningful data
 */
function hasDataContent(rows) {
  // Count non-empty cells
  let nonEmptyCells = 0;
  let totalCells = 0;
  
  rows.forEach(row => {
    row.forEach(cell => {
      totalCells++;
      if (cell.text.length > 0) {
        nonEmptyCells++;
      }
    });
  });
  
  // Table should have at least 30% non-empty cells to be considered data
  return totalCells > 0 && (nonEmptyCells / totalCells) >= 0.3;
}

/**
 * Extract links from HTML
 */
function extractLinks(doc) {
  const links = [];
  const anchors = doc.querySelectorAll('a[href]');
  
  anchors.forEach((a) => {
    const text = a.textContent.trim();
    const href = a.getAttribute('href');
    
    if (text && href && !href.startsWith('#')) {
      links.push({
        text,
        href
      });
    }
  });
  
  return links;
}

/**
 * Extract images from HTML
 */
function extractImages(doc) {
  const images = [];
  const imgs = doc.querySelectorAll('img[src]');
  
  imgs.forEach((img) => {
    const src = img.getAttribute('src');
    const alt = img.getAttribute('alt') || '';
    
    // Skip tracking pixels and tiny images
    const width = img.getAttribute('width') || img.width || 0;
    const height = img.getAttribute('height') || img.height || 0;
    
    if (src && (width > 20 || height > 20 || !width)) {
      images.push({
        src,
        alt,
        width,
        height
      });
    }
  });
  
  return images;
}

/**
 * Extract key-value pairs from text (common in transaction emails)
 */
export function extractKeyValuePairs(text) {
  const pairs = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip very long lines (likely paragraphs, not key-value pairs)
    if (line.length > 100) continue;
    
    // Look for patterns like "Label: Value"
    const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
    if (colonMatch && colonMatch[1].length < 50) {
      pairs.push({
        key: colonMatch[1].trim(),
        value: colonMatch[2].trim()
      });
      continue;
    }
    
    // Look for patterns with currency at the end: "Label BDT 123.45" or "Label $123.45"
    const currencyMatch = line.match(/^(.+?)\s+(BDT\s*[\d,]+\.?\d*|USD\s*[\d,]+\.?\d*|\$\s*[\d,]+\.?\d*|€\s*[\d,]+\.?\d*|£\s*[\d,]+\.?\d*)$/);
    if (currencyMatch && currencyMatch[1].length < 50) {
      pairs.push({
        key: currencyMatch[1].trim(),
        value: currencyMatch[2].trim()
      });
      continue;
    }
    
    // Look for date/time patterns
    const dateMatch = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)$/i);
    if (dateMatch) {
      pairs.push({
        key: 'Date & Time',
        value: dateMatch[1].trim()
      });
    }
  }
  
  return pairs;
}
