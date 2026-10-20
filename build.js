#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Read the dashboard template
const dashboardTemplatePath = path.join(__dirname, 'dev.html');
const dashboardTemplate = fs.readFileSync(dashboardTemplatePath, 'utf8');

// Configuration
const OUTPUT_DIR = path.join(__dirname, 'items');
const API_HEADERS = { 'User-Agent': 'osrs.lol bot' };
const BATCH_SIZE = 50;
const RATE_LIMIT_MS = 100;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Utility to fetch from API
function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: API_HEADERS }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(new Error(`JSON parse error for ${url}: ${err.message}`));
                }
            });
        }).on('error', reject);
    });
}

// Convert item name to URL slug - handles unique variations (p++ etc)
function nameToSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/\+/g, '-plus') // Convert + to "plus"
        .replace(/[^\w\s-]/g, ' ') // Convert everything else (like brackets) to spaces
        .replace(/\s+/g, '-') // Convert all spaces to dashes
        .replace(/-+/g, '-') // Collapse multiple dashes
        .replace(/^-+|-+$/g, ''); // Trim leading/trailing dashes
}

// Escape text for use in HTML text and attribute values
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// JSON for an inline <script> block (can't close the tag early)
function inlineJSON(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}

function formatGp(value) {
    return `${Math.round(value).toLocaleString('en-US')} GP`;
}

// Same GE tax rules as the dashboard (dev.html): 2% per item, rounded down, capped at 5m per item
const GE_TAX_EXEMPT_IDS = new Set([13190, 1755, 5325, 1785, 2347, 1733, 233, 5341, 8794, 5329, 5343, 1735, 952, 5331]);
function geTaxPerItem(itemId, sellPrice) {
    if (!sellPrice || GE_TAX_EXEMPT_IDS.has(itemId)) return 0;
    return Math.min(Math.floor(sellPrice * 0.02), 5000000);
}

// Replace exactly one match, failing the build if the dashboard template changed underneath us
function replaceOnce(html, search, replacement, label) {
    const found = typeof search === 'string' ? html.includes(search) : search.test(html);
    if (!found) throw new Error(`Template is missing ${label}`);
    return html.replace(search, typeof replacement === 'string' ? () => replacement : replacement);
}

// Words used to find related items: "Torva platebody (damaged)" -> ["torva", "platebody"]
function nameWords(name) {
    return name.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);
}

// The `count` items alphabetically closest to `item` within a sorted group that contains it
function closestInGroup(group, item, count) {
    const index = group.indexOf(item);
    const picked = [];
    for (let offset = 1; picked.length < count && (index - offset >= 0 || index + offset < group.length); offset++) {
        if (index - offset >= 0) picked.push(group[index - offset]);
        if (picked.length < count && index + offset < group.length) picked.push(group[index + offset]);
    }
    return picked;
}

// Index of all items for related-item links and previous/next navigation
function buildItemIndex(mapping) {
    const sorted = [...mapping].sort((a, b) => a.name.localeCompare(b.name));
    const byFirstWord = new Map();
    const byLastWord = new Map();
    for (const item of sorted) {
        const words = nameWords(item.name);
        if (words.length === 0) continue;
        const first = words[0];
        const last = words[words.length - 1];
        if (!byFirstWord.has(first)) byFirstWord.set(first, []);
        byFirstWord.get(first).push(item);
        if (!byLastWord.has(last)) byLastWord.set(last, []);
        byLastWord.get(last).push(item);
    }
    return { sorted, byFirstWord, byLastWord };
}

// Up to 10 related items: same first word ("Torva ..."), then same last word ("... platebody")
function relatedItems(item, index) {
    const words = nameWords(item.name);
    if (words.length === 0) return [];
    const related = new Map();
    const add = (items) => items.forEach(other => { if (other !== item && related.size < 10) related.set(other.id, other); });
    add(closestInGroup(index.byFirstWord.get(words[0]), item, 6));
    if (words.length > 1) add(closestInGroup(index.byLastWord.get(words[words.length - 1]), item, 10));
    return [...related.values()];
}

