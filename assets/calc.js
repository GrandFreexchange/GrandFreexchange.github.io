// Skill calculators (calculators/*.html): XP to a target level, and the count and cost of each
// training method at live GE prices. The page's data comes from build-calculators.js.
(function () {
    'use strict';

    const config = JSON.parse(document.getElementById('calc-data').textContent);
    const $ = id => document.getElementById(id);

    // XP needed for each level, 1 to 99 (OSRS formula)
    const XP_TABLE = [0, 0];
    for (let level = 2, points = 0; level <= 99; level++) {
        points += Math.floor(level - 1 + 300 * Math.pow(2, (level - 1) / 7));
        XP_TABLE[level] = Math.floor(points / 4);
    }
    const MAX_XP = 200000000;

    function levelForXp(xp) {
        let level = 1;
        while (level < 99 && XP_TABLE[level + 1] <= xp) level++;
        return level;
    }

    const fields = {
        curLevel: $('cur-level'), curXp: $('cur-xp'),
        targetLevel: $('target-level'), targetXp: $('target-xp')
    };

    function readInt(input, min, max) {
        const value = Math.floor(Number(input.value));
        if (!Number.isFinite(value) || input.value === '') return null;
        return Math.min(Math.max(value, min), max);
    }

    // Typing a level fills in its XP, typing XP fills in the level
    function linkFields(levelInput, xpInput) {
        levelInput.addEventListener('input', () => {
            const level = readInt(levelInput, 1, 99);
            if (level !== null) xpInput.value = XP_TABLE[level];
            update();
        });
        xpInput.addEventListener('input', () => {
            const xp = readInt(xpInput, 0, MAX_XP);
            if (xp !== null) levelInput.value = levelForXp(xp);
            update();
        });
        // Put out-of-range numbers back in range once the visitor leaves the field
        [levelInput, xpInput].forEach(input => input.addEventListener('change', () => {
            const isLevel = input === levelInput;
            const value = readInt(input, isLevel ? 1 : 0, isLevel ? 99 : MAX_XP);
            if (value !== null) input.value = value;
        }));
    }
    linkFields(fields.curLevel, fields.curXp);
    linkFields(fields.targetLevel, fields.targetXp);

    function state() {
        const curXp = readInt(fields.curXp, 0, MAX_XP) ?? 0;
        const targetXp = readInt(fields.targetXp, 0, MAX_XP) ?? 0;
        return { curXp, targetXp, curLevel: levelForXp(curXp), targetLevel: levelForXp(targetXp), xpLeft: Math.max(targetXp - curXp, 0) };
    }

    const fmt = n => Math.round(n).toLocaleString('en-US');

    function renderSummary(s) {
        const summary = $('calc-summary');
        if (s.targetXp <= s.curXp) {
            summary.innerHTML = 'Your target is at or below your current XP. Raise the target level or XP.';
            return;
        }
        const goal = s.targetXp === XP_TABLE[s.targetLevel] ? `level ${s.targetLevel}` : `${fmt(s.targetXp)} XP`;
        summary.innerHTML = `You need <strong class="text-accent">${fmt(s.xpLeft)} XP</strong> to go from level ${s.curLevel} to ${goal}.`;
    }

    // ---------- Prices (OSRS Wiki real-time API) ----------
    // A plain GET with no custom headers: a custom User-Agent makes Firefox send a CORS preflight that the Wiki rejects.

    let prices = null;
    let pricesTime = null;
    let retryTimer = null;

    async function loadPrices() {
        clearTimeout(retryTimer);
        try {
            const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/latest');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            prices = json.data;
            pricesTime = Date.now();
            update();
        } catch (err) {
            console.error('Price fetch failed', err);
            if (!prices) setStatus('Prices unavailable right now, retrying…', true);
            retryTimer = setTimeout(loadPrices, 30000);
        }
    }

    // Buying costs the latest instant-buy price; selling earns the latest instant-sell price
    const buyPrice = id => prices && prices[id] ? (prices[id].high || prices[id].low || null) : null;
    const sellPrice = id => prices && prices[id] ? (prices[id].low || prices[id].high || null) : null;

    // GE tax: 2% per item, rounded down, capped at 5m per item
    const geTax = price => Math.min(Math.floor(price * 0.02), 5000000);

    function setStatus(text, isError) {
        const status = $('calc-status');
        if (!status) return;
        status.textContent = text;
        status.classList.toggle('is-error', !!isError);
    }

    // ---------- Table ----------

    const methodSelect = $('calc-method');
    const bonusInput = $('calc-bonus');
    const sellInput = $('calc-sell');
    const tbody = $('calc-body');
    let sortKey = 'level';
    let sortDir = 1;

    function currentMethod() {
        if (!config.methods || !config.methods.length) return { mult: 1 };
        return config.methods.find(m => m.id === (methodSelect && methodSelect.value)) || config.methods[0];
    }

    // Profit (positive) or cost (negative) of one action, or null while a price is missing
    function profitEach(action, method) {
        const keep = 1 - (method.save || 0);
        let total = 0;
        for (const [id, qty] of action.inputs) {
            const swap = method.swap && method.swap[id];
            const price = swap ? buyPrice(swap[0]) : buyPrice(id);
            if (price === null) return null;
            total -= (price + (swap ? swap[1] : 0)) * qty * keep;
        }
        if (!config.sell || !sellInput || sellInput.checked) {
            for (const [id, qty] of action.outputs) {
                const price = sellPrice(id);
                if (price === null) return null;
                total += (price - geTax(price)) * qty;
            }
        }
        return total;
    }

    function rows(s) {
        const method = currentMethod();
        const mult = method.mult * (bonusInput && bonusInput.checked ? config.bonus.mult : 1);
        return config.actions
            .filter(a => !method.kinds || method.kinds.includes(a.kind))
            .map(a => {
                const xp = a.xp * mult;
                const count = Math.ceil(s.xpLeft / xp);
                const each = prices ? profitEach(a, method) : null;
                return {
                    ...a, xpEach: xp, count, each,
                    total: each === null ? null : each * count,
                    gpxp: each === null ? null : each / xp,
                    locked: a.level > s.curLevel
                };
            });
    }

    function money(value, decimals) {
        if (value === null) return '<span class="text-muted">–</span>';
        const cls = value >= 0 ? 'col-profit' : 'col-loss';
        const text = decimals
            ? value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
            : fmt(value);
        return `<span class="${cls}">${value > 0 ? '+' : ''}${text.replace('-', '−')}</span>`;
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function renderTable(s) {
        const list = rows(s);
        const value = r => sortKey === 'xp' ? r.xpEach : r[sortKey];
        list.sort((a, b) => {
            const va = value(a), vb = value(b);
            if (va === null && vb === null) return a.level - b.level;
            if (va === null) return 1;
            if (vb === null) return -1;
            return (va - vb) * sortDir || a.level - b.level || a.xp - b.xp;
        });
        tbody.innerHTML = list.map(r => `
            <tr class="${r.locked ? 'is-locked' : ''}">
                <td class="calc-item"><img src="https://tiles.runescape.wiki/static/public/images/osrs/items/${r.icon}.png" alt="" width="24" height="24" loading="lazy"><a href="/items/${r.slug}">${escapeHtml(r.name)}</a></td>
                <td class="text-right">${r.level}</td>
                <td class="text-right">${Number(r.xpEach.toFixed(2)).toLocaleString('en-US')}</td>
                <td class="text-right col-count">${s.xpLeft ? fmt(r.count) : '0'}</td>
                <td class="text-right">${money(r.each)}</td>
                <td class="text-right">${money(r.total)}</td>
                <td class="text-right">${money(r.gpxp, 2)}</td>
            </tr>`).join('');

        document.querySelectorAll('.calc-table th[data-sort]').forEach(th => {
            const active = th.dataset.sort === sortKey;
            th.setAttribute('aria-sort', active ? (sortDir === 1 ? 'ascending' : 'descending') : 'none');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.remove();
            if (active) th.insertAdjacentHTML('beforeend', `<span class="sort-icon" aria-hidden="true">${sortDir === 1 ? '▲' : '▼'}</span>`);
        });
    }

    function update() {
        const s = state();
        renderSummary(s);
        if (!tbody) return;
        renderTable(s);
        if (prices) {
            const minutes = Math.round((Date.now() - pricesTime) / 60000);
            setStatus(`Live GE prices, updated ${minutes < 1 ? 'just now' : `${minutes} min ago`}.`);
        }
    }

    if (tbody) {
        document.querySelectorAll('.calc-table th[data-sort]').forEach(th => {
            if (th.dataset.sort === 'name') return;
            const sort = () => {
                if (sortKey === th.dataset.sort) sortDir = -sortDir;
                else { sortKey = th.dataset.sort; sortDir = th.dataset.sort === 'level' ? 1 : -1; }
                update();
            };
            th.addEventListener('click', sort);
            th.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sort(); }
            });
        });
        [methodSelect, bonusInput, sellInput].forEach(el => el && el.addEventListener('change', update));

        loadPrices();
        // Refresh prices every 5 minutes while the tab is visible
        setInterval(() => { if (!document.hidden) loadPrices(); }, 300000);
    }

    update();
})();
