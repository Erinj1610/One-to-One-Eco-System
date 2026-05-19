const fs = require('fs');

const html = fs.readFileSync('../1to1_world_portal.html', 'utf-8');

// Extract CSS
const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (cssMatch) {
  let css = cssMatch[1];
  fs.appendFileSync('./src/portal.css', '\n/* NEW CSS FROM 1to1_world_portal.html */\n' + css);
  console.log('Appended CSS to portal.css');
}

// Extract Pages
const pages = [
  'crm', 'client-detail', 'pipeline', 'time', 'products', 
  'boq', 'orders', 'invoices', 'docs', 'hr', 'reports', 'support', 'settings'
];

let jsx = `import React from 'react';\n\n`;

for (const page of pages) {
  const regex = new RegExp(`<div class="page(?: active)?" id="page-${page}">([\\s\\S]*?)<!-- ============`, 'i');
  let match = html.match(regex);
  
  if (!match) {
      // try matching to the end of the div
      const regex2 = new RegExp(`<div class="page(?: active)?" id="page-${page}">([\\s\\S]*?)</div>\\s*<!--`, 'i');
      match = html.match(regex2);
  }

  if (match) {
    let content = match[1];
    // We need to fix the unclosed div from the regex hack if necessary, but actually 
    // a better way to extract is using cheerio. Let's just install cheerio temporarily.
  }
}