// Icons used by displayItemInfo() in dev.html
const ICONS = {
    volume: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm4 2a1 1 0 00-1 1v10a1 1 0 102 0V6a1 1 0 00-1-1zm4-2a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm4 2a1 1 0 00-1 1v10a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>',
    limit: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clip-rule="evenodd" /></svg>',
    alch: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.158-.103.346-.195.574-.277a6.213 6.213 0 014.228 0c.228.082.416.174.574.277a1 1 0 01.348 1.311l-.348.347a1 1 0 01-1.414 0L11 8.414V14a1 1 0 11-2 0V8.414l-.879.879a1 1 0 01-1.414 0l-.348-.347a1 1 0 01.073-1.403z" /><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.998 3.998 0 00-5.656 0L6.92 12.754A7.963 7.963 0 016 10c0-4.418 3.582-8 8-8s8 3.582 8 8z" clip-rule="evenodd" /></svg>'
};

// Server-rendered copy of what displayItemInfo() in dev.html shows, so the page has real content
// before any JavaScript runs; the dashboard swaps in live prices once they load
function renderPriceSnapshot(item, latestPrice, volume) {
    let priceInfo = '<p class="text-secondary">No live price data available.</p>';
    if (latestPrice.high && latestPrice.low) {
        const netMargin = (latestPrice.high - latestPrice.low) - geTaxPerItem(item.id, latestPrice.high);
        const netMarginPercent = (netMargin / latestPrice.low) * 100;
        priceInfo = `
                    <p><strong>High Price:</strong> <span class="text-profit clickable-price" data-price="${latestPrice.high}" data-target="sell">${formatGp(latestPrice.high)}</span></p>
                    <p><strong>Low Price:</strong> <span class="text-loss clickable-price" data-price="${latestPrice.low}" data-target="buy">${formatGp(latestPrice.low)}</span></p>
                    <hr class="my-3 border-custom">
                    <p><strong>Net Margin:</strong> <span class="text-accent">${formatGp(netMargin)} (${netMarginPercent.toFixed(2)}%)</span></p>
                    <p><strong>Profit/Flip:</strong> <span class="${netMargin > 0 ? 'text-profit' : 'text-loss'} font-bold">${formatGp(netMargin)}</span></p>
                `;
    } else if (latestPrice.high || latestPrice.low) {
        // Only one side has traded recently, so there is no margin to show
        const side = (price, target, colour) => price
            ? `<span class="${colour} clickable-price" data-price="${price}" data-target="${target}">${formatGp(price)}</span>`
            : '<span class="text-secondary">No recent trades</span>';
        priceInfo = `
                    <p><strong>High Price:</strong> ${side(latestPrice.high, 'sell', 'text-profit')}</p>
                    <p><strong>Low Price:</strong> ${side(latestPrice.low, 'buy', 'text-loss')}</p>
                `;
    }
    const row = (icon, label, valueHtml) => `
                <div class="flex items-center justify-between">
                    <span class="flex items-center text-secondary">
                        ${icon}
                        ${label}
                    </span>
                    ${valueHtml}
                </div>`;
    const additionalInfo = [
        row(ICONS.volume, '24h Volume', `<span class="font-bold text-primary">${volume ? volume.toLocaleString('en-US') : 'N/A'}</span>`),
        row(ICONS.limit, 'Buy Limit', `<span class="font-bold text-primary clickable-limit" data-limit="${item.limit}">${item.limit ? item.limit.toLocaleString('en-US') : 'N/A'}</span>`),
        row(ICONS.alch, 'High Alch', `<span class="font-bold text-primary">${item.highalch ? formatGp(item.highalch) : 'N/A'}</span>`)
    ].join('') + '\n                <div id="trend-analysis"></div>';
    return { priceInfo, additionalInfo };
}

