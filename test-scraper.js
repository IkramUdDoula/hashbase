import axios from 'axios';
import * as cheerio from 'cheerio';

async function testScraper() {
  console.log('🔄 Fetching The Daily Star homepage...\n');
  
  try {
    const response = await axios.get('https://www.thedailystar.net/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    console.log('✅ Page loaded successfully\n');
    console.log('📊 Testing different selectors:\n');
    
    // Test different article selectors
    const selectors = ['.card-lg', '.card-md', '.card-sm', 'article', '.news-item'];
    
    selectors.forEach(selector => {
      const count = $(selector).length;
      console.log(`  ${selector}: ${count} elements found`);
    });
    
    console.log('\n🔍 Looking for ANY links that might be articles:\n');
    
    // Find all links
    let articleCount = 0;
    $('a').each((index, element) => {
      if (articleCount >= 5) return false;
      
      const $link = $(element);
      const href = $link.attr('href');
      const title = $link.text().trim() || $link.find('h1, h2, h3, h4').text().trim();
      
      if (title && title.length > 20 && href && (href.includes('/news/') || href.includes('/article/') || href.includes('/story/') || href.includes('/business/'))) {
        articleCount++;
        console.log(`\n--- Article ${articleCount}: ${title.substring(0, 60)}... ---`);
        console.log(`    URL: ${href}`);
        
        // Check parent element for date info
        const parent = $link.parent();
        
        // Check for time elements
        const timeEl = parent.find('time').first();
        if (timeEl.length) {
          console.log(`  ✅ <time> element found:`);
          console.log(`     - datetime attr: ${timeEl.attr('datetime') || 'NONE'}`);
          console.log(`     - text: ${timeEl.text().trim() || 'NONE'}`);
        } else {
          console.log(`  ❌ No <time> element`);
        }
        
        // Check for date classes in parent
        const dateEl = parent.find('.time, .date, .published, .timestamp, [class*="time"], [class*="date"]').first();
        if (dateEl.length) {
          console.log(`  ✅ Date class found:`);
          console.log(`     - class: ${dateEl.attr('class')}`);
          console.log(`     - text: ${dateEl.text().trim()}`);
        } else {
          console.log(`  ❌ No date class elements`);
        }
        
        // Check for "ago" patterns in parent text
        const allText = parent.text();
        const agoMatch = allText.match(/(\d+\s+(?:minute|hour|day|week|month)s?\s+ago)/i);
        if (agoMatch) {
          console.log(`  ✅ "ago" pattern found: "${agoMatch[1]}"`);
        } else {
          console.log(`  ❌ No "ago" pattern in text`);
        }
        
        // Show parent HTML structure
        console.log(`  📄 Parent HTML classes: ${parent.attr('class') || 'NONE'}`);
        console.log(`  📄 Parent tag: <${parent.prop('tagName')}>`);
      }
    });
    
    console.log('\n\n🔍 Searching entire page for date patterns:\n');
    
    // Search for any "ago" patterns on the page
    const pageText = $('body').text();
    const allAgoMatches = pageText.match(/\d+\s+(?:minute|hour|day|week|month)s?\s+ago/gi);
    if (allAgoMatches) {
      console.log(`  Found ${allAgoMatches.length} "ago" patterns on page:`);
      allAgoMatches.slice(0, 5).forEach(match => {
        console.log(`    - "${match}"`);
      });
    } else {
      console.log(`  ❌ No "ago" patterns found anywhere on page`);
    }
    
    // Search for time elements anywhere
    const allTimeElements = $('time');
    console.log(`\n  Found ${allTimeElements.length} <time> elements on page`);
    if (allTimeElements.length > 0) {
      allTimeElements.slice(0, 3).each((i, el) => {
        const $time = $(el);
        console.log(`    ${i + 1}. datetime="${$time.attr('datetime') || 'NONE'}" text="${$time.text().trim()}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testScraper();
