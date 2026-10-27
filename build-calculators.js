#!/usr/bin/env node

// Builds the skill calculator pages (calculators/*.html) from the data below.
// Run `node build-calculators.js` after changing the data or the dashboard's header/footer.
// The pages are static so Google can read every method, level and XP value; assets/calc.js
// fills in live GE prices from the OSRS Wiki in the browser.

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'calculators');
const dashboardTemplate = fs.readFileSync(path.join(__dirname, 'dev.html'), 'utf8');
const CALC_ASSET_VERSION = 3;

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
        description: 'OSRS Prayer calculator: bones or ashes needed for any level and the cost at live GE prices, for the Gilded altar, Chaos altar, Ectofuntus or burying.',
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
        description: 'OSRS Construction calculator: oak larders, mahogany tables and other builds needed for any level, with the plank cost at live GE prices.',
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
        description: 'OSRS Herblore calculator: potions needed for any level, with the cost and profit per XP for prayer potions, super restores and brews at live GE prices.',
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
            ['Making money from Herblore', 'Sort by Profit to see which potions are worth making today. Prayer potions, super restores and Saradomin brews sell fast because players use them for bossing.'],
            ['Cheapest XP', 'Sort by GP/XP. A negative number is what each XP costs you, a positive one means you make money while you train.'],
            ['Buy limits', 'Herbs and secondaries have GE buy limits, so for big batches you may need to buy over several 4-hour windows. Check an ingredient on its osrs.lol price page for its limit.']
        ]
    },
    {
        slug: 'cooking',
        example: ['Karambwan', 'karambwans'],
        name: 'Cooking',
        icon: 'https://oldschool.runescape.wiki/images/Cooking_icon.png',
        title: 'OSRS Cooking Calculator - Fish Needed & Profit per XP (Live GE Prices)',
        description: 'OSRS Cooking calculator: karambwans, sharks, wines and other food needed for any level, with the cost and profit at live GE prices.',
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
            ['Cooking for profit', 'Sort by Profit. Raw fish that sell for less than the cooked fish make money, but the margin moves with the market, so check before you buy in bulk.'],
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

// Item slugs and names come from the item pages, so links always match a real page
const itemById = new Map();
for (const file of fs.readdirSync(path.join(__dirname, 'items'))) {
    if (!file.endsWith('.html') || file === 'index.html') continue;
    const html = fs.readFileSync(path.join(__dirname, 'items', file), 'utf8');
    const id = html.match(/images\/osrs\/items\/(\d+)\.png/);
    const name = html.match(/"position":3,"name":"([^"]*)"/);
    if (id && name && !itemById.has(Number(id[1]))) {
        itemById.set(Number(id[1]), { slug: file.replace(/\.html$/, ''), name: JSON.parse(`"${name[1]}"`) });
    }
}
function itemInfo(id) {
    const item = itemById.get(id);
    if (!item) throw new Error(`No item page for item ${id}`);
    return item;
}
const itemSlug = id => itemInfo(id).slug;

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