// Visible "About" section: the item's facts, a dated price summary and links to related items
function renderItemDetails(item, latestPrice, volume, context) {
    const name = escapeHtml(item.name);

    let summary;
    if (latestPrice.high && latestPrice.low) {
        const netMargin = (latestPrice.high - latestPrice.low) - geTaxPerItem(item.id, latestPrice.high);
        summary = `On ${context.snapshotTime} UTC, ${name} was trading on the Grand Exchange at ${formatGp(latestPrice.high)} (high) and ${formatGp(latestPrice.low)} (low)`;
        summary += volume ? `, with ${volume.toLocaleString('en-US')} traded in the previous 24 hours. ` : '. ';
        if (netMargin > 0) {
            summary += `After the 2% GE tax, buying at the low price and selling at the high price made about ${formatGp(netMargin)} per item`;
            summary += item.limit ? `, or ${formatGp(netMargin * item.limit)} for a full buy limit of ${item.limit.toLocaleString('en-US')}.` : '.';
        } else {
            summary += 'At those prices the margin did not cover the 2% GE tax, so it was not a profitable flip.';
        }
        if (item.highalch && context.natureRunePrice) {
            const alchProfit = item.highalch - latestPrice.high - context.natureRunePrice;
            summary += ` Buying one at the high price and casting High Level Alchemy on it ${alchProfit >= 0 ? 'made' : 'lost'} ${formatGp(Math.abs(alchProfit))} after paying for the nature rune.`;
        }
    } else if (latestPrice.high || latestPrice.low) {
        const side = latestPrice.high ? 'high' : 'low';
        summary = `On ${context.snapshotTime} UTC, the latest Grand Exchange trade for ${name} was at ${formatGp(latestPrice.high || latestPrice.low)} (${side}). There was no recent trade on the other side, so there is no current margin.`;
    } else {
        summary = `The OSRS Wiki has no recent Grand Exchange trades recorded for ${name}, so there is no current margin. The tool above shows any trades as soon as they happen.`;
    }

    const facts = [
        ['Buy limit', item.limit ? `${item.limit.toLocaleString('en-US')} every 4 hours` : 'Unknown'],
        ['High alch', item.highalch ? formatGp(item.highalch) : 'N/A'],
        ['Low alch', item.lowalch ? formatGp(item.lowalch) : 'N/A'],
        ['Store value', item.value ? formatGp(item.value) : 'N/A'],
        ['Members', item.members ? 'Yes' : 'No'],
        ['Item ID', item.id]
    ].map(([label, value]) => `
                <div>
                    <dt class="text-sm text-secondary">${label}</dt>
                    <dd class="font-bold text-primary">${value}</dd>
                </div>`).join('');

    const related = relatedItems(item, context.index);
    const relatedList = related.length === 0 ? '' : `
            <h3 class="text-lg font-bold section-title mt-6 mb-3">Related items</h3>
            <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
${related.map(other => `                <li><a href="/items/${nameToSlug(other.name)}" class="text-accent hover:underline">${escapeHtml(other.name)}</a></li>`).join('\n')}
            </ul>`;

    const position = context.index.sorted.indexOf(item);
    const previous = context.index.sorted[position - 1];
    const next = context.index.sorted[position + 1];
    const browse = `
            <nav aria-label="Browse items" class="flex flex-wrap justify-between gap-2 mt-6 text-sm">
                ${previous ? `<a href="/items/${nameToSlug(previous.name)}" rel="prev" class="text-accent hover:underline">← ${escapeHtml(previous.name)}</a>` : '<span></span>'}
                <a href="/all_items" class="text-accent hover:underline">All items</a>
                ${next ? `<a href="/items/${nameToSlug(next.name)}" rel="next" class="text-accent hover:underline">${escapeHtml(next.name)} →</a>` : '<span></span>'}
            </nav>`;

    return `
        <section id="item-details" class="mt-8 bg-main p-6 rounded-lg border border-custom">
            <h2 class="text-2xl font-bold section-title mb-3">About ${name}</h2>
            ${item.examine ? `<p class="text-secondary italic mb-4">“${escapeHtml(item.examine)}”</p>` : ''}
            <p class="mb-4">${summary}</p>
            <dl class="grid grid-cols-2 md:grid-cols-3 gap-4">${facts}
            </dl>${relatedList}${browse}
        </section>
`;
}

