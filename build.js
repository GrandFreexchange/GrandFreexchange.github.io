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

// Generate HTML template for item page
function generateItemHTML(item, latestPrice, volume) {
    const slug = nameToSlug(item.name);
    const formattedPrice = (latestPrice && latestPrice.high) ? latestPrice.high.toLocaleString() : 'N/A';
    const formattedLow = (latestPrice && latestPrice.low) ? latestPrice.low.toLocaleString() : 'N/A';
    
    // SEO Content for bots (hidden from humans initially)
    const seoContent = `
        <div id="seo-content" style="display:none;" aria-hidden="true">
            <h1>${item.name} OSRS Price & Trends</h1>
            <p>Real-time market data and historical trends for ${item.name} in Old School RuneScape. Daily Volume: ${volume.toLocaleString()}.</p>
            <div>
                <h2>Flipping Analysis for ${item.name}</h2>
                <p>Track ${item.name} price movements, profit margins, and trading volume. Use our professional flipping tool to find optimal buy and sell points for ${item.name}.</p>
            </div>
        </div>
    `;

    // Script to boot up the dashboard with this specific item already loaded
    const preloadScript = `
    <script>
        window.PRELOAD_ITEM_NAME = "${item.name.replace(/"/g, '\\"')}";
    </script>
    `;

    // Use the dashboard from dev.html as our base template
    let html = dashboardTemplate;

    // 1. Inject Item-Specific Title, Meta Description, and Canonical URL
    const titleName = item.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${titleName} OSRS Price & Trends | Grand Exchange</title>`);
    html = html.replace(/<meta name="description"[\s\S]*?>/, `<meta name="description" content="Live ${titleName} price data, market trends, and flipping analysis for OSRS. Professional trading insights for Old School RuneScape.">\n    <meta name="osrs-item-id" content="${item.id}">`);
    html = html.replace(/<link rel="canonical" href="https:\/\/osrs\.lol\/">/, `<link rel="canonical" href="https://osrs.lol/items/${slug}">`);

    // 2. Inject Social Cards (Open Graph & Twitter)
    const iconUrl = `https://tiles.runescape.wiki/static/public/images/osrs/items/${item.id}.png`;
    const socialTags = `
    <!-- Open Graph / Facebook -->
    <meta property="og:url" content="https://osrs.lol/items/${slug}">
    <meta property="og:title" content="${titleName} OSRS Price & Trends">
    <meta property="og:description" content="Track ${titleName} prices, volume, and market trends in Old School RuneScape.">
    <meta property="og:image" content="${iconUrl}">

    <!-- Twitter -->
    <meta property="twitter:url" content="https://osrs.lol/items/${slug}">
    <meta property="twitter:title" content="${titleName} OSRS Price & Trends">
    <meta property="twitter:description" content="Track ${titleName} prices, volume, and market trends in Old School RuneScape.">
    <meta property="twitter:image" content="${iconUrl}">
    `;


    // 3. Inject Structured Data (JSON-LD)
    const breadcrumbsSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://osrs.lol/" },
            { "@type": "ListItem", "position": 2, "name": "Items", "item": "https://osrs.lol/items/" },
            { "@type": "ListItem", "position": 3, "name": titleName, "item": `https://osrs.lol/items/${slug}` }
        ]
    };
    const webPageSchema = {
        "@context": "https://schema.org/",
        "@type": "WebPage",
        "identifier": String(item.id),
        "name": `${titleName} OSRS Price & Trends`,
        "url": `https://osrs.lol/items/${slug}`,
        "description": `Real-time market data and flipping analysis for ${titleName} in Old School RuneScape.`,
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
    const structuredData = `
    <script type="application/ld+json">${JSON.stringify(breadcrumbsSchema)}</script>
    <script type="application/ld+json">${JSON.stringify(webPageSchema)}</script>
    `;
    
    // Apply Meta & Schema injections
    html = html.replace('<!-- Open Graph / Facebook -->', `${socialTags}<!-- Open Graph / Facebook -->`);

    html = html.replace(/<meta property="og:title"[\s\S]*?>/, ''); // Remove generic home title
    html = html.replace(/<meta property="og:description"[\s\S]*?>/, ''); // Remove generic home desc
    html = html.replace(/<meta property="og:url"[\s\S]*?>/, ''); // Remove generic home url
    html = html.replace(/<meta property="twitter:title"[\s\S]*?>/, '');
    html = html.replace(/<meta property="twitter:description"[\s\S]*?>/, '');
    html = html.replace(/<meta property="twitter:url"[\s\S]*?>/, '');

    // 4. Inject Preload Variable and Schema into the head
    html = html.replace('</head>', `${preloadScript}${structuredData}</head>`);

    // 5. Inject Hidden Static Content into the body for SEO crawlers
    html = html.replace(/<body([\s\S]*?)[>]/, `<body$1>${seoContent}`);

    return html;
}

// Main build function
async function build() {
    console.log('🏗️ Starting OSRS item page generation...');
    
    try {
        // Fetch item mapping
        console.log('📥 Fetching item data from RuneScape Wiki API...');
        const mapping = await fetchJSON('https://prices.runescape.wiki/api/v1/osrs/mapping');
        console.log(`✅ Found ${mapping.length} items`);

        // Fetch latest prices
        console.log('💰 Fetching latest prices...');
        const latestResponse = await fetchJSON('https://prices.runescape.wiki/api/v1/osrs/latest');
        const latest = latestResponse.data;

        // Fetch volumes
        console.log('📊 Fetching trading volumes...');
        const volumesResponse = await fetchJSON('https://prices.runescape.wiki/api/v1/osrs/volumes');
        const volumes = volumesResponse.data;

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
                    const html = generateItemHTML(item, itemLatest, itemVolume);
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
        .map(item => `                <li><a href="items/${nameToSlug(item.name)}" class="hover:text-accent no-underline">${item.name.toLowerCase()}</a></li>`)
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
