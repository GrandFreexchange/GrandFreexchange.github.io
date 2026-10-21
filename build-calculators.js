#!/usr/bin/env node

// Builds the skill calculator pages (calculators/*.html) from the data below.
// Run `node build-calculators.js` after changing the data or the dashboard's header/footer.
// The pages are static so Google can read every method, level and XP value; assets/calc.js
// fills in live GE prices from the OSRS Wiki in the browser.

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'calculators');
const dashboardTemplate = fs.readFileSync(path.join(__dirname, 'dev.html'), 'utf8');
const CALC_ASSET_VERSION = 1;

// ---------- Skill data ----------
// Each action: name, level, xp, inputs/outputs as [itemId, quantity], optional coin fee.
// `kind` ties an action to the methods that can use it (e.g. bones on an altar, ashes on an offering).
// Methods multiply the XP; `save` is the chance the input isn't used up (Chaos altar).

const SKILLS = [
    {
        slug: 'prayer',
        example: ['Dragon bones', 'dragon bones on a Gilded altar'],
        name: 'Prayer',
        icon: 'https://oldschool.runescape.wiki/images/Prayer_icon.png',
        title: 'OSRS Prayer Calculator - Bones Needed & Cost to 99 (Live GE Prices)',
        description: 'Free OSRS Prayer calculator: how many bones or ashes you need for any level, and what it costs at live Grand Exchange prices on the Gilded altar, Chaos altar, Ectofuntus or burying.',
        lead: 'How many bones or ashes you need for your target level, and what they cost at live Grand Exchange prices.',
        methods: [
            { id: 'gilded', label: 'Gilded altar (350%)', mult: 3.5, kinds: ['bone'] },
            { id: 'chaos', label: 'Chaos altar (350%, 50% chance to keep the bone)', mult: 3.5, save: 0.5, kinds: ['bone'] },
            { id: 'ecto', label: 'Ectofuntus (400%)', mult: 4, kinds: ['bone'] },
            { id: 'sinister', label: 'Sinister offering (300%)', mult: 3, kinds: ['bone'] },
            { id: 'demonic', label: 'Demonic offering (300%)', mult: 3, kinds: ['ash'] },
            { id: 'bury', label: 'Bury bones or scatter ashes (100%)', mult: 1, kinds: ['bone', 'ash'] }
        ],
        actions: [
            { name: 'Bones', id: 526, level: 1, xp: 4.5, kind: 'bone' },
            { name: 'Big bones', id: 532, level: 1, xp: 15, kind: 'bone' },
            { name: 'Wyrmling bones', id: 28899, level: 1, xp: 21, kind: 'bone' },
            { name: 'Babydragon bones', id: 534, level: 1, xp: 30, kind: 'bone' },
            { name: 'Wyrm bones', id: 22780, level: 1, xp: 50, kind: 'bone' },
            { name: 'Dragon bones', id: 536, level: 1, xp: 72, kind: 'bone' },
            { name: 'Wyvern bones', id: 6812, level: 1, xp: 72, kind: 'bone' },
            { name: 'Drake bones', id: 22783, level: 1, xp: 80, kind: 'bone' },
            { name: 'Lava dragon bones', id: 11943, level: 1, xp: 85, kind: 'bone' },
            { name: 'Frost dragon bones', id: 31729, level: 1, xp: 100, kind: 'bone' },
            { name: 'Hydra bones', id: 22786, level: 1, xp: 110, kind: 'bone' },
            { name: 'Dagannoth bones', id: 6729, level: 1, xp: 125, kind: 'bone' },
            { name: 'Ourg bones', id: 4834, level: 1, xp: 140, kind: 'bone' },
            { name: 'Superior dragon bones', id: 22124, level: 70, xp: 150, kind: 'bone' },
            { name: 'Fiendish ashes', id: 25766, level: 1, xp: 10, kind: 'ash' },
            { name: 'Vile ashes', id: 25769, level: 1, xp: 25, kind: 'ash' },
            { name: 'Malicious ashes', id: 25772, level: 1, xp: 65, kind: 'ash' },
            { name: 'Abyssal ashes', id: 25775, level: 1, xp: 85, kind: 'ash' },
            { name: 'Infernal ashes', id: 25778, level: 1, xp: 110, kind: 'ash' }
        ].map(a => ({ ...a, inputs: [[a.id, 1]] })),
        notes: [
            'Prices are for the bones or ashes only. The Ectofuntus also needs a pot and a bucket of slime per bone, and the offering spells use runes.',
            'On the Chaos altar in the Wilderness each bone has a 50% chance not to be used, so on average a bone gives twice the XP. Bring only what you can afford to lose.'
        ],
        guide: [
            ['Which altar should I use?', 'A Gilded altar in a player-owned house with both burners lit gives 350% XP and is safe, so it is the usual choice. The Chaos altar gives the same 350% and keeps half your bones on average, which halves the cost, but it is in level 38 Wilderness. The Ectofuntus gives the most XP per bone (400%) but is slow.'],
            ['Cheapest bones per XP', 'Sort the table by GP/XP to see which bone is cheapest right now. Dragon bones and wyvern bones give the same XP, so buy whichever is cheaper today. Superior dragon bones need level 70 Prayer.'],
            ['Ashes', 'Demonic ashes from demons can be scattered or offered with the Demonic offering spell for 300% XP. Pick "Demonic offering" or "Bury or scatter" above to see them.']
        ]
    },
    {
        slug: 'construction',
        example: ['Mahogany table', 'mahogany tables'],
        name: 'Construction',
        icon: 'https://oldschool.runescape.wiki/images/Construction_icon.png',
        title: 'OSRS Construction Calculator - Planks Needed & Cost to 99 (Live GE Prices)',
        description: 'Free OSRS Construction calculator: how many oak larders, mahogany tables or other builds you need for any level, and the plank cost at live Grand Exchange prices.',
        lead: 'How many builds and planks you need for your target level, and what the planks cost at live Grand Exchange prices.',
        methods: [
            { id: 'planks', label: 'Buy planks on the GE', mult: 1 },
            {
                id: 'sawmill', label: 'Buy logs and pay the sawmill', mult: 1,
                // plank -> [log, sawmill fee per plank]
                swap: { 960: [1511, 100], 8778: [1521, 250], 8780: [6333, 500], 8782: [6332, 1500] }
            }
        ],
        bonus: { label: "Full carpenter's outfit (+2.5% XP)", mult: 1.025 },
        actions: [
            { name: 'Wooden bookcase', link: 960, level: 4, xp: 115, inputs: [[960, 4], [1539, 4]] },
            { name: 'Oak chair', link: 8778, level: 19, xp: 120, inputs: [[8778, 2]] },
            { name: 'Oak larder', link: 8778, level: 33, xp: 480, inputs: [[8778, 8]] },
            { name: 'Mythical cape (mounted)', link: 8780, level: 47, xp: 370, inputs: [[8780, 3]] },
            { name: 'Mahogany table', link: 8782, level: 52, xp: 840, inputs: [[8782, 6]] },
            { name: 'Oak dungeon door', link: 8778, level: 74, xp: 600, inputs: [[8778, 10]] },
            { name: 'Gnome bench', link: 8782, level: 77, xp: 840, inputs: [[8782, 6]] }
        ],
        notes: [
            'Costs count planks (and nails for the bookcase) only, not a butler or the Plank Make spell. Removing furniture you built gives the materials back for the mythical cape, so the cape is not counted.',
            'The sawmill option uses the log price plus the sawmill fee: 100 gp for a plank, 250 for oak, 500 for teak and 1,500 for mahogany.'
        ],
        guide: [
            ['Fastest way to level', 'Oak larders from level 33 and mahogany tables from 52 are the usual training methods, with a demon butler fetching planks. Gnome benches give the same XP as mahogany tables and are quicker to build in a garden.'],
            ['Buying planks or logs', 'Switch the method above to compare buying planks with buying logs and paying the sawmill fee. Whichever is cheaper changes with the market.'],
            ['Mythical cape', 'Building and removing a mythical cape mount uses 3 teak planks for 370 XP. It needs the Dragon Slayer II cape, which you get back.']
        ]
    },
    {
        slug: 'herblore',
        example: ['Prayer potion', 'prayer potions'],
        name: 'Herblore',
        icon: 'https://oldschool.runescape.wiki/images/Herblore_icon.png',
        title: 'OSRS Herblore Calculator - Potions Needed & Profit per XP (Live GE Prices)',
        description: 'Free OSRS Herblore calculator: how many potions you need for any level, and the profit or loss per XP for prayer potions, super restores, brews and more at live Grand Exchange prices.',
        lead: 'How many potions you need for your target level, and the profit or loss of each at live Grand Exchange prices.',
        sellToggle: 'Sell the finished potions (after the 2% GE tax)',
        actions: [
            ['Attack potion', 3, 25, 249, 221, 121],
            ['Strength potion', 12, 50, 253, 225, 115],
            ['Prayer potion', 38, 87.5, 257, 231, 139],
            ['Super attack', 45, 100, 259, 221, 145],
            ['Super energy', 52, 117.5, 261, 2970, 3018],
            ['Super strength', 55, 125, 263, 225, 157],
            ['Super restore', 63, 142.5, 3000, 223, 3026],
            ['Super defence', 66, 150, 265, 239, 163],
            ['Antifire potion', 69, 157.5, 2481, 241, 2454],
            ['Ranging potion', 72, 162.5, 267, 245, 169],
            ['Magic potion', 76, 172.5, 2481, 3138, 3042],
            ['Saradomin brew', 81, 180, 2998, 6693, 6687]
        ].map(([name, level, xp, herb, secondary, potion]) => ({
            name, level, xp, link: potion,
            inputs: [[herb, 1], [secondary, 1], [227, 1]],
            outputs: [[potion, 1]]
        })),
        notes: [
            'Each potion is a clean herb, a vial of water and the secondary ingredient, making one 3-dose potion. Ingredients are priced at the instant-buy price and potions at the instant-sell price.',
            'XP is for making the finished potion from the herb, including the unfinished potion step.'
        ],
        guide: [
            ['Making money from Herblore', 'Sort by Profit each to see which potions are worth making today. Prayer potions, super restores and Saradomin brews sell fast because players use them for bossing.'],
            ['Cheapest XP', 'Sort by GP/XP. A negative number is a loss per XP, a positive one means you make money while you train.'],
            ['Buy limits', 'Herbs and secondaries have GE buy limits, so for big batches you may need to buy over several 4-hour windows. Check an ingredient on its osrs.lol price page for its limit.']
        ]
    },
    {
        slug: 'cooking',
        example: ['Karambwan', 'karambwans'],
        name: 'Cooking',
        icon: 'https://oldschool.runescape.wiki/images/Cooking_icon.png',
        title: 'OSRS Cooking Calculator - Fish Needed & Profit per XP (Live GE Prices)',
        description: 'Free OSRS Cooking calculator: how many karambwans, sharks, wines or other food you need for any level, and the profit or loss at live Grand Exchange prices.',
        lead: 'How much food you need to cook for your target level, and the profit or loss at live Grand Exchange prices.',
        sellToggle: 'Sell the cooked food (after the 2% GE tax)',
        actions: [
            ['Trout', 15, 70, 335, 333],
            ['Salmon', 25, 90, 331, 329],
            ['Tuna', 30, 100, 359, 361],
            ['Karambwan', 30, 190, 3142, 3144],
            ['Jug of wine', 35, 200, [[1987, 1], [1937, 1]], 1993],
            ['Lobster', 40, 120, 377, 379],
            ['Swordfish', 45, 140, 371, 373],
            ['Monkfish', 62, 150, 7944, 7946],
            ['Shark', 80, 210, 383, 385],
            ['Sea turtle', 82, 211.3, 395, 397],
            ['Anglerfish', 84, 230, 13439, 13441],
            ['Dark crab', 90, 215, 11934, 11936],
            ['Manta ray', 91, 216.2, 389, 391]
        ].map(([name, level, xp, raw, cooked]) => ({
            name, level, xp, link: cooked,
            inputs: Array.isArray(raw) ? raw : [[raw, 1]],
            outputs: [[cooked, 1]]
        })),
        notes: [
            'The numbers assume nothing burns. At low levels you will burn some food, so you need a little more than shown.',
            'Jug of wine is grapes plus a jug of water. It gives its XP when the wine finishes fermenting.'
        ],
        guide: [
            ['Fastest Cooking XP', '1-tick karambwans from level 30 and wines from level 35 are the fastest methods. Wines are made from your bank, so you can train them anywhere.'],
            ['Cooking for profit', 'Sort by Profit each. Raw fish that sell for less than the cooked fish make money, but the margin moves with the market, so check before you buy in bulk.'],
            ['Burning food', 'Every fish has a level where you stop burning it, lower with Cooking gauntlets or at the Hosidius kitchen. Until then budget some extra fish.']
        ]
    }
];

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