// Generate HTML template for item page
function generateItemHTML(item, latestPrice, volume, context) {
    const slug = nameToSlug(item.name);
    const pageUrl = `https://osrs.lol/items/${slug}`;
    const titleName = item.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    const iconUrl = `https://tiles.runescape.wiki/static/public/images/osrs/items/${item.id}.png`;

    let description = `${item.name} price on the OSRS Grand Exchange: live high and low prices, flipping margin after tax, buy limit${item.limit ? ` (${item.limit.toLocaleString('en-US')})` : ''} and high alch value.`;
    if (item.examine && (description + ' ' + item.examine).length <= 200) description += ` ${item.examine}`;

    // Use the dashboard from dev.html as our base template
    let html = dashboardTemplate;

    // 1. Item-specific title, meta description and canonical URL
    html = replaceOnce(html, /<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(titleName)} OSRS Price & Trends | Grand Exchange</title>`, '<title>');
    html = replaceOnce(html, /<meta name="description"[\s\S]*?>/, `<meta name="description" content="${escapeHtml(description)}">`, 'meta description');
    html = replaceOnce(html, '<link rel="canonical" href="https://osrs.lol/">', `<link rel="canonical" href="${pageUrl}">`, 'canonical link');

    // 2. Social cards (Open Graph & Twitter) for this item instead of the homepage's
    html = html.replace(/\s*<meta property="(og|twitter):[^"]+"[^>]*>/g, '').replace(/\s*<!-- Twitter -->/, '');
    const socialTags = `
    <meta property="og:type" content="website">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:title" content="${escapeHtml(titleName)} OSRS Price & Trends">
    <meta property="og:description" content="Track ${escapeHtml(titleName)} prices, volume, and market trends in Old School RuneScape.">
    <meta property="og:image" content="${iconUrl}">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary">
    <meta property="twitter:url" content="${pageUrl}">
    <meta property="twitter:title" content="${escapeHtml(titleName)} OSRS Price & Trends">
    <meta property="twitter:description" content="Track ${escapeHtml(titleName)} prices, volume, and market trends in Old School RuneScape.">
    <meta property="twitter:image" content="${iconUrl}">
`;
    html = replaceOnce(html, '<!-- Open Graph / Facebook -->', `<!-- Open Graph / Facebook -->${socialTags}`, 'Open Graph comment');

    // 3. Structured data (JSON-LD); the breadcrumb matches the visible one below
    const breadcrumbsSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://osrs.lol/" },
            { "@type": "ListItem", "position": 2, "name": "All Items", "item": "https://osrs.lol/all_items" },
            { "@type": "ListItem", "position": 3, "name": item.name, "item": pageUrl }
        ]
    };
    const webPageSchema = {
        "@context": "https://schema.org/",
        "@type": "WebPage",
        "name": `${titleName} OSRS Price & Trends`,
        "url": pageUrl,
        "description": description,
        "dateModified": context.today,
        "primaryImageOfPage": iconUrl,
        "isPartOf": {
            "@type": "WebSite",
            "name": "osrs.lol",
            "url": "https://osrs.lol/"
        },
        "about": {
            "@type": "VideoGame",
            "name": "Old School RuneScape"
        }
    };

    // Script to boot up the dashboard with this specific item already loaded
    const headScripts = `
    <script>
        window.PRELOAD_ITEM_NAME = ${inlineJSON(item.name)};
    </script>
    <script type="application/ld+json">${inlineJSON(breadcrumbsSchema)}</script>
    <script type="application/ld+json">${inlineJSON(webPageSchema)}</script>
    `;
    html = replaceOnce(html, '</head>', `${headScripts}</head>`, '</head>');

    // 4. One H1 per page: the item name. The site banner becomes a plain paragraph on item pages
    html = replaceOnce(html, /<h1 (class="text-4xl font-bold mb-2" style="font-family: 'Cinzel', serif;">)([\s\S]*?)<\/h1>/, (match, attrs, text) => `<p ${attrs}${text}</p>`, 'site banner <h1>');
    html = replaceOnce(html, '<h2 id="item-name-title" class="text-2xl font-bold text-primary"></h2>', `<h1 id="item-name-title" class="text-2xl font-bold text-primary">${escapeHtml(item.name)}</h1>`, 'item title');

    // 5. Visible breadcrumb under the header
    const breadcrumb = `<nav aria-label="Breadcrumb" class="text-sm text-secondary mb-4">
            <ol class="flex flex-wrap items-center gap-2">
                <li><a href="/" class="text-accent hover:underline">Home</a></li>
                <li aria-hidden="true">›</li>
                <li><a href="/all_items" class="text-accent hover:underline">All Items</a></li>
                <li aria-hidden="true">›</li>
                <li aria-current="page">${escapeHtml(item.name)}</li>
            </ol>
        </nav>`;
    html = replaceOnce(html, '<!-- item-page:breadcrumb -->', breadcrumb, 'breadcrumb marker');

    // 6. Render today's price snapshot into the dashboard panel (live data replaces it once loaded)
    const snapshot = renderPriceSnapshot(item, latestPrice, volume);
    html = replaceOnce(html, '<div id="results-container" class="grid grid-cols-1 lg:grid-cols-3 gap-6 hidden mt-8">', `<div id="results-container" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8" data-prerendered="${escapeHtml(item.name)}">`, 'results container');
    html = replaceOnce(html, '<img id="item-icon" src="" alt="Item Icon"', `<img id="item-icon" src="https://static.runelite.net/cache/item/icon/${item.id}.png" alt="${escapeHtml(item.name)}"`, 'item icon');
    html = replaceOnce(html, '<div id="price-info" class="space-y-3 text-lg"></div>', `<div id="price-info" class="space-y-3 text-lg">${snapshot.priceInfo}</div>`, 'price info');
    html = replaceOnce(html, '<div id="additional-info" class="space-y-3 text-base pt-3 border-t border-custom"></div>', `<div id="additional-info" class="space-y-3 text-base pt-3 border-t border-custom">${snapshot.additionalInfo}\n            </div>`, 'additional info');

    // 7. Visible item facts, related items and previous/next links below the dashboard
    const details = renderItemDetails(item, latestPrice, volume, context);
    html = replaceOnce(html, '<!-- item-page:details -->', details, 'details marker');

    return html;
}

