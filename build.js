#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const minify = require('html-minifier').minify;

// Configuration
const SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_DIR = path.join(__dirname, 'items');
const API_HEADERS = { 'User-Agent': 'osrs.lol bot' };
const BATCH_SIZE = 50;
const RATE_LIMIT_MS = 100;

// Minification Options
const MINIFY_OPTIONS = {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    minifyJS: true,
    minifyCSS: true
};

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read the dashboard template from src/
const dashboardTemplatePath = path.join(SRC_DIR, 'dev.html');
const dashboardTemplate = fs.readFileSync(dashboardTemplatePath, 'utf8');

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

// Convert item name to URL slug
function nameToSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/\+/g, '-plus')
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Generate HTML template for item page
function generateItemHTML(item, latestPrice, volume) {
    const slug = nameToSlug(item.name);
    
    // SEO Content for bots
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

    // Script to boot up the dashboard
    const preloadScript = `
    <script>
        window.PRELOAD_ITEM_NAME = "${item.name.replace(/"/g, '\\"')}";
    </script>
    `;

    let html = dashboardTemplate;

    // 1. Inject Item-Specific Title, Meta Description, and Canonical URL
    const titleName = item.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${titleName} OSRS Price & Trends | Grand Exchange</title>`);
    html = html.replace(/<meta name="description"[\s\S]*?>/, `<meta name="description" content="Live ${titleName} price data, market trends, and flipping analysis for OSRS. Professional trading insights for Old School RuneScape.">\n    <meta name="osrs-item-id" content="${item.id}">`);
    html = html.replace(/<link rel="canonical" href="https:\/\/osrs\.lol\/">/, `<link rel="canonical" href="https://osrs.lol/items/${slug}">`);

    // 2. Inject Social Cards
    const iconUrl = `https://tiles.runescape.wiki/static/public/images/osrs/items/${item.id}.png`;
    const socialTags = `
    <meta property="og:url" content="https://osrs.lol/items/${slug}">
    <meta property="og:title" content="${titleName} OSRS Price & Trends">
    <meta property="og:description" content="Track ${titleName} prices, volume, and market trends in Old School RuneScape.">
    <meta property="og:image" content="${iconUrl}">
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
        "isPartOf": { "@type": "WebSite", "name": "osrs.lol", "url": "https://osrs.lol/" },
        "about": { "@type": "VideoGame", "name": "Old School RuneScape" }
    };
    const structuredData = `
    <script type="application/ld+json">${JSON.stringify(breadcrumbsSchema)}</script>
    <script type="application/ld+json">${JSON.stringify(webPageSchema)}</script>
    `;
    
    html = html.replace('<!-- Open Graph / Facebook -->', `${socialTags}<!-- Open Graph / Facebook -->`);

    // Cleanup generic home tags
    html = html.replace(/<meta property="og:title"[\s\S]*?>/, '');
    html = html.replace(/<meta property="og:description"[\s\S]*?>/, '');
    html = html.replace(/<meta property="og:url"[\s\S]*?>/, '');
    html = html.replace(/<meta property="twitter:title"[\s\S]*?>/, '');
    html = html.replace(/<meta property="twitter:description"[\s\S]*?>/, '');
    html = html.replace(/<meta property="twitter:url"[\s\S]*?>/, '');

    html = html.replace('</head>', `${preloadScript}${structuredData}</head>`);
    html = html.replace(/<body([\s\S]*?)[>]/, `<body$1>${seoContent}`);

    // MINIFY
    return minify(html, MINIFY_OPTIONS);
}

// Generate all_items.html
function generateAllItemsPage(items) {
    const itemsList = items
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(item => `<li><a href="items/${nameToSlug(item.name)}" class="hover:text-accent no-underline">${item.name.toLowerCase()}</a></li>`)
        .join('');

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
    <style>body{background-color:#211e1c;color:#e5e0db;font-family:'Inter',sans-serif}.container{max-width:960px;margin:0 auto;padding:2rem}.text-accent{color:#e7bc1c}.bg-main{background-color:#3a3532}.border-custom{border-color:#504a45}.no-underline{text-decoration:none}</style>
</head>
<body>
    <div class="container mx-auto max-w-6xl p-4 md:p-8">
        <header class="text-center mb-8">
            <h1 class="text-4xl font-bold mb-2 text-accent">All OSRS Grand Exchange Items</h1>
            <nav class="mt-4"><a href="/" class="text-accent hover:opacity-80 no-underline">← Back to Main Tool</a></nav>
        </header>
        <main class="bg-main border border-custom rounded-lg p-6 mb-6">
            <ul class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-secondary">${itemsList}</ul>
        </main>
        <footer class="text-center text-secondary text-sm mt-12 py-6 border-t border-custom">
            <p>© ${new Date().getFullYear()} osrs.lol</p>
        </footer>
    </div>
</body>
</html>`;

    fs.writeFileSync(path.join(__dirname, 'all_items.html'), minify(html, MINIFY_OPTIONS), 'utf8');
}

