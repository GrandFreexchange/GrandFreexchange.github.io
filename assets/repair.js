// Barrows repair calculator (calculators/barrows-repair.html): the profit from buying broken armour,
// repairing it and selling it, at live GE prices. The page's data comes from build-calculators.js.
(function () {
    'use strict';

    const config = JSON.parse(document.getElementById('calc-data').textContent);
    const $ = id => document.getElementById(id);
    const byKey = new Map(config.rows.map(r => [r.key, r]));

    const levelInput = $('repair-level');
    const whereSelect = $('repair-where');
    const pricesSelect = $('repair-prices');
    const groupSelect = $('repair-group');
    const setsInput = $('repair-sets');
    const profitableInput = $('repair-profitable');
    const tbody = $('repair-body');
    let sortKey = 'profit';
    let sortDir = -1;

    function smithingLevel() {
        const value = Math.floor(Number(levelInput.value));
        if (!Number.isFinite(value) || levelInput.value === '') return 1;
        return Math.min(Math.max(value, 1), 104);
    }

    // An armour stand takes 0.5% off per Smithing level; NPCs charge the full price
    const repairCoins = (coins, s) => s.stand ? Math.round(coins * (1 - s.level / 200)) : coins;

    // ---------- Prices (OSRS Wiki real-time API) ----------
    // Plain GETs with no custom headers: a custom User-Agent makes Firefox send a CORS preflight that the Wiki rejects.

    let prices = null;
    let volumes = null;
    let pricesTime = null;
    let retryTimer = null;

    async function getJSON(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()).data;
    }

    async function loadPrices() {
        clearTimeout(retryTimer);
        try {
            prices = await getJSON('https://prices.runescape.wiki/api/v1/osrs/latest');
            pricesTime = Date.now();
            update();
        } catch (err) {
            console.error('Price fetch failed', err);
            if (!prices) setStatus('Prices unavailable right now, retrying…', true);
            retryTimer = setTimeout(loadPrices, 30000);
        }
    }

    // Volumes are extra: the table still works without them
    async function loadVolumes() {
        try {
            volumes = await getJSON('https://prices.runescape.wiki/api/v1/osrs/24h');
            update();
        } catch (err) {
            console.error('Volume fetch failed', err);
        }
    }

    // Instant: buy at the instant-buy price, sell at the instant-sell price. Patient: the other way round.
    function buyPrice(id, s) {
        const p = prices && prices[id];
        if (!p) return null;
        return (s.patient ? p.low || p.high : p.high || p.low) || null;
    }
    function sellPrice(id, s) {
        const p = prices && prices[id];
        if (!p) return null;
        return (s.patient ? p.high || p.low : p.low || p.high) || null;
    }
    function volume(id) {
        const v = volumes && volumes[id];
        return v ? (v.highPriceVolume || 0) + (v.lowPriceVolume || 0) : null;
    }

    // GE tax: 2% per item, rounded down, capped at 5m per item
    const geTax = price => Math.min(Math.floor(price * 0.02), 5000000);

    function setStatus(text, isError) {
        const status = $('calc-status');
        status.textContent = text;
        status.classList.toggle('is-error', !!isError);
    }

    // ---------- Rows ----------

    // What buying and repairing one piece costs: { buy, repair, coins, parts } (null while a price is missing)
    function pieceCost(r, s) {
        let buy = 0;
        for (const [id, qty] of r.broken) {
            const price = buyPrice(id, s);
            if (price === null) return null;
            buy += price * qty;
        }
        let repair = 0;
        const parts = [];
        if (r.coins) repair = repairCoins(r.coins, s);
        for (const [id, qty] of r.parts || []) {
            const price = buyPrice(id, s);
            if (price === null) return null;
            repair += price * qty;
            parts.push({ id, qty, price });
        }
        return { buy, repair, parts };
    }

    function row(r, s) {
        const pieces = r.set ? r.set.map(k => byKey.get(k)) : [r];
        const level = r.level || 0;
        let cost = prices ? { buy: 0, repair: 0, parts: [] } : null;
        for (const piece of pieces) {
            const c = cost && pieceCost(piece, s);
            if (!c) { cost = null; break; }
            cost.buy += c.buy;
            cost.repair += c.repair;
            c.parts.forEach(part => {
                const same = cost.parts.find(p => p.id === part.id);
                if (same) same.qty += part.qty; else cost.parts.push({ ...part });
            });
        }
        const sold = prices ? sellPrice(r.fixed, s) : null;
        const sell = sold === null ? null : sold - geTax(sold);
        const spent = cost ? cost.buy + cost.repair : null;
        const profit = spent === null || sell === null ? null : sell - spent;
        // A set's volume is its least-traded broken piece
        const vols = pieces.map(p => volume(p.broken[0][0]));
        return {
            ...r, pieces,
            buy: cost ? cost.buy : null,
            repair: cost ? cost.repair : (r.coins && !r.set ? repairCoins(r.coins, s) : null),
            parts: cost ? cost.parts : [],
            sell, profit,
            roi: profit === null || !spent ? null : profit / spent * 100,
            volume: vols.some(v => v === null) ? null : Math.min(...vols),
            locked: s.level < level
        };
    }

    // ---------- Formatting ----------

    const fmt = n => Math.round(n).toLocaleString('en-US');
    const dash = '<span class="text-muted">–</span>';
    const gp = value => value === null ? dash : fmt(value);

    function signed(value, suffix = '') {
        if (value === null) return dash;
        const cls = value >= 0 ? 'col-profit' : 'col-loss';
        const text = suffix ? value.toFixed(1) : fmt(value);
        return `<span class="${cls}">${value > 0 ? '+' : ''}${text.replace('-', '−')}${suffix}</span>`;
    }

    // Short form for the summary line: 1.2B, 34.5M, 120K
    function short(value) {
        const abs = Math.abs(value);
        if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
        if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
        if (abs >= 1e4) return `${Math.round(value / 1e3)}K`;
        return fmt(value);
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    const itemLink = (id, label) => `<a href="/items/${config.items[id].slug}">${escapeHtml(label || config.items[id].name)}</a>`;

    // Under the name: the broken piece(s) bought, each linked to its price page with its current price
    function detailLine(r, s) {
        let html;
        if (r.set) {
            html = `Buy ${r.pieces.length} broken pieces, sell as a set`;
        } else {
            html = `Buy ${itemLink(r.broken[0][0])}`;
        }
        if (r.parts && r.parts.length) {
            html += ' · ' + r.parts.map(part => `${part.qty} × ${itemLink(part.id)}${part.price ? ` <span class="calc-mat-price">${fmt(part.price)}</span>` : ''}`).join(' · ');
        }
        if (r.locked) html += ` · <span class="repair-lock">needs ${config.torvaLevel} Smithing</span>`;
        return `<div class="calc-mats">${html}</div>`;
    }

    // ---------- Render ----------

    function state() {
        return {
            level: smithingLevel(),
            stand: whereSelect.value === 'stand',
            patient: pricesSelect.value === 'patient',
            group: groupSelect.value,
            sets: setsInput.checked,
            profitable: profitableInput.checked
        };
    }

    function renderSummary(s) {
        const barrowsSet = 60000 + 90000 + 80000 + 100000;
        $('repair-summary').innerHTML = s.stand
            ? `At Smithing ${s.level}, an armour stand repairs for <strong class="text-accent">${(s.level / 2).toLocaleString('en-US')}%</strong> less than Bob: a full Barrows set costs ${fmt(repairCoins(barrowsSet, s))} instead of ${fmt(barrowsSet)}.`
            : `Bob and the other NPCs charge the full price: <strong class="text-accent">${fmt(barrowsSet)}</strong> for a full Barrows set and 1,500,000 for each moon piece. Pick the armour stand to use your Smithing discount.`;
    }

    function renderBest(list) {
        const best = $('calc-best');
        const usable = list.filter(r => !r.locked && r.profit !== null);
        if (!usable.length) { best.innerHTML = ''; return; }
        const top = usable.reduce((a, b) => (b.profit > a.profit ? b : a));
        if (top.profit <= 0) {
            best.innerHTML = 'Nothing here makes a profit at these prices right now. Try patient offers, or check back later.';
            return;
        }
        const winners = usable.filter(r => r.profit > 0 && !r.set);
        best.innerHTML = `Best right now: <strong>${escapeHtml(top.name)}</strong> for <span class="col-profit">+${short(top.profit)}</span> each.`
            + (winners.length > 1 ? ` ${winners.length} single pieces make a profit.` : '');
    }

    function renderTable() {
        const s = state();
        renderSummary(s);
        let list = config.rows.map(r => row(r, s))
            .filter(r => s.group === 'all' || r.group === s.group)
            .filter(r => s.sets || !r.set);
        renderBest(list);
        if (s.profitable && prices) list = list.filter(r => r.profit !== null && r.profit > 0);

        const order = new Map(config.rows.map((r, i) => [r.key, i]));
        list.sort((a, b) => {
            if (sortKey === 'name') return order.get(a.key) - order.get(b.key);
            // Locked rows (Torva under 90 Smithing) go last
            if (a.locked !== b.locked) return a.locked ? 1 : -1;
            const va = a[sortKey], vb = b[sortKey];
            if (va === null && vb === null) return order.get(a.key) - order.get(b.key);
            if (va === null) return 1;
            if (vb === null) return -1;
            return (va - vb) * sortDir || order.get(a.key) - order.get(b.key);
        });

        tbody.innerHTML = list.length ? list.map(r => `
        <tr class="${r.set ? 'is-set' : ''}${r.locked ? ' is-locked' : ''}">
            <td><div class="calc-item"><img src="https://tiles.runescape.wiki/static/public/images/osrs/items/${r.fixed}.png" alt="" width="24" height="24" loading="lazy"><div>${itemLink(r.fixed, r.name)}${detailLine(r, s)}</div></div></td>
            <td class="text-right">${gp(r.buy)}</td>
            <td class="text-right">${gp(r.repair)}</td>
            <td class="text-right">${gp(r.sell)}</td>
            <td class="text-right col-cost">${signed(r.profit)}</td>
            <td class="text-right">${signed(r.roi, '%')}</td>
            <td class="text-right">${r.volume === null ? dash : fmt(r.volume)}</td>
        </tr>`).join('') : `<tr class="calc-empty"><td colspan="7">Nothing makes a profit at these prices right now. Untick "Only show a profit" to see everything.</td></tr>`;

        document.querySelectorAll('.repair-table th[data-sort]').forEach(th => {
            const active = th.dataset.sort === sortKey;
            th.setAttribute('aria-sort', active ? (sortDir === 1 ? 'ascending' : 'descending') : 'none');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.remove();
            if (active && sortKey !== 'name') th.insertAdjacentHTML('beforeend', `<span class="sort-icon" aria-hidden="true">${sortDir === 1 ? '▲' : '▼'}</span>`);
        });
    }

    function update() {
        renderTable();
        if (prices) {
            const minutes = Math.round((Date.now() - pricesTime) / 60000);
            setStatus(`Live GE prices, updated ${minutes < 1 ? 'just now' : `${minutes} min ago`}.`);
        }
    }

    document.querySelectorAll('.repair-table th[data-sort]').forEach(th => {
        if (th.dataset.sort === 'name') return;
        const sort = () => {
            if (sortKey === th.dataset.sort) sortDir = -sortDir;
            else { sortKey = th.dataset.sort; sortDir = ['buy', 'repair'].includes(sortKey) ? 1 : -1; }
            update();
        };
        th.addEventListener('click', sort);
        th.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sort(); }
        });
    });
    levelInput.addEventListener('input', update);
    levelInput.addEventListener('change', () => { if (levelInput.value !== '') levelInput.value = smithingLevel(); update(); });
    [whereSelect, pricesSelect, groupSelect, setsInput, profitableInput].forEach(el => el.addEventListener('change', update));

    loadPrices();
    loadVolumes();
    // Refresh prices every 5 minutes (volumes every hour) while the tab is visible
    setInterval(() => { if (!document.hidden) loadPrices(); }, 300000);
    setInterval(() => { if (!document.hidden) loadVolumes(); }, 3600000);

    update();
})();