// Same slugs as build.js uses for the item pages
function nameToSlug(name) {
    return name.toLowerCase().trim()
        .replace(/\+/g, '-plus')
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// XP needed for each level, 1 to 99 (OSRS formula)
const XP_TABLE = [0, 0];
for (let level = 2, points = 0; level <= 99; level++) {
    points += Math.floor(level - 1 + 300 * Math.pow(2, (level - 1) / 7));
    XP_TABLE[level] = Math.floor(points / 4);
}

const fmt = n => Math.round(n).toLocaleString('en-US');
const iconUrl = id => `https://tiles.runescape.wiki/static/public/images/osrs/items/${id}.png`;

// Item slugs come from the item pages, so links always match a real page
const itemSlugById = new Map();
for (const file of fs.readdirSync(path.join(__dirname, 'items'))) {
    if (!file.endsWith('.html') || file === 'index.html') continue;
    const html = fs.readFileSync(path.join(__dirname, 'items', file), 'utf8');
    const match = html.match(/images\/osrs\/items\/(\d+)\.png/);
    if (match && !itemSlugById.has(Number(match[1]))) itemSlugById.set(Number(match[1]), file.replace(/\.html$/, ''));
}
function itemSlug(id) {
    const slug = itemSlugById.get(id);
    if (!slug) throw new Error(`No item page for item ${id}`);
    return slug;
}

// ---------- Shared page parts (same as the dashboard) ----------

function templatePart(pattern, label) {
    const match = dashboardTemplate.match(pattern);
    if (!match) throw new Error(`dev.html is missing ${label}`);
    return match[0];
}

const siteHead = templatePart(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">[\s\S]*?<script src="\/assets\/theme\.js"><\/script>/, 'shared <head> assets');
const siteHeader = templatePart(/<header class="site-header">[\s\S]*?<\/header>/, 'site header')
    .replace(/<h1 class="site-title">(.*?)<\/h1>/, '<p class="site-title">$1</p>');
const siteFooter = templatePart(/<footer class="site-footer">[\s\S]*?<\/footer>/, 'site footer');

function page({ title, description, canonical, breadcrumb, body, data }) {
    const crumbs = [{ name: 'Home', url: 'https://osrs.lol/' }, ...breadcrumb];
    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url }))
    };
    const crumbHtml = crumbs.map((c, i) => i === crumbs.length - 1
        ? `<li aria-current="page">${escapeHtml(c.name)}</li>`
        : `<li><a href="${c.url.replace('https://osrs.lol', '')}" class="text-accent hover:underline">${escapeHtml(c.name)}</a></li>\n                <li aria-hidden="true">›</li>`
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
    <script src="https://cdn.tailwindcss.com"></script>
    ${siteHead}
    <link rel="stylesheet" href="/assets/calc.css?v=${CALC_ASSET_VERSION}">
    <script type="application/ld+json">${inlineJSON(breadcrumbSchema)}</script>
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
    </div>
    <script type="application/json" id="calc-data">${inlineJSON(data)}</script>
    <script src="/assets/calc.js?v=${CALC_ASSET_VERSION}"></script>
</body>

</html>
`;
}

// Current / target level and XP fields, shared by every calculator
function levelForm(defaultCurrent, defaultTarget) {
    return `
            <div class="calc-form">
                <div class="calc-field">
                    <label for="cur-level">Current level</label>
                    <input id="cur-level" class="field" type="number" inputmode="numeric" min="1" max="99" value="${defaultCurrent}">
                </div>
                <div class="calc-field">
                    <label for="cur-xp">Current XP</label>
                    <input id="cur-xp" class="field" type="number" inputmode="numeric" min="0" max="200000000" value="${XP_TABLE[defaultCurrent]}">
                </div>
                <div class="calc-field">
                    <label for="target-level">Target level</label>
                    <input id="target-level" class="field" type="number" inputmode="numeric" min="1" max="99" value="${defaultTarget}">
                </div>
                <div class="calc-field">
                    <label for="target-xp">Target XP</label>
                    <input id="target-xp" class="field" type="number" inputmode="numeric" min="0" max="200000000" value="${XP_TABLE[defaultTarget]}">
                </div>
            </div>
            <p class="calc-summary" id="calc-summary" aria-live="polite">You need <strong class="text-accent">${fmt(XP_TABLE[defaultTarget] - XP_TABLE[defaultCurrent])} XP</strong> to go from level ${defaultCurrent} to ${defaultTarget}.</p>`;
}

// ---------- Skill pages ----------

function actionCount(action, method, xpLeft) {
    return Math.ceil(xpLeft / (action.xp * method.mult));
}

function skillPage(skill) {
    const methods = skill.methods || [{ id: 'default', label: '', mult: 1 }];
    const defaultMethod = methods[0];
    const xpTo99 = XP_TABLE[99];
    const actions = skill.actions.map(a => ({ ...a, slug: itemSlug(a.link || a.id), icon: a.link || a.id }));
    const visible = actions.filter(a => !defaultMethod.kinds || defaultMethod.kinds.includes(a.kind));

    const rows = visible.map(a => `
                        <tr data-level="${a.level}">
                            <td class="calc-item"><img src="${iconUrl(a.icon)}" alt="" width="24" height="24" loading="lazy"><a href="/items/${a.slug}">${escapeHtml(a.name)}</a></td>
                            <td class="text-right">${a.level}</td>
                            <td class="text-right">${(a.xp * defaultMethod.mult).toLocaleString('en-US')}</td>
                            <td class="text-right col-count">${fmt(actionCount(a, defaultMethod, xpTo99))}</td>
                            <td class="text-right">…</td>
                            <td class="text-right">…</td>
                            <td class="text-right">…</td>
                        </tr>`).join('');

    const methodSelect = skill.methods ? `
                <div class="calc-field calc-field-wide">
                    <label for="calc-method">Method</label>
                    <select id="calc-method" class="field">
${skill.methods.map(m => `                        <option value="${m.id}">${escapeHtml(m.label)}</option>`).join('\n')}
                    </select>
                </div>` : '';
    const bonus = skill.bonus ? `
                <label class="calc-check"><input id="calc-bonus" type="checkbox" class="field"> ${escapeHtml(skill.bonus.label)}</label>` : '';
    const sell = skill.sellToggle ? `
                <label class="calc-check"><input id="calc-sell" type="checkbox" class="field" checked> ${escapeHtml(skill.sellToggle)}</label>` : '';

    // A plain sentence Google can quote, with the real count for the skill's best-known method
    const example = visible.find(a => a.name === skill.example[0]);
    const headline = `Level 1 to 99 ${skill.name} takes ${fmt(xpTo99)} XP, which is ${fmt(actionCount(example, defaultMethod, xpTo99))} ${skill.example[1]}.`;

    const others = SKILLS.filter(s => s !== skill)
        .map(s => `<a href="/calculators/${s.slug}">${s.name} calculator</a>`).join(', ');

    const body = `
        <div class="mb-6">
            <h1 class="page-title calc-title"><img src="${skill.icon}" alt="" width="32" height="32">OSRS ${skill.name} calculator</h1>
            <p class="page-lead">${escapeHtml(skill.lead)}</p>
        </div>

        <main>
            <section class="card p-4 md:p-6 mb-6" aria-label="${skill.name} calculator">
${levelForm(1, 99)}
                <div class="calc-options">${methodSelect}${bonus}${sell}
                </div>

                <div class="calc-status" id="calc-status" aria-live="polite">Loading live GE prices…</div>

                <div class="overflow-x-auto">
                    <table class="w-full text-sm calc-table">
                        <thead>
                            <tr>
                                <th scope="col" class="text-left" data-sort="name">${skill.slug === 'prayer' ? 'Bones / ashes' : 'Item'}</th>
                                <th scope="col" class="text-right" data-sort="level" tabindex="0">Level</th>
                                <th scope="col" class="text-right" data-sort="xp" tabindex="0">XP each</th>
                                <th scope="col" class="text-right" data-sort="count" tabindex="0">Needed</th>
                                <th scope="col" class="text-right" data-sort="each" tabindex="0">Profit each</th>
                                <th scope="col" class="text-right" data-sort="total" tabindex="0">Total profit</th>
                                <th scope="col" class="text-right" data-sort="gpxp" tabindex="0">GP/XP</th>
                            </tr>
                        </thead>
                        <tbody id="calc-body">${rows}
                        </tbody>
                    </table>
                </div>
                <p class="calc-legend">Green is a profit, red is a cost. Greyed-out rows need a higher level than your current one.</p>
            </section>

            <section class="card p-6 md:p-10 prose-site">
                <h2>How the ${skill.name} calculator works</h2>
                <p>${escapeHtml(headline)} Enter your current level or XP and your goal, and the table shows how many of each item you need and what it costs right now on the Grand Exchange. Prices are the latest real trades from the <a href="https://prices.runescape.wiki/">OSRS Wiki price API</a>, the same data as the osrs.lol <a href="/">price dashboard</a>.</p>
${skill.notes.map(n => `                <p>${escapeHtml(n)}</p>`).join('\n')}
${skill.guide.map(([h, p]) => `                <h2>${escapeHtml(h)}</h2>\n                <p>${escapeHtml(p)}</p>`).join('\n')}
                <h2>More calculators</h2>
                <p>Try the ${others}, or see the full <a href="/calculators/#xp-table">OSRS XP table</a>.</p>
            </section>
        </main>
`;

    const data = {
        skill: skill.name,
        methods,
        bonus: skill.bonus || null,
        sell: !!skill.sellToggle,
        actions: actions.map(a => ({
            name: a.name, slug: a.slug, icon: a.icon, level: a.level, xp: a.xp, kind: a.kind || null,
            inputs: a.inputs || [], outputs: a.outputs || []
        }))
    };

    return page({
        title: skill.title,
        description: skill.description,
        canonical: `https://osrs.lol/calculators/${skill.slug}`,
        breadcrumb: [
            { name: 'Skill calculators', url: 'https://osrs.lol/calculators/' },
            { name: `${skill.name} calculator`, url: `https://osrs.lol/calculators/${skill.slug}` }
        ],
        body,
        data
    });
}

