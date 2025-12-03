/**
 * Email Parser
 * Extracts meaningful content from HTML and plain text emails and presents it in a clean format
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
  
  // Extract structured content
  const structuredContent = extractStructuredContent(doc);
  
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
    structuredContent,
    tables,
    links,
    images,
    hasStructuredContent: structuredContent.length > 0 || tables.length > 0 || links.length > 0
  };
}

/**
 * Parse plain text email and extract structured data
 * @param {string} text - Raw plain text content
 * @returns {Object} Parsed email data
 */
export function parseEmailText(text) {
  if (!text) {
    return {
      text: '',
      structuredContent: [],
      tables: [],
      links: [],
      images: [],
      hasStructuredContent: false
    };
  }

  const structuredContent = extractStructuredContentFromText(text);
  const links = extractLinksFromText(text);

  return {
    text: text.trim(),
    structuredContent,
    tables: [],
    links,
    images: [],
    hasStructuredContent: structuredContent.length > 0 || links.length > 0
  };
}

/**
 * Extract structured content from plain text
 */
function extractStructuredContentFromText(text) {
  const content = [];
  const lines = text.split('\n');
  let currentParagraph = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      // If we have accumulated paragraph text, add it
      if (currentParagraph.length > 0) {
        content.push({
          type: 'paragraph',
          text: currentParagraph.join(' ')
        });
        currentParagraph = [];
      }
      continue;
    }
    
    // Detect headings (ALL CAPS lines or lines ending with colon)
    const isAllCaps = line === line.toUpperCase() && line.length > 3 && line.length < 100 && /[A-Z]/.test(line);
    const endsWithColon = line.endsWith(':') && line.length < 100 && !line.includes('http');
    
    if (isAllCaps || endsWithColon) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        content.push({
          type: 'paragraph',
          text: currentParagraph.join(' ')
        });
        currentParagraph = [];
      }
      
      // Add as heading
      content.push({
        type: 'heading',
        level: isAllCaps ? 2 : 3,
        text: line.replace(/:$/, '')
      });
      continue;
    }
    
    // Detect list items (lines starting with -, *, •, or numbers)
    const listMatch = line.match(/^(\s*)([-*•]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        content.push({
          type: 'paragraph',
          text: currentParagraph.join(' ')
        });
        currentParagraph = [];
      }
      
      // Check if we should add to existing list or create new one
      const lastItem = content[content.length - 1];
      const isNumbered = /^\d+\./.test(listMatch[2]);
      
      if (lastItem && lastItem.type === 'list' && lastItem.ordered === isNumbered) {
        // Add to existing list
        lastItem.items.push(listMatch[3]);
      } else {
        // Create new list
        content.push({
          type: 'list',
          ordered: isNumbered,
          items: [listMatch[3]]
        });
      }
      continue;
    }
    
    // Detect horizontal separators (lines with only dashes, equals, or underscores)
    if (/^[-=_]{3,}$/.test(line)) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        content.push({
          type: 'paragraph',
          text: currentParagraph.join(' ')
        });
        currentParagraph = [];
      }
      continue;
    }
    
    // Regular text - accumulate into paragraph
    currentParagraph.push(line);
  }
  
  // Flush any remaining paragraph
  if (currentParagraph.length > 0) {
    content.push({
      type: 'paragraph',
      text: currentParagraph.join(' ')
    });
  }
  
  return content;
}

/**
 * Extract links from plain text
 */
function extractLinksFromText(text) {
  const links = [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[1];
    links.push({
      text: url,
      href: url,
      domain: extractDomain(url)
    });
  }
  
  return links;
}

/**
 * Extract structured content (headings, paragraphs, lists, etc.)
 */
