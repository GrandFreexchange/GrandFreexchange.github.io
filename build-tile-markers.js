#!/usr/bin/env node
/* Builds the tile markers section: /tile-markers/ (searchable list of packs, how to import, a
   preview for your own markers) and one page per pack at /tile-markers/<slug>.
   Run by hand after changing a pack or the header/footer: `node build-tile-markers.js`.

   Marker data lives in data/tile-markers/*.json. The packs come from the community RuneMarkers
   collection (github.com/jamiegyoung/runemarkers, MIT licence, see data/tile-markers/LICENSE);
   each pack's original source is credited on its page. Descriptions and categories are ours. */

const fs = require('fs');
const path = require('path');
const Tiles = require('./assets/tiles.js');

const TILES_ASSET_VERSION = 1;
const SITE = 'https://osrs.lol';
const OUT_DIR = path.join(__dirname, 'tile-markers');
const DATA_DIR = path.join(__dirname, 'data', 'tile-markers');
const dashboardTemplate = fs.readFileSync(path.join(__dirname, 'dev.html'), 'utf8');

const CATEGORIES = [
    { id: 'raids', label: 'Raids' },
    { id: 'bosses', label: 'Bosses' },
    { id: 'slayer', label: 'Slayer' },
    { id: 'skilling', label: 'Skilling' },
    { id: 'minigames', label: 'Minigames' },
    { id: 'training', label: 'Combat training' }
];