// Page left at a renamed item's old URL. GitHub Pages can't send a 301, so it uses an instant
// meta refresh (which Google treats as a permanent redirect) plus a canonical to the new URL
function generateRedirectHTML(item) {
    const slug = nameToSlug(item.name);
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <!-- osrs-item-id: ${item.id} -->
    <title>${escapeHtml(item.name)} OSRS Price & Trends | Grand Exchange</title>
    <link rel="canonical" href="https://osrs.lol/items/${slug}">
    <meta http-equiv="refresh" content="0; url=/items/${slug}">
    <script>window.location.replace('/items/${slug}' + window.location.search);</script>
</head>
<body>
    <p>This item has been renamed. See <a href="/items/${slug}">${escapeHtml(item.name)}</a>.</p>
</body>
</html>
`;
}

// Main build function
async function build() {
    console.log('🏗️ Starting OSRS item page generation...');
    
    try {
        // Fetch item mapping
        console.log('📥 Fetching item data from RuneScape Wiki API...');
        const mapping = await fetchJSON('https://prices.runescape.wiki/api/v1/osrs/mapping');
        console.log(`✅ Found ${mapping.length} items`);
        // Stale pages are deleted below, so never build from an empty or partial mapping
        if (!Array.isArray(mapping) || mapping.length < 1000) {
            throw new Error(`Item mapping looks incomplete (${Array.isArray(mapping) ? mapping.length : typeof mapping} items)`);
        }

        // Fetch latest prices
        console.log('💰 Fetching latest prices...');
        const latestResponse = await fetchJSON('https://prices.runescape.wiki/api/v1/osrs/latest');
        const latest = latestResponse.data;

        // Fetch volumes
        console.log('📊 Fetching trading volumes...');
        const volumesResponse = await fetchJSON('https://prices.runescape.wiki/api/v1/osrs/volumes');
        const volumes = volumesResponse.data;

        const now = new Date();
        const context = {
            today: now.toISOString().split('T')[0],
            snapshotTime: now.toISOString().replace('T', ' ').slice(0, 16),
            natureRunePrice: latest[561] ? latest[561].high : 0,
            index: buildItemIndex(mapping)
        };

        // Generate pages in batches
        let processed = 0;
        const errors = [];
        
        for (let i = 0; i < mapping.length; i += BATCH_SIZE) {
            const batch = mapping.slice(i, i + BATCH_SIZE);
            
            for (const item of batch) {
                try {
                    const itemLatest = latest[item.id] || { high: 0, low: 0 };
                    const itemVolume = volumes[item.id] || 0;
                    
                    // Generate page for all items (will show placeholder if no price data)
                    const html = generateItemHTML(item, itemLatest, itemVolume, context);
                    const slug = nameToSlug(item.name);
                    const filePath = path.join(OUTPUT_DIR, `${slug}.html`);
                    
                    fs.writeFileSync(filePath, html, 'utf8');
                    processed++;
                    
                    if (processed % 100 === 0) {
                        console.log(`⏳ Processed ${processed} items...`);
                    }
                } catch (err) {
                    errors.push(`${item.name}: ${err.message}`);
                }
            }
            
            // Rate limiting
            if (i + BATCH_SIZE < mapping.length) {
                await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
            }
        }

        console.log(`\n✨ Successfully generated ${processed} item pages in /items/`);

        // Pages left over from renamed items redirect to the new name; pages for items removed
        // from the GE are deleted so they return 404 instead of a dashboard that can't find its item
        const expectedFiles = new Set(mapping.map(item => `${nameToSlug(item.name)}.html`));
        const itemsById = new Map(mapping.map(item => [item.id, item]));
        const staleFiles = fs.readdirSync(OUTPUT_DIR).filter(file => file.endsWith('.html') && !expectedFiles.has(file));
        for (const file of staleFiles) {
            const filePath = path.join(OUTPUT_DIR, file);
            const oldHtml = fs.readFileSync(filePath, 'utf8');
            const idMatch = oldHtml.match(/osrs-item-id: (\d+)|\/osrs\/items\/(\d+)\.png/);
            const renamedTo = idMatch && itemsById.get(Number(idMatch[1] || idMatch[2]));
            if (renamedTo) {
                const redirectHtml = generateRedirectHTML(renamedTo);
                if (redirectHtml !== oldHtml) {
                    fs.writeFileSync(filePath, redirectHtml, 'utf8');
                    console.log(`↪️ ${file} now redirects to /items/${nameToSlug(renamedTo.name)}`);
                }
            } else {
                fs.unlinkSync(filePath);
                console.log(`🧹 Removed ${file} (item no longer on the GE)`);
            }
        }
        
        if (errors.length > 0) {
            console.warn(`⚠️ Encountered ${errors.length} errors:`);
            errors.slice(0, 10).forEach(err => console.warn(`  - ${err}`));
            if (errors.length > 10) console.warn(`  ... and ${errors.length - 10} more`);
        }

        // Generate all_items.html
        console.log('📑 Generating all_items.html directory...');
        generateAllItemsPage(mapping);

        // Generate updated sitemap
        console.log('🗺️ Generating sitemap...');
        generateSitemap(mapping);
        
        console.log('✅ Build complete!');
    } catch (err) {
        console.error('❌ Build failed:', err.message);
        process.exit(1);
    }
}

// Generate sitemap with all item pages (now including images and core pages)
function generateSitemap(items) {
    const baseUrl = 'https://osrs.lol';
    const today = new Date().toISOString().split('T')[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    <!-- Core Pages -->
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${today}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/all_items</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>${baseUrl}/merchanting</loc>
        <lastmod>${today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/acknowledgements</loc>
        <lastmod>${today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.5</priority>
    </url>
`;

    for (const item of items) {
        const slug = nameToSlug(item.name);
        const iconUrl = `https://tiles.runescape.wiki/static/public/images/osrs/items/${item.id}.png`;

        sitemap += `    <url>
        <loc>${baseUrl}/items/${slug}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
        <image:image>
            <image:loc>${iconUrl}</image:loc>
            <image:title>${item.name.replace(/&/g, '&amp;')} OSRS Price &amp; Trends</image:title>
        </image:image>
    </url>\n`;
    }

    sitemap += `</urlset>`;
    fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap, 'utf8');

    if (fs.existsSync(path.join(__dirname, 'removed_sitemap_entries.txt'))) {
        fs.unlinkSync(path.join(__dirname, 'removed_sitemap_entries.txt'));
    }
}