function extractStructuredContent(doc) {
  const content = [];
  const seenTexts = new Set(); // Avoid duplicates
  
  // Get the body or main content area
  const body = doc.body;
  if (!body) return content;
  
  // Helper to check if element is likely a content container
  const isContentElement = (node) => {
    const tagName = node.tagName.toLowerCase();
    
    // Skip script, style, and hidden elements
    if (['script', 'style', 'noscript', 'meta', 'link'].includes(tagName)) {
      return false;
    }
    
    // Skip if element has display:none or visibility:hidden
    const style = window.getComputedStyle ? window.getComputedStyle(node) : node.style;
    if (style && (style.display === 'none' || style.visibility === 'hidden')) {
      return false;
    }
    
    return true;
  };
  
  // Helper to get direct text content (not from nested elements)
  const getDirectText = (node) => {
    return Array.from(node.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent.trim())
      .filter(t => t.length > 0)
      .join(' ')
      .trim();
  };
  
  // Helper to add content if not duplicate
  const addContent = (item) => {
    const key = `${item.type}:${item.text || item.items?.join('|')}`;
    if (!seenTexts.has(key) && item.text && item.text.length > 0) {
      seenTexts.add(key);
      content.push(item);
      return true;
    }
    return false;
  };
  
  // Process all child nodes recursively
  const processNode = (node, depth = 0, inTable = false) => {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
    if (!isContentElement(node)) return;
    
    const tagName = node.tagName.toLowerCase();
    
    // Skip layout tables but process their content
    if (tagName === 'table') {
      if (isLikelyLayoutTable(node)) {
        // Process children of layout table to extract content
        Array.from(node.querySelectorAll('td, th')).forEach(cell => {
          processNode(cell, depth + 1, true);
        });
        return;
      }
      // For data tables, skip them (they're handled separately)
      return;
    }
    
    // Extract headings (h1-h6)
    if (/^h[1-6]$/.test(tagName)) {
      const text = node.textContent.trim();
      if (text && text.length > 2 && text.length < 200) {
        addContent({
          type: 'heading',
          level: parseInt(tagName[1]),
          text
        });
      }
      return; // Don't process children
    }
    
    // Extract paragraphs
    if (tagName === 'p') {
      const text = node.textContent.trim();
      if (text && text.length > 5 && text.length < 1000) {
        addContent({
          type: 'paragraph',
          text
        });
      }
      return; // Don't process children
    }
    
    // Extract lists (ul, ol)
    if (tagName === 'ul' || tagName === 'ol') {
      const items = [];
      const listItems = node.querySelectorAll(':scope > li');
      listItems.forEach(li => {
        const text = li.textContent.trim();
        if (text && text.length > 2) {
          items.push(text);
        }
      });
      
      if (items.length > 0) {
        const key = `list:${items.join('|')}`;
        if (!seenTexts.has(key)) {
          seenTexts.add(key);
          content.push({
            type: 'list',
            ordered: tagName === 'ol',
            items
          });
        }
      }
      return; // Don't process children
    }
    
    // Extract blockquotes
    if (tagName === 'blockquote') {
      const text = node.textContent.trim();
      if (text && text.length > 5) {
        addContent({
          type: 'blockquote',
          text
        });
      }
      return; // Don't process children
    }
    
    // Extract divs with significant direct text content
    if (tagName === 'div' || tagName === 'td' || tagName === 'th') {
      const directText = getDirectText(node);
      
      // Only add if it has meaningful direct text and isn't too long
      if (directText && directText.length >= 10 && directText.length < 500) {
        // Check if this looks like a meaningful paragraph
        const hasChildren = node.children.length > 0;
        const childrenAreInline = hasChildren && Array.from(node.children).every(child => {
          const childTag = child.tagName.toLowerCase();
          return ['span', 'a', 'strong', 'em', 'b', 'i', 'u', 'br', 'img'].includes(childTag);
        });
        
        // Add as paragraph if it's substantial text
        if (!hasChildren || childrenAreInline) {
          addContent({
            type: 'paragraph',
            text: node.textContent.trim()
          });
          return; // Don't process children if we added this as content
        }
      }
    }
    
    // Process children for other elements
    Array.from(node.children).forEach(child => {
      processNode(child, depth + 1, inTable);
    });
  };
  
  // Start processing from body
  Array.from(body.children).forEach(child => {
    processNode(child);
  });
  
  return content;
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
 * Extracts both explicit <a> tags and URLs found in text content
 */
function extractLinks(doc) {
  const links = [];
  const seenUrls = new Set(); // Track unique URLs to avoid duplicates
  
  // 1. Extract explicit <a> tags
  const anchors = doc.querySelectorAll('a[href]');
  anchors.forEach((a) => {
    const text = a.textContent.trim();
    const href = a.getAttribute('href');
    
    if (href && !href.startsWith('#') && !seenUrls.has(href)) {
      seenUrls.add(href);
      links.push({
        text: text || href,
        href,
        domain: extractDomain(href),
        type: 'anchor'
      });
    }
  });
  
  // 2. Extract URLs from text content and attributes
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]*)/g;
  
  // Extract from all text nodes
  const walker = doc.createTreeWalker(
    doc.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent;
    let match;
    
    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[1];
      
      // Skip if already found as anchor
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        links.push({
          text: url,
          href: url,
          domain: extractDomain(url),
          type: 'text'
        });
      }
    }
  }
  
  // 3. Extract URLs from common attributes (data-href, onclick, etc.)
  const elementsWithUrls = doc.querySelectorAll('[data-href], [onclick], [style]');
  elementsWithUrls.forEach((el) => {
    // Check data-href attribute
    const dataHref = el.getAttribute('data-href');
    if (dataHref && dataHref.startsWith('http') && !seenUrls.has(dataHref)) {
      seenUrls.add(dataHref);
      links.push({
        text: dataHref,
        href: dataHref,
        domain: extractDomain(dataHref),
        type: 'attribute'
      });
    }
    
    // Check onclick for URLs
    const onclick = el.getAttribute('onclick');
    if (onclick) {
      const urlMatch = onclick.match(/(https?:\/\/[^\s'"]*)/);
      if (urlMatch && !seenUrls.has(urlMatch[1])) {
        seenUrls.add(urlMatch[1]);
        links.push({
          text: urlMatch[1],
          href: urlMatch[1],
          domain: extractDomain(urlMatch[1]),
          type: 'onclick'
        });
      }
    }
    
    // Check style for URLs (background-image, etc.)
    const style = el.getAttribute('style');
    if (style) {
      const urlMatch = style.match(/url\(['"]?(https?:\/\/[^\s'"()]*)/);
      if (urlMatch && !seenUrls.has(urlMatch[1])) {
        seenUrls.add(urlMatch[1]);
        links.push({
          text: urlMatch[1],
          href: urlMatch[1],
          domain: extractDomain(urlMatch[1]),
          type: 'style'
        });
      }
    }
  });
  
  return links;
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (e) {
    // If URL parsing fails, try to extract domain manually
    const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/\?#]+)/i);
    return match ? match[1] : url;
  }
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