// Our own write-up for each pack: [category, what the tiles are for]
const PACKS = {
    'abyssal-sire': ['slayer', 'Marks where to stand through each phase of the Abyssal Sire fight, so you can step out of the miasma pools and keep out of reach of the respiratory spawns.'],
    'akkha-butterfly-tech': ['raids', 'The butterfly method for Akkha in the Path of Het: a fixed loop of tiles that keeps you out of the memory blasts while you keep attacking.'],
    'alchemical-hydra': ['slayer', 'Highlights the four vents and the tiles to fight from in the Alchemical Hydra room, so you can lure it over the right vent each phase.'],
    'ammonite-crabs': ['training', 'AFK spots at the Ammonite Crabs on Fossil Island, labelled with how many crabs each tile reaches.'],
    'baba': ['raids', 'Positions for Ba-Ba in the Path of Apmeken, with the danger tiles for her slam and the boulder lanes marked in red.'],
    'barbarian-assault': ['minigames', 'Barbarian Assault defender and healer tiles: where to lay food and traps, and which spots are good or bad to stand on.'],
    'barrows-dig-tiles': ['minigames', 'The six dig spots on top of the Barrows mounds, one patch per brother, so you never miss the mound with your spade.'],
    'commander-zilyana-energy-efficient': ['bosses', 'A colour-coded Saradomin route for Commander Zilyana that saves run energy. Each colour is a step of the walk around her.'],
    'commander-zilyana': ['bosses', 'A small set of tiles for walking around Commander Zilyana in the Saradomin room while you attack with ranged.'],
    'crab-puzzle': ['raids', 'The crystal crab puzzle room in the Chambers of Xeric, with the anchor tile and where each coloured crab needs to go.'],
    'demonic-brutus': ['bosses', 'Numbered tiles for the hard mode cow boss, Demonic Brutus, showing the order to move around the arena.'],
    'doom-double-park': ['bosses', 'The double park method for the Doom of Mokhaiotl in the Delve: labelled tiles for lures, waits and where to stand on deeper levels.'],
    'doom-sidewalk': ['bosses', 'The sidewalk method for the Doom of Mokhaiotl: a numbered walking line for consistent deep delves.'],
    'drift-net-fishing': ['skilling', 'Marks the net spots at the drift net fishing area under Fossil Island so you can herd fish into the nets quickly.'],
    'duke-sucellus': ['bosses', 'Safe tiles in the Duke Sucellus arena from Desert Treasure II, for dodging his gaze and the falling debris.'],
    'galvek': ['bosses', 'Tiles for the Galvek fight at the end of Dragon Slayer II, marking safe ground through the fire and tsunami phases.'],
    'gem-mining-3-tick': ['skilling', 'A numbered route for 3-tick mining at the gem rocks, with where to go back and where to step out.'],
    'general-graardor-5-0': ['bosses', 'The 5:0 Bandos method: green, orange and red tiles for where you stand, walk and stop while General Graardor follows you.'],
    'general-graardor-6-0': ['bosses', 'The 6:0 ranged method for General Graardor, starting from the labelled tile and walking the loop.'],
    'general-graardor-7-0-bowfa': ['bosses', 'The 7:0 Bow of Faerdhinen method for Bandos, with numbered steps plus the cannon and item spots.'],
    'general-graardor-9-0-bowfa': ['bosses', 'The 9:0 Bow of Faerdhinen solo Bandos method, a longer numbered walk that kills faster.'],
    'grotesque-guardians': ['slayer', 'Three numbered spots on the roof for the Grotesque Guardians, for lining up Dusk and Dawn.'],
    'hallowed-sepulchre': ['skilling', 'Hallowed Sepulchre agility: the safe tiles across every floor, so you can see the gaps in the arrows, swords and flames.'],
    'inferno': ['bosses', 'Standard Inferno pillar tiles, with the unsafe spots labelled, for the wave stack and safe positions near the pillars.'],
    'kril-tsutsaroth-6-0': ['bosses', 'The 6:0 Zamorak method for K\'ril Tsutsaroth in the God Wars Dungeon.'],
    'maggot-king': ['bosses', 'An outline of the Maggot King arena border, so you can see the edge of the fight area at a glance.'],
    'moons-of-peril': ['bosses', 'Labelled spots across all three Moons of Peril rooms: the safe tile, the orb, clones and each moon\'s special attacks.'],
    'nylocas-vasilias': ['raids', 'The stand tiles for the Nylocas room in the Theatre of Blood.'],
    'olm': ['raids', 'Positions for the Great Olm in the Chambers of Xeric, for the head, the hands and the crystal phases.'],
    'pestilent-bloat': ['raids', 'Tiles around Pestilent Bloat\'s walk in the Theatre of Blood, so you can see where he will be.'],
    'phantom-muspah': ['bosses', 'The single safespot tile used in the darkness phase of the Phantom Muspah.'],
    'sand-crabs': ['training', 'AFK spots at the Sand Crabs on Hosidius beach and Crabclaw Isle, labelled with how many crabs each tile hits.'],
    'sarachnis': ['bosses', 'Four tiles around Sarachnis to step between when she charges her web attacks.'],
    'sotetseg': ['raids', 'Sotetseg\'s room in the Theatre of Blood, marking the floor tiles for the maze and his ball phases.'],
    'stealing-artefacts': ['skilling', 'Stealing Artefacts in Port Piscarilius: the house routes and the safe tiles to wait on while the guards pass.'],
    'the-leviathan': ['bosses', 'The Leviathan from Desert Treasure II: labelled boulder and lightning tiles to move between.'],
    'the-maiden-of-sugadinti': ['raids', 'The stand tiles and freeze spots for the Maiden of Sugadinti in the Theatre of Blood.'],
    'the-whisperer': ['bosses', 'The Whisperer\'s final phase walk from Desert Treasure II, laid out tile by tile in both the real and shadow realms.'],
    'theatre-of-blood-all-rooms': ['raids', 'Every Theatre of Blood room in one import: Maiden, Bloat, Nylocas, Sotetseg, Xarpus and Verzik.'],
    'tithe-farm-20x5': ['skilling', 'A 20 by 5 layout for the Tithe Farm, starting from the labelled tile, for planting and watering in a set order.'],
    'tithe-farm-25x4': ['skilling', 'A 25 by 4 Tithe Farm layout for a quick, even planting route at high Farming levels.'],
    'tumekens-warden-advanced-tactics': ['raids', 'Advanced tactics for Tumeken\'s Warden at the end of the Tombs of Amascut, marking where to stand in phase 3.'],
    'vanguards': ['raids', 'Challenge mode safespots for the Vanguards in the Chambers of Xeric, with notes on which tile to stand on for each spawn.'],
    'vardorvis': ['bosses', 'Tiles for Vardorvis from Desert Treasure II, for moving out of the axes and keeping close.'],
    'verzik-vitur': ['raids', 'Verzik Vitur\'s room at the end of the Theatre of Blood, marking the pillars and stand spots.'],
    'volcanic-mine': ['minigames', 'Volcanic Mine: the A and B chambers and vents, and numbered rock spots, so a team knows where to go.'],
    'vorkath': ['bosses', 'A walking line for Vorkath\'s acid phase, the woox walk, so you can keep attacking while you dodge the pools.'],
    'werewolf-skullball': ['skilling', 'The Werewolf Skullball agility course, step by step: every kick, tap and shot with its direction.'],
    'xarpus': ['raids', 'Xarpus in the Theatre of Blood, with the room\'s stand tiles for the exhume and screech phases.'],
    'yama-godfly-duo-partner': ['bosses', 'The godfly method for the duo partner at Yama, with numbered tiles for the two stands.'],
    'yama-godfly': ['bosses', 'The godfly method for Yama\'s melee phase 3, with numbered stand tiles.'],
    'yama-simple-waves': ['bosses', 'Two labelled tiles for handling Yama\'s waves the simple way.'],
    'yama-simplefly': ['bosses', 'The simplefly method for Yama, a simpler godfly-style route for phase 3.'],
    'zebak-challenge-room': ['raids', 'The Path of Crondis challenge room before Zebak, marking the route for carrying water to the palm.'],
    'zulrah': ['bosses', 'The standing spots on Zulrah\'s shrine for each of its rotations.']
};