// Automatically regenerate the all_items.html directory
function generateAllItemsPage(items) {
    const itemsList = items
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(item => `                <li><a href="/items/${nameToSlug(item.name)}" class="hover:text-accent no-underline">${escapeHtml(item.name)}</a></li>`)
        .join('\n');

    const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>All OSRS Grand Exchange Items - osrs.lol</title>
    <meta name="description" content="A comprehensive list of all Old School RuneScape Grand Exchange items with links to their live price analysis.">
    <link rel="canonical" href="https://osrs.lol/all_items">
    <link rel="icon" type="image/png" href="https://oldschool.runescape.wiki/images/Coins_10000.png">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            background-color: #211e1c;
            color: #e5e0db;
            font-family: 'Inter', sans-serif;
        }
        .container {
            max-width: 960px;
            margin: 0 auto;
            padding: 2rem;
        }
        .text-accent { color: #e7bc1c; }
        .bg-main { background-color: #3a3532; }
        .border-custom { border-color: #504a45; }
        .no-underline { text-decoration: none; }
    </style>
</head>
<body>
    <div class="container mx-auto max-w-6xl p-4 md:p-8">
        <header class="text-center mb-8">
            <h1 class="text-4xl font-bold mb-2 text-accent">All OSRS Grand Exchange Items</h1>
            <p class="text-lg text-secondary">Browse all items for price analysis and flipping opportunities.</p>
            <nav class="mt-4">
                <a href="/" class="text-accent hover:opacity-80 no-underline">← Back to Main Tool</a>
            </nav>
        </header>

        <main class="bg-main border border-custom rounded-lg p-6 mb-6">
            <h2 class="text-2xl font-bold text-accent mb-4">Item Directory</h2>
            <ul class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-secondary">
${itemsList}
            </ul>
        </main>

        <footer class="text-center text-secondary text-sm mt-12 py-6 border-t border-custom">
            <p>Data provided by <a href="https://prices.runescape.wiki/" class="text-accent hover:underline">RuneScape Wiki</a></p>
            <p class="mt-2">© ${new Date().getFullYear()} osrs.lol</p>
        </footer>
    </div>
</body>
</html>`;

    fs.writeFileSync(path.join(__dirname, 'all_items.html'), html, 'utf8');
}


// Run build
build();