// Generate sitemap
function generateSitemap(items) {
    const baseUrl = 'https://osrs.lol';
    const today = new Date().toISOString().split('T')[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    <url><loc>${baseUrl}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
    <url><loc>${baseUrl}/all_items</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
    <url><loc>${baseUrl}/merchanting</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
    <url><loc>${baseUrl}/acknowledgements</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>`;

    for (const item of items) {
        const slug = nameToSlug(item.name);
        const iconUrl = `https://tiles.runescape.wiki/static/public/images/osrs/items/${item.id}.png`;
        sitemap += `<url><loc>${baseUrl}/items/${slug}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.8</priority><image:image><image:loc>${iconUrl}</image:loc><image:title>${item.name.replace(/&/g, '&amp;')} OSRS Price</image:title></image:image></url>`;
    }

    sitemap += `</urlset>`;
    fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap, 'utf8');
}

// Minify static pages from src/ to root
function buildStaticPages() {
    console.log('📄 Minifying static pages...');
    const staticFiles = ['index.html', '404.html', 'acknowledgements.html', 'merchanting.html'];
    
    staticFiles.forEach(file => {
        const srcPath = path.join(SRC_DIR, file);
        if (fs.existsSync(srcPath)) {
            const content = fs.readFileSync(srcPath, 'utf8');
            const minified = minify(content, MINIFY_OPTIONS);
            fs.writeFileSync(path.join(__dirname, file), minified, 'utf8');
            console.log(`  - ${file} minified`);
        }
    });

    // Minify suggest.js
    const suggestSrc = path.join(SRC_DIR, 'suggest.js');
    if (fs.existsSync(suggestSrc)) {
        const content = fs.readFileSync(suggestSrc, 'utf8');
        // We use minify's JS minification by wrapping it in a dummy script tag then stripping it
        // Or better, just use a dedicated minifier if needed, but for now we'll use a simple approach
        const minified = minify(`<script>${content}</script>`, MINIFY_OPTIONS)
                          .replace('<script>', '')
                          .replace('</script>', '');
        fs.writeFileSync(path.join(__dirname, 'suggest.js'), minified, 'utf8');
        console.log('  - suggest.js minified');
    }
}

async function build() {
    console.log('🏗️ Starting OSRS build process...');
    
    try {
        // Build static pages first
        buildStaticPages();

        console.log('📥 Fetching item data...');
        const mapping = await fetchJSON('https://prices.runescape.wiki/api/v1/osrs/mapping');
        const latestResponse = await fetchJSON('https://prices.runescape.wiki/api/v1/osrs/latest');
        const volumesResponse = await fetchJSON('https://prices.runescape.wiki/api/v1/osrs/volumes');
        
        const latest = latestResponse.data;
        const volumes = volumesResponse.data;

        let processed = 0;
        for (let i = 0; i < mapping.length; i += BATCH_SIZE) {
            const batch = mapping.slice(i, i + BATCH_SIZE);
            for (const item of batch) {
                try {
                    const itemLatest = latest[item.id] || { high: 0, low: 0 };
                    const itemVolume = volumes[item.id] || 0;
                    const html = generateItemHTML(item, itemLatest, itemVolume);
                    fs.writeFileSync(path.join(OUTPUT_DIR, `${nameToSlug(item.name)}.html`), html, 'utf8');
                    processed++;
                } catch (err) {}
            }
            if (i % 200 === 0) console.log(`⏳ Processed ${processed} items...`);
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
        }

        console.log(`✨ Generated ${processed} item pages`);
        generateAllItemsPage(mapping);
        generateSitemap(mapping);
        console.log('✅ Build complete!');
    } catch (err) {
        console.error('❌ Build failed:', err.message);
        process.exit(1);
    }
}

build();