// ---------- Helpers ----------

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function inlineJSON(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}

function templatePart(pattern, label) {
    const match = dashboardTemplate.match(pattern);
    if (!match) throw new Error(`dev.html is missing ${label}`);
    return match[0];
}

const siteHead = templatePart(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">[\s\S]*?<script src="\/assets\/theme\.js"><\/script>/, 'shared <head> assets');
const tailwindLink = templatePart(/<link rel="stylesheet" href="\/assets\/tailwind\.css\?v=\d+">/, 'tailwind.css link');
const siteHeader = templatePart(/<header class="site-header">[\s\S]*?<\/header>/, 'site header')
    .replace(/<h1 class="site-title">(.*?)<\/h1>/, '<p class="site-title">$1</p>');
const siteFooter = templatePart(/<footer class="site-footer">[\s\S]*?<\/footer>/, 'site footer');

function youtubeId(url) {
    const m = url && url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : null;
}

// ---------- Load packs ----------

const packs = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).sort().map(file => {
    const slug = file.replace(/\.json$/, '');
    const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
    const meta = PACKS[slug];
    if (!meta) throw new Error(`No description for tile pack ${slug} in build-tile-markers.js`);
    const tiles = raw.tiles.map(Tiles.cleanTile);
    if (tiles.some(t => !t)) throw new Error(`${file} has a marker that isn't valid`);
    const name = raw.name.replace(/\s*\(([^)]*)\)$/, '');
    const variant = raw.subcategory || (raw.name.match(/\(([^)]*)\)$/) || [])[1] || null;
    const title = variant ? `${name} (${variant})` : name;
    const areas = Tiles.areas(tiles);
    return {
        slug, name, variant, title, tiles, areas,
        category: meta[0],
        description: meta[1],
        altName: raw.altName || null,
        tags: raw.tags || [],
        wiki: raw.wiki || null,
        source: raw.source && raw.source.name ? raw.source : null,
        video: raw.recommendedGuideVideoId || youtubeId(raw.source && raw.source.link),
        labels: tiles.filter(t => t.label).length,
        floors: [...new Set(tiles.map(t => t.z))].sort()
    };
});

// ---------- Page shell ----------

function page({ title, description, canonical, breadcrumb, body, schema = [], data = null }) {
    const crumbs = [{ name: 'Home', url: `${SITE}/` }, ...breadcrumb];
    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url }))
    };
    const crumbHtml = crumbs.map((c, i) => i === crumbs.length - 1
        ? `<li aria-current="page">${escapeHtml(c.name)}</li>`
        : `<li><a href="${c.url.replace(SITE, '')}" class="text-accent hover:underline">${escapeHtml(c.name)}</a></li>\n                <li aria-hidden="true">›</li>`
    ).join('\n                ');

    return `<!DOCTYPE html>
<html lang="en" data-theme="dark">

<head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-JK70X6NNKM"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'G-JK70X6NNKM');
    </script>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:type" content="website">
    <link rel="icon" type="image/png" href="https://oldschool.runescape.wiki/images/Coins_10000.png">
    ${siteHead}
    <link rel="stylesheet" href="/assets/tiles.css?v=${TILES_ASSET_VERSION}">
    ${tailwindLink}
    <script type="application/ld+json">${inlineJSON(breadcrumbSchema)}</script>${schema.map(s => `
    <script type="application/ld+json">${inlineJSON(s)}</script>`).join('')}
</head>

<body>

    <div class="container mx-auto max-w-4xl p-4 md:p-8">

        ${siteHeader}

        <nav aria-label="Breadcrumb" class="text-sm text-secondary mt-5 mb-4">
            <ol class="flex flex-wrap items-center gap-2">
                ${crumbHtml}
            </ol>
        </nav>
${body}
        ${siteFooter}
    </div>${data ? `
    <script type="application/json" id="pack-data">${inlineJSON(data)}</script>` : ''}
    <script src="/assets/tiles.js?v=${TILES_ASSET_VERSION}"></script>
</body>

</html>
`;
}