function page({ title, description, canonical, breadcrumb, body, data, script = 'calc.js' }) {
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
    <script src="/assets/${script}?v=${CALC_ASSET_VERSION}"></script>
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

// XP per item used up; on the Chaos altar a bone is only used half the time, so it counts double
const xpPerAction = (action, method) => action.xp * method.mult / (1 - (method.save || 0));

function actionCount(action, method, xpLeft) {
    return Math.ceil(xpLeft / xpPerAction(action, method));
}

function skillPage(skill) {
    const methods = skill.methods || [{ id: 'default', label: '', mult: 1 }];
    const defaultMethod = methods[0];
    const xpTo99 = XP_TABLE[99];
    const actions = skill.actions.map(a => ({ ...a, slug: itemSlug(a.link || a.id), icon: a.link || a.id }));
    const visible = actions.filter(a => !defaultMethod.kinds || defaultMethod.kinds.includes(a.kind));

    const rows = visible.map(a => `
                        <tr data-level="${a.level}">
                            <td><div class="calc-item"><img src="${iconUrl(a.icon)}" alt="" width="24" height="24" loading="lazy"><div><a href="/items/${a.slug}">${escapeHtml(a.name)}</a></div></div></td>
                            <td class="text-right">${a.level}</td>
                            <td class="text-right">${xpPerAction(a, defaultMethod).toLocaleString('en-US')}</td>
                            <td class="text-right col-count">${fmt(actionCount(a, defaultMethod, xpTo99))}</td>
                            <td class="text-right">…</td>
                            <td class="text-right">…</td>${skill.sellToggle ? '\n                            <td class="text-right">…</td>' : ''}
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
    const showAll = `
                <label class="calc-check"><input id="calc-show-all" type="checkbox" class="field"> Show items above my current level</label>`;

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
                <div class="calc-options">${methodSelect}${bonus}${sell}${showAll}
                </div>

                <div class="calc-status" id="calc-status" aria-live="polite">Loading live GE prices…</div>
                <p class="calc-best" id="calc-best" aria-live="polite"></p>

                <div class="overflow-x-auto">
                    <table class="w-full text-sm calc-table">
                        <thead>
                            <tr>
                                <th scope="col" class="text-left" data-sort="name">${skill.slug === 'prayer' ? 'Bones / ashes' : 'Item'}</th>
                                <th scope="col" class="text-right" data-sort="level" tabindex="0">Level</th>
                                <th scope="col" class="text-right" data-sort="xp" tabindex="0">XP each</th>
                                <th scope="col" class="text-right" data-sort="count" tabindex="0">Needed</th>
                                <th scope="col" class="text-right" data-sort="price" tabindex="0">Price each</th>
                                <th scope="col" class="text-right" data-sort="total" tabindex="0">Total cost</th>${skill.sellToggle ? `
                                <th scope="col" class="text-right" data-sort="net" tabindex="0">Profit</th>` : ''}
                                <th scope="col" class="text-right" data-sort="gpxp" tabindex="0">GP/XP</th>
                            </tr>
                        </thead>
                        <tbody id="calc-body">${rows}
                        </tbody>
                    </table>
                </div>
                <p class="calc-legend">Price each is what ${skill.slug === 'prayer' ? 'one bone or ash costs' : skill.slug === 'construction' ? 'the materials for one build cost' : 'the ingredients for one cost'} to buy right now (the latest instant-buy price). ${skill.sellToggle ? 'Profit (after selling and GE tax) is green when you make money and red when you lose it; GP/XP' : 'GP/XP'} is negative when training costs money. Click a column to sort.</p>
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
        })),
        // Names and page links for every ingredient, including the logs the sawmill option swaps in
        items: Object.fromEntries([...new Set([
            ...actions.flatMap(a => [...(a.inputs || []), ...(a.outputs || [])].map(([id]) => id)),
            ...methods.flatMap(m => Object.values(m.swap || {}).map(([id]) => id))
        ])].map(id => [id, itemInfo(id)]))
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

            <section class="card p-4 md:p-6 mb-6" aria-labelledby="money-calcs-title">
                <h2 id="money-calcs-title" class="calc-h2">Money-making calculators</h2>
                <ul class="calc-cards">
                <li><a href="/calculators/barrows-repair" class="calc-card">
                    <img src="https://oldschool.runescape.wiki/images/Smithing_icon.png" alt="" width="28" height="28">
                    <span><strong>Barrows repair calculator</strong><span>Profit from buying broken Barrows, Moons of Peril or Torva armour, repairing it and selling it.</span></span>
                </a></li>
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
        description: 'Free OSRS skill calculators and XP table: XP to any level, Prayer, Construction, Herblore and Cooking costs, and Barrows repair profit at live GE prices.',
        canonical: 'https://osrs.lol/calculators/',
        breadcrumb: [{ name: 'Skill calculators', url: 'https://osrs.lol/calculators/' }],
        body,
        data: { skill: null, methods: [], actions: [] }
    });
}

// ---------- Repair calculator: buy broken armour, repair it, sell it ----------
// Repair costs are for a fully broken piece. An armour stand in your house takes 0.5% off per
// Smithing level (cost × (1 − level / 200)); Bob and the other NPCs charge the full price.
// Torva is repaired with Bandosian components instead of coins, which needs 90 Smithing.

const BARROWS_SLOTS = { helm: 60000, body: 90000, legs: 80000, weapon: 100000 };
const BARROWS = [
    // brother, set id, [name, slot, repaired id, broken id] (pieces in set order)
    ["Ahrim's", 12881, [['hood', 'helm', 4708, 4860], ['robetop', 'body', 4712, 4872], ['robeskirt', 'legs', 4714, 4878], ['staff', 'weapon', 4710, 4866]]],
    ["Dharok's", 12877, [['helm', 'helm', 4716, 4884], ['platebody', 'body', 4720, 4896], ['platelegs', 'legs', 4722, 4902], ['greataxe', 'weapon', 4718, 4890]]],
    ["Guthan's", 12873, [['helm', 'helm', 4724, 4908], ['platebody', 'body', 4728, 4920], ['chainskirt', 'legs', 4730, 4926], ['warspear', 'weapon', 4726, 4914]]],
    ["Karil's", 12883, [['coif', 'helm', 4732, 4932], ['leathertop', 'body', 4736, 4944], ['leatherskirt', 'legs', 4738, 4950], ['crossbow', 'weapon', 4734, 4938]]],
    ["Torag's", 12879, [['helm', 'helm', 4745, 4956], ['platebody', 'body', 4749, 4968], ['platelegs', 'legs', 4751, 4974], ['hammers', 'weapon', 4747, 4962]]],
    ["Verac's", 12875, [['helm', 'helm', 4753, 4980], ['brassard', 'body', 4757, 4992], ['plateskirt', 'legs', 4759, 4998], ['flail', 'weapon', 4755, 4986]]]
];
const MOON_COST = 1500000;
const MOONS = [
    // set, [piece, repaired id, broken id]
    ['Blood moon', [['helm', 29028, 29073], ['chestplate', 29022, 29067], ['tassets', 29025, 29070]]],
    ['Blue moon', [['helm', 29019, 29064], ['chestplate', 29013, 29058], ['tassets', 29016, 29061]]],
    ['Eclipse moon', [['helm', 29010, 29055], ['chestplate', 29004, 29049], ['tassets', 29007, 29052]]]
];
const BANDOSIAN_COMPONENTS = 26394;
const TORVA = { set: 31145, pieces: [['full helm', 26382, 26376, 1], ['platebody', 26384, 26378, 2], ['platelegs', 26386, 26380, 2]] };
const TORVA_LEVEL = 90;

const REPAIR_GROUPS = [
    { id: 'barrows', label: 'Barrows' },
    { id: 'moons', label: 'Moons of Peril' },
    { id: 'torva', label: 'Torva' }
];

function repairRows() {
    const rows = [];
    for (const [brother, setId, pieces] of BARROWS) {
        const keys = pieces.map(([piece, slot, fixed, broken]) => {
            rows.push({ key: `${fixed}`, group: 'barrows', name: `${brother} ${piece}`, fixed, broken: [[broken, 1]], coins: BARROWS_SLOTS[slot] });
            return `${fixed}`;
        });
        rows.push({ key: `${setId}`, group: 'barrows', name: `${brother} armour set`, fixed: setId, set: keys });
    }
    for (const [set, pieces] of MOONS) {
        for (const [piece, fixed, broken] of pieces) {
            rows.push({ key: `${fixed}`, group: 'moons', name: `${set} ${piece}`, fixed, broken: [[broken, 1]], coins: MOON_COST });
        }
    }
    const torvaKeys = TORVA.pieces.map(([piece, fixed, broken, components]) => {
        rows.push({ key: `${fixed}`, group: 'torva', name: `Torva ${piece}`, fixed, broken: [[broken, 1]], parts: [[BANDOSIAN_COMPONENTS, components]], level: TORVA_LEVEL });
        return `${fixed}`;
    });
    rows.push({ key: `${TORVA.set}`, group: 'torva', name: 'Torva armour set', fixed: TORVA.set, set: torvaKeys, level: TORVA_LEVEL });
    // Names come from the item pages so they match the GE (e.g. "Blood Moon helm")
    return rows.map(r => ({ ...r, name: itemInfo(r.fixed).name, slug: itemSlug(r.fixed) }));
}

const standCost = (coins, level) => Math.round(coins * (1 - level / 200));

function repairPage() {
    const rows = repairRows();
    const byKey = new Map(rows.map(r => [r.key, r]));
    const defaultLevel = 99;
    // Coins for one row at the default settings (armour stand, Smithing 99); Torva and sets of Torva cost components
    const coinsFor = r => r.set ? r.set.reduce((sum, k) => sum + coinsFor(byKey.get(k)), 0) : r.coins ? standCost(r.coins, defaultLevel) : null;
    const repairText = r => {
        if (r.parts || (r.set && byKey.get(r.set[0]).parts)) {
            const count = r.set ? r.set.reduce((sum, k) => sum + byKey.get(k).parts[0][1], 0) : r.parts[0][1];
            return `${count} × components`;
        }
        return fmt(coinsFor(r));
    };

    const tableRows = rows.map(r => `
                        <tr data-group="${r.group}"${r.set ? ' class="is-set"' : ''}>
                            <td><div class="calc-item"><img src="${iconUrl(r.fixed)}" alt="" width="24" height="24" loading="lazy"><div><a href="/items/${r.slug}">${escapeHtml(r.name)}</a></div></div></td>
                            <td class="text-right">…</td>
                            <td class="text-right">${repairText(r)}</td>
                            <td class="text-right">…</td>
                            <td class="text-right">…</td>
                            <td class="text-right">…</td>
                            <td class="text-right">…</td>
                        </tr>`).join('');

    const costRows = Object.entries(BARROWS_SLOTS).map(([slot, coins]) => `
                        <tr><td>Barrows ${slot}</td><td class="text-right">${fmt(coins)}</td><td class="text-right">${fmt(standCost(coins, 70))}</td><td class="text-right">${fmt(standCost(coins, 99))}</td></tr>`).join('')
        + `
                        <tr><td>Moon helm, chestplate or tassets</td><td class="text-right">${fmt(MOON_COST)}</td><td class="text-right">${fmt(standCost(MOON_COST, 70))}</td><td class="text-right">${fmt(standCost(MOON_COST, 99))}</td></tr>`;

    const setCoins = Object.values(BARROWS_SLOTS).reduce((a, b) => a + b, 0);
    const others = SKILLS.map(s => `<a href="/calculators/${s.slug}">${s.name}</a>`).join(', ');

    const body = `
        <div class="mb-6">
            <h1 class="page-title calc-title"><img src="https://oldschool.runescape.wiki/images/Smithing_icon.png" alt="" width="32" height="32">OSRS Barrows repair calculator</h1>
            <p class="page-lead">Buy broken Barrows, Moons of Peril or Torva armour on the Grand Exchange, repair it, and sell it. The profit on every piece and set at live GE prices.</p>
        </div>

        <main>
            <section class="card p-4 md:p-6 mb-6" aria-label="Barrows repair calculator">
                <div class="calc-form">
                    <div class="calc-field">
                        <label for="repair-level">Smithing level</label>
                        <input id="repair-level" class="field" type="number" inputmode="numeric" min="1" max="104" value="${defaultLevel}">
                    </div>
                    <div class="calc-field">
                        <label for="repair-where">Repair at</label>
                        <select id="repair-where" class="field">
                            <option value="stand">Armour stand</option>
                            <option value="npc">NPC (Bob)</option>
                        </select>
                    </div>
                    <div class="calc-field">
                        <label for="repair-prices">Prices</label>
                        <select id="repair-prices" class="field">
                            <option value="instant">Instant</option>
                            <option value="patient">Patient</option>
                        </select>
                    </div>
                    <div class="calc-field">
                        <label for="repair-group">Show</label>
                        <select id="repair-group" class="field">
                            <option value="all">All armour</option>
${REPAIR_GROUPS.map(g => `                            <option value="${g.id}">${g.label}</option>`).join('\n')}
                        </select>
                    </div>
                </div>
                <p class="calc-summary" id="repair-summary" aria-live="polite">At Smithing ${defaultLevel}, an armour stand repairs for <strong class="text-accent">${100 - defaultLevel / 2}%</strong> less than Bob: a full Barrows set costs ${fmt(standCost(setCoins, defaultLevel))} instead of ${fmt(setCoins)}.</p>
                <div class="calc-options">
                    <label class="calc-check"><input id="repair-sets" type="checkbox" class="field" checked> Show full armour sets</label>
                    <label class="calc-check"><input id="repair-profitable" type="checkbox" class="field"> Only show a profit</label>
                </div>

                <div class="calc-status" id="calc-status" aria-live="polite">Loading live GE prices…</div>
                <p class="calc-best" id="calc-best" aria-live="polite"></p>

                <div class="overflow-x-auto">
                    <table class="w-full text-sm calc-table repair-table">
                        <thead>
                            <tr>
                                <th scope="col" class="text-left" data-sort="name">Item</th>
                                <th scope="col" class="text-right" data-sort="buy" tabindex="0">Buy broken</th>
                                <th scope="col" class="text-right" data-sort="repair" tabindex="0">Repair</th>
                                <th scope="col" class="text-right" data-sort="sell" tabindex="0">Sell repaired</th>
                                <th scope="col" class="text-right" data-sort="profit" tabindex="0">Profit</th>
                                <th scope="col" class="text-right" data-sort="roi" tabindex="0">ROI</th>
                                <th scope="col" class="text-right" data-sort="volume" tabindex="0">Traded / day</th>
                            </tr>
                        </thead>
                        <tbody id="repair-body">${tableRows}
                        </tbody>
                    </table>
                </div>
                <p class="calc-legend">Buy broken is what the broken pieces cost, Sell repaired is what the repaired item sells for after the 2% GE tax. Instant buys at the latest instant-buy price and sell at the instant-sell price; patient offers buy and sell at the other end of the margin, which is cheaper but slower. Traded / day is how many of the broken item changed hands on the GE in the last 24 hours. Click a column to sort.</p>
            </section>

            <section class="card p-6 md:p-10 prose-site">
                <h2>How Barrows repair flipping works</h2>
                <p>Barrows equipment can only be traded when it is fully repaired or fully broken (the "0" versions). Broken pieces often sell for less than a repaired piece minus the repair fee, so you can buy them on the Grand Exchange, repair them, and sell them back. This calculator does that sum for every piece using the latest real trades from the <a href="https://prices.runescape.wiki/">OSRS Wiki price API</a>, the same data as the osrs.lol <a href="/">price dashboard</a>.</p>
                <p>Bob in Lumbridge, Dunstan in Burthorpe and the other repair NPCs charge the full price. Repairing at an armour stand in your player-owned house (level 55 Construction in the workshop) takes 0.5% off for every Smithing level, so at level 99 it is just over half price. Boosted Smithing levels count.</p>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm calc-table">
                        <thead><tr><th scope="col" class="text-left">Fully broken piece</th><th scope="col" class="text-right">NPC repair</th><th scope="col" class="text-right">Armour stand, 70 Smithing</th><th scope="col" class="text-right">Armour stand, 99 Smithing</th></tr></thead>
                        <tbody>${costRows}
                        </tbody>
                    </table>
                </div>
                <p>A full Barrows set (helm, body, legs and weapon) costs ${fmt(setCoins)} to repair with an NPC and ${fmt(standCost(setCoins, 99))} at an armour stand with 99 Smithing.</p>
                <h2>Blood moon, Blue moon and Eclipse moon armour</h2>
                <p>The Moons of Peril armour from the Lunar Chest degrades like Barrows equipment and breaks after about 45 hours of combat. Repairing a broken helm, chestplate or tassets costs ${fmt(MOON_COST)} with an NPC, or ${fmt(standCost(MOON_COST, 99))} at an armour stand with 99 Smithing. Broken moon pieces trade in small numbers, so check Traded / day before you buy.</p>
                <h2>Torva armour</h2>
                <p>Damaged Torva from Nex is repaired with Bandosian components at level ${TORVA_LEVEL} Smithing: one for the full helm and two each for the platebody and platelegs. The calculator prices the components at the live GE price, and greys out Torva below level ${TORVA_LEVEL}.</p>
                <h2>Buying pieces or whole sets</h2>
                <p>The armour set rows buy all four broken pieces of one brother (or the three Torva pieces), repair them, and sell them as a set from the Grand Exchange clerk, which packs them for free. Sets sometimes sell for more than the pieces added up, sometimes for less, so compare the set row with its pieces.</p>
                <h2>Tips</h2>
                <p>Margins move quickly and many broken pieces trade only a few times a day, so a patient offer can take hours to fill. Buy limits apply to broken pieces too. The GE tax is 2% of the sell price, capped at 5m per item, and is already taken off.</p>
                <h2>More calculators</h2>
                <p>See the <a href="/calculators/">skill calculators</a> (${others}) or the <a href="/merchanting">merchanting guide</a>.</p>
            </section>
        </main>
`;

    const ids = new Set();
    rows.forEach(r => { ids.add(r.fixed); (r.broken || []).forEach(([id]) => ids.add(id)); (r.parts || []).forEach(([id]) => ids.add(id)); });

    return page({
        title: 'OSRS Barrows Repair Calculator - Repair Cost & Profit (Live GE Prices)',
        description: 'OSRS Barrows repair calculator: buy broken Barrows, Blood moon, Blue moon, Eclipse moon or Torva armour, repair it at Bob or an armour stand, and see the profit at live GE prices.',
        canonical: 'https://osrs.lol/calculators/barrows-repair',
        breadcrumb: [
            { name: 'Skill calculators', url: 'https://osrs.lol/calculators/' },
            { name: 'Barrows repair calculator', url: 'https://osrs.lol/calculators/barrows-repair' }
        ],
        body,
        data: {
            rows: rows.map(({ slug, ...r }) => ({ ...r, slug })),
            torvaLevel: TORVA_LEVEL,
            items: Object.fromEntries([...ids].map(id => [id, itemInfo(id)]))
        },
        script: 'repair.js'
    });
}

// ---------- Write ----------

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), hubPage());
fs.writeFileSync(path.join(OUTPUT_DIR, 'barrows-repair.html'), repairPage());
for (const skill of SKILLS) {
    fs.writeFileSync(path.join(OUTPUT_DIR, `${skill.slug}.html`), skillPage(skill));
}
console.log(`Wrote ${SKILLS.length + 2} calculator pages to ${OUTPUT_DIR}`);

module.exports = { SKILLS };