// ---------- Hub page: XP calculator, links to every skill calculator, XP table ----------

function hubPage() {
    const cards = SKILLS.map(s => `
                <li><a href="/calculators/${s.slug}" class="calc-card">
                    <img src="${s.icon}" alt="" width="28" height="28">
                    <span><strong>${s.name} calculator</strong><span>${escapeHtml(s.lead)}</span></span>
                </a></li>`).join('');

    const tableRows = [];
    for (let level = 1; level <= 99; level++) {
        tableRows.push(`<tr><td>${level}</td><td class="text-right">${fmt(XP_TABLE[level])}</td><td class="text-right">${level === 1 ? '–' : fmt(XP_TABLE[level] - XP_TABLE[level - 1])}</td></tr>`);
    }

    const body = `
        <div class="mb-6">
            <h1 class="page-title">OSRS skill calculators</h1>
            <p class="page-lead">Work out the XP to your next goal, and what it costs to train each skill at live Grand Exchange prices.</p>
        </div>

        <main>
            <section class="card p-4 md:p-6 mb-6" aria-labelledby="xp-calc-title">
                <h2 id="xp-calc-title" class="calc-h2">XP calculator</h2>
${levelForm(1, 99)}
            </section>

            <section class="card p-4 md:p-6 mb-6" aria-labelledby="skill-calcs-title">
                <h2 id="skill-calcs-title" class="calc-h2">Skill calculators with live GE prices</h2>
                <ul class="calc-cards">${cards}
                </ul>
            </section>

            <section class="card p-4 md:p-6" aria-labelledby="xp-table">
                <h2 id="xp-table" class="calc-h2">OSRS XP table</h2>
                <p class="text-secondary mb-4">The total XP needed for every level from 1 to 99. Level 99 needs ${fmt(XP_TABLE[99])} XP, and level 92 (${fmt(XP_TABLE[92])} XP) is roughly half of that. A skill can keep earning XP up to 200,000,000.</p>
                <div class="xp-table-wrap">
                    <table class="w-full text-sm calc-table xp-table">
                        <thead><tr><th scope="col" class="text-left">Level</th><th scope="col" class="text-right">Total XP</th><th scope="col" class="text-right">XP from previous level</th></tr></thead>
                        <tbody>
                        ${tableRows.join('\n                        ')}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
`;

    return page({
        title: 'OSRS Skill Calculators & XP Table - Cost to 99 at Live GE Prices',
        description: 'Free OSRS skill calculators: XP to any level, the full XP table from 1 to 99, and Prayer, Construction, Herblore and Cooking calculators priced with live Grand Exchange data.',
        canonical: 'https://osrs.lol/calculators/',
        breadcrumb: [{ name: 'Skill calculators', url: 'https://osrs.lol/calculators/' }],
        body,
        data: { skill: null, methods: [], actions: [] }
    });
}

// ---------- Write ----------

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), hubPage());
for (const skill of SKILLS) {
    fs.writeFileSync(path.join(OUTPUT_DIR, `${skill.slug}.html`), skillPage(skill));
}
console.log(`Wrote ${SKILLS.length + 1} calculator pages to ${OUTPUT_DIR}`);

module.exports = { SKILLS };