const IMPORT_STEPS = `
                <ol class="tile-steps">
                    <li>In RuneLite, open the plugin list and make sure <strong>Ground Markers</strong> is on.</li>
                    <li>Copy a tile pack with its <strong>Copy</strong> button.</li>
                    <li>In game, right-click the <strong>world map orb</strong> next to the minimap and choose <strong>Import Ground Markers</strong>.</li>
                    <li>Say <strong>Yes</strong> when it asks to import the markers. They appear as soon as you are in that area.</li>
                </ol>
                <p class="text-secondary text-sm mt-3">No Import option on the orb? In the Ground Markers settings, turn on <em>Show import/export/clear options</em>. Importing adds to the markers you already have. <em>Clear</em> on the same menu removes the markers in the area you are standing in.</p>`;

const categoryLabel = id => CATEGORIES.find(c => c.id === id).label;

// ---------- Pack page ----------

function packPage(pack) {
    const canonical = `${SITE}/tile-markers/${pack.slug}`;
    const first = pack.areas[0];
    const svg = Tiles.areaSvg(first, { width: 640, title: `${pack.title} tile markers` });
    const areaNote = pack.areas.length > 1
        ? `${pack.areas.length} areas${pack.floors.length > 1 ? ` over ${pack.floors.length} floors` : ''}`
        : 'one area';
    const related = packs.filter(p => p.category === pack.category && p.slug !== pack.slug)
        .sort((a, b) => (b.name === pack.name) - (a.name === pack.name) || a.title.localeCompare(b.title))
        .slice(0, 8);
    const sourceLink = pack.source && pack.source.link
        ? `<a href="${escapeHtml(pack.source.link)}" class="link" rel="nofollow noopener" target="_blank">${escapeHtml(pack.source.name)}</a>`
        : pack.source ? escapeHtml(pack.source.name) : null;
    const pageTitle = `${pack.title} Tile Markers - RuneLite Ground Markers | osrs.lol`;
    let description = `${pack.title} tile markers for RuneLite: ${pack.tiles.length} ground marker tiles to copy and import. See the layout, change the colour or download the JSON.`;
    if (description.length > 160) description = `${pack.title} tile markers for RuneLite: ${pack.tiles.length} tiles to copy and import, with a map of the layout.`;

    const body = `
        <main data-pack>
            <div class="mb-6">
                <h1 class="page-title">${escapeHtml(pack.title)} tile markers</h1>
                <p class="page-lead">${escapeHtml(pack.description)}</p>
                <p class="tile-facts">
                    <span><strong>${pack.tiles.length}</strong> tile${pack.tiles.length === 1 ? '' : 's'}</span>
                    <span>${areaNote}</span>
                    ${pack.labels ? `<span>${pack.labels} labelled</span>` : ''}
                    <span><a href="/tile-markers/?category=${pack.category}" class="text-accent hover:underline">${escapeHtml(categoryLabel(pack.category))}</a></span>
                    ${pack.altName ? `<span>${escapeHtml(pack.altName)}</span>` : ''}
                </p>
            </div>

            <section class="card p-4 md:p-6 mb-6" aria-labelledby="map-title">
                <div class="tile-actions">
                    <button type="button" class="btn btn-primary" data-copy>Copy tile markers</button>
                    <button type="button" class="btn" id="pack-download">Download .json</button>
                    <label class="tile-recolor">
                        <input type="checkbox" id="pack-recolor" class="field">
                        <span>One colour for all tiles</span>
                        <input type="color" id="pack-color" value="#e3b415" aria-label="Tile colour" disabled>
                    </label>
                </div>
                <h2 id="map-title" class="tile-h2">Tile map</h2>
                <div class="segmented tile-areas" data-area-picker hidden></div>
                <div class="tile-map" data-map>${svg}</div>
                <p class="text-muted text-sm mt-2">North is up. Each square is one game tile, with a darker line every 8 tiles.</p>
                <div data-legend></div>
            </section>

            <section class="card p-4 md:p-6 mb-6" aria-labelledby="import-title">
                <h2 id="import-title" class="tile-h2">How to import into RuneLite</h2>
${IMPORT_STEPS}
            </section>

            <section class="card p-4 md:p-6 mb-6" aria-labelledby="json-title">
                <h2 id="json-title" class="tile-h2">Ground Markers JSON</h2>
                <details class="tile-json">
                    <summary>Show the JSON (${pack.tiles.length} markers)</summary>
                    <label class="tile-check"><input type="checkbox" id="pack-pretty" class="field"> Pretty print</label>
                    <pre id="pack-json">${escapeHtml(Tiles.exportJson(pack.tiles))}</pre>
                </details>
            </section>

            <section class="card p-4 md:p-6 mb-6" aria-labelledby="credit-title">
                <h2 id="credit-title" class="tile-h2">Credits and guide</h2>
                <ul class="tile-credits">
                    ${sourceLink ? `<li>Tiles from ${sourceLink}.</li>` : ''}
                    ${pack.video && !(pack.source && youtubeId(pack.source.link) === pack.video) ? `<li>Video guide: <a href="https://www.youtube.com/watch?v=${pack.video}" class="link" rel="nofollow noopener" target="_blank">watch on YouTube</a>.</li>` : ''}
                    <li>Collected by the community <a href="https://github.com/jamiegyoung/runemarkers" class="link" rel="noopener" target="_blank">RuneMarkers</a> project (MIT licence).</li>
                    ${pack.wiki ? `<li>About this fight or activity: <a href="${escapeHtml(pack.wiki)}" class="link" rel="noopener" target="_blank">OSRS Wiki</a>.</li>` : ''}
                </ul>
            </section>
${related.length ? `
            <section class="card p-4 md:p-6" aria-labelledby="related-title">
                <h2 id="related-title" class="tile-h2">More ${escapeHtml(categoryLabel(pack.category).toLowerCase())} tile markers</h2>
                <ul class="tile-related">
                    ${related.map(p => `<li><a href="/tile-markers/${p.slug}" class="text-accent hover:underline">${escapeHtml(p.title)}</a> <span class="text-muted">${p.tiles.length} tiles</span></li>`).join('\n                    ')}
                </ul>
                <p class="mt-3"><a href="/tile-markers/" class="link">All tile packs</a></p>
            </section>` : ''}
        </main>
`;

    return page({
        title: pageTitle,
        description,
        canonical,
        breadcrumb: [
            { name: 'Tile markers', url: `${SITE}/tile-markers/` },
            { name: pack.title, url: canonical }
        ],
        body,
        data: { slug: pack.slug, name: pack.title, tiles: pack.tiles }
    });
}

