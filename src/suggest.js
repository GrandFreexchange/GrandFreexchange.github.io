/**
 * Suggestion engine for OSRS flipping opportunities.
 * Ported from the main app for use in static item pages.
 */

const WIKI_API_HEADERS = {
    'User-Agent': 'GrandFreexchange.github.io - Suggestion Engine'
};

const budgetSteps = [
    100000, 200000, 300000, 400000, 500000,
    1000000,
    5000000, 10000000, 15000000, 20000000, 25000000,
    30000000, 35000000, 40000000, 45000000, 50000000,
    100000000, 250000000,
    Number.MAX_SAFE_INTEGER
];

const taxExemptIds = new Set([
    554, 555, 556, 557, 558, 559, 560, 561, 562, 563, 564, 565, 566, 9075,
    882, 884, 886, 888, 890, 892,
    9375, 9377, 9378, 9379, 9380, 9381,
    13190
]);

let itemMapping = null;
let masterFlippableItems = null;

// Caching to minimize API calls across page navigations (using SessionStorage)
async function getCachedData(key, fetchFn) {
    const cached = sessionStorage.getItem(key);
    if (cached) {
        try {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < 300000) { // 5 min cache
                return data;
            }
        } catch (e) {}
    }
    const data = await fetchFn();
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
}

async function fetchMapping() {
    return fetch('https://prices.runescape.wiki/api/v1/osrs/mapping', { headers: WIKI_API_HEADERS }).then(r => r.json());
}

async function fetchLatest() {
    return fetch('https://prices.runescape.wiki/api/v1/osrs/latest', { headers: WIKI_API_HEADERS }).then(r => r.json());
}

async function fetchVolumes() {
    return fetch('https://prices.runescape.wiki/api/v1/osrs/volumes', { headers: WIKI_API_HEADERS }).then(r => r.json());
}

function nameToSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

async function initSuggestionEngine() {
    try {
        const [mapping, latest, volumes] = await Promise.all([
            getCachedData('osrs_mapping', fetchMapping),
            getCachedData('osrs_latest', fetchLatest),
            getCachedData('osrs_volumes', fetchVolumes)
        ]);

        const latestData = latest.data;
        const volumesData = volumes.data;

        // Filter and score items
        const scoredItems = mapping.map(item => {
            const priceInfo = latestData[item.id];
            const dailyVolume = volumesData[item.id];

            if (!priceInfo || !priceInfo.high || !priceInfo.low || !dailyVolume || priceInfo.low === 0) {
                return null;
            }

            let taxRate = 0.02;
            if (taxExemptIds.has(item.id) || priceInfo.high > 250000000) taxRate = 0.01;
            const geTax = Math.floor(priceInfo.high * taxRate);
            const netProfit = (priceInfo.high - priceInfo.low) - geTax;

            if (netProfit <= 0) return null;

            const flipScore = netProfit * dailyVolume;
            return { item, priceInfo, flipScore };
        }).filter(Boolean);

        scoredItems.sort((a, b) => b.flipScore - a.flipScore);
        masterFlippableItems = scoredItems;
        itemMapping = mapping;
        
        return true;
    } catch (e) {
        console.error("Failed to init suggestion engine:", e);
        return false;
    }
}

async function getSuggestion(budgetIndex) {
    if (!masterFlippableItems) {
        const ok = await initSuggestionEngine();
        if (!ok) return null;
    }

    const budget = budgetSteps[budgetIndex];
    let filtered;
    
    if (budget === Number.MAX_SAFE_INTEGER) {
        filtered = masterFlippableItems.filter(item => item.priceInfo.low > 250000000);
    } else {
        filtered = masterFlippableItems.filter(item => {
            const price = item.priceInfo.low;
            const minPrice = budget > 1000000 ? budget * 0.01 : 1;
            return price <= budget && price >= minPrice;
        });
    }

    if (filtered.length === 0) return null;

    // Pick from top 50 to ensure quality
    const pool = filtered.slice(0, 50);
    const selected = pool[Math.floor(Math.random() * pool.length)];

    return {
        id: selected.item.id,
        name: selected.item.name,
        slug: nameToSlug(selected.item.name),
        lowPrice: selected.priceInfo.low,
        highPrice: selected.priceInfo.high,
        profit: selected.flipScore / (/* approximate daily volume */ 1) // Just passing it back for UI
    };
}

window.OSRS_Suggest = {
    getSuggestion,
    budgetSteps
};