// ---------- Hub page ----------

const FAQ = [
    ['What are tile markers in OSRS?', 'Tile markers are coloured squares you place on the ground with RuneLite\'s Ground Markers plugin. Players use them to mark safe spots, walking routes and where to stand in boss fights. Only you can see them.'],
    ['Are tile markers allowed?', 'Yes. Ground Markers is one of RuneLite\'s built-in plugins, and RuneLite is an approved third-party client. The markers only change what you see.'],
    ['How do I share my own tile markers?', 'Right-click the world map orb and choose Export Ground Markers. RuneLite copies the markers for the area you are in as JSON, which anyone can import the same way. You can check the layout with the preview on this page before you share it.'],
    ['Why can\'t I see the markers after importing?', 'Markers belong to the area they were made in, so they only show once you are there. In instanced fights such as raids they show once the instance loads. Check that Ground Markers is turned on and its fill opacity isn\'t set to 0.']
];

function hubPage() {
    const sorted = [...packs].sort((a, b) => a.title.localeCompare(b.title));
    const cards = sorted.map(p => {
        const search = [p.title, p.altName, categoryLabel(p.category), ...p.tags].filter(Boolean).join(' ').toLowerCase();
        const thumb = Tiles.areaSvg(p.areas.reduce((a, b) => (b.points.length > a.points.length ? b : a)), { width: 120, cell: 0, pad: 1, labels: false, title: `${p.title} tile layout` });
        return `
                <li data-pack-card data-category="${p.category}" data-search="${escapeHtml(search)}"><a href="/tile-markers/${p.slug}" class="tile-card">
                    <span class="tile-thumb" aria-hidden="true">${thumb}</span>
                    <span class="tile-card-text"><strong>${escapeHtml(p.title)}</strong><span>${p.tiles.length} tile${p.tiles.length === 1 ? '' : 's'} · ${escapeHtml(categoryLabel(p.category))}</span></span>
                </a></li>`;
    }).join('');

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
    };
    const listSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'OSRS tile marker packs',
        numberOfItems: sorted.length,
        itemListElement: sorted.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: `${p.title} tile markers`, url: `${SITE}/tile-markers/${p.slug}` }))
    };

    const body = `
        <div class="mb-6">
            <h1 class="page-title">OSRS tile markers</h1>
            <p class="page-lead">Ready-made RuneLite Ground Markers for bosses, raids, Slayer and skilling. Pick a pack, look at the layout, copy it and import it in game.</p>
        </div>

        <main>
            <section class="card p-4 md:p-6 mb-6" aria-labelledby="packs-title">
                <h2 id="packs-title" class="tile-h2">Tile packs</h2>
                <div class="tile-filters">
                    <input type="search" id="pack-search" class="field" placeholder="Search packs, e.g. Zulrah, ToB, Tithe" aria-label="Search tile packs" autocomplete="off">
                    <div class="segmented tile-categories" role="group" aria-label="Category">
                        <button type="button" data-filter="all" aria-pressed="true">All</button>
                        ${CATEGORIES.map(c => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.label}</button>`).join('\n                        ')}
                    </div>
                </div>
                <p class="text-muted text-sm mb-3" id="pack-count" aria-live="polite">${sorted.length} tile packs</p>
                <ul class="tile-cards">${cards}
                </ul>
                <p id="pack-empty" class="text-secondary" hidden>No packs match. Try a boss name or clear the search.</p>
            </section>

            <section class="card p-4 md:p-6 mb-6" aria-labelledby="import-title">
                <h2 id="import-title" class="tile-h2">How to import tile markers</h2>
${IMPORT_STEPS}
            </section>

            <section class="card p-4 md:p-6 mb-6" aria-labelledby="own-title">
                <h2 id="own-title" class="tile-h2">Preview your own tile markers</h2>
                <p class="text-secondary mb-3">Paste markers you exported from RuneLite, or got from a friend, to see the layout before you import them. Nothing you paste leaves your browser.</p>
                <textarea id="own-json" class="field tile-textarea" rows="5" spellcheck="false" placeholder='[{"regionId":12850,"regionX":22,"regionY":31,"z":0,"color":"#FFE3B415"}]' aria-label="Ground Markers JSON"></textarea>
                <div class="tile-actions mt-3">
                    <button type="button" class="btn btn-primary" id="own-preview">Show the layout</button>
                    <button type="button" class="btn" id="own-copy">Copy cleaned JSON</button>
                </div>
                <p id="own-message" class="tile-message text-secondary" aria-live="polite"></p>
                <div id="own-result" hidden>
                    <div class="segmented tile-areas" data-area-picker hidden></div>
                    <div class="tile-map" data-map></div>
                    <div data-legend></div>
                </div>
            </section>

            <section class="card p-4 md:p-6" aria-labelledby="faq-title">
                <h2 id="faq-title" class="tile-h2">Tile marker questions</h2>
                <div class="prose-site">
                    ${FAQ.map(([q, a]) => `<h3 class="tile-h3">${escapeHtml(q)}</h3>\n                    <p>${escapeHtml(a)}</p>`).join('\n                    ')}
                    <p class="text-sm">The packs here come from the community <a href="https://github.com/jamiegyoung/runemarkers">RuneMarkers</a> collection (MIT licence), and each pack page credits the player or guide who made it.</p>
                </div>
            </section>
        </main>
`;

    return page({
        title: 'OSRS Tile Markers - RuneLite Ground Marker Packs to Copy | osrs.lol',
        description: `${sorted.length} free OSRS tile marker packs for RuneLite Ground Markers: bosses, raids, Slayer and skilling. Preview each layout, then copy or download it.`,
        canonical: `${SITE}/tile-markers/`,
        breadcrumb: [{ name: 'Tile markers', url: `${SITE}/tile-markers/` }],
        body,
        schema: [listSchema, faqSchema]
    });
}

// ---------- Write ----------

fs.mkdirSync(OUT_DIR, { recursive: true });
const keep = new Set(['index.html', ...packs.map(p => `${p.slug}.html`)]);
for (const file of fs.readdirSync(OUT_DIR)) {
    if (file.endsWith('.html') && !keep.has(file)) fs.unlinkSync(path.join(OUT_DIR, file));
}
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), hubPage());
for (const pack of packs) fs.writeFileSync(path.join(OUT_DIR, `${pack.slug}.html`), packPage(pack));
console.log(`Wrote tile-markers/index.html and ${packs.length} pack pages`);
