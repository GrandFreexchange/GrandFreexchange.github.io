/* Tile marker pages (/tile-markers/). One file for both sides:
   - build-tile-markers.js requires it in Node to draw the tile maps into the HTML at build time;
   - the browser runs it to redraw the map (other area / floor / colour), copy and download the JSON,
     filter the pack list, and preview markers a visitor pastes in.
   Marker JSON is the RuneLite Ground Markers format: [{regionId, regionX, regionY, z, color, label}]. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.OsrsTiles = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ---------- Data helpers ----------

    // RuneLite writes colours as #AARRGGBB. Old exports wrote Java's Color object ({value: signed ARGB int}).
    function normaliseColor(color) {
        if (color && typeof color === 'object' && typeof color.value === 'number') {
            return '#' + (color.value >>> 0).toString(16).toUpperCase().padStart(8, '0');
        }
        if (typeof color === 'string') {
            const hex = color.trim().replace(/^#/, '').toUpperCase();
            if (/^[0-9A-F]{8}$/.test(hex)) return '#' + hex;
            if (/^[0-9A-F]{6}$/.test(hex)) return '#FF' + hex;
        }
        return null;
    }

    // A clean copy of one marker, or null if it isn't one
    function cleanTile(t) {
        if (!t || typeof t !== 'object') return null;
        const n = k => (typeof t[k] === 'number' && Number.isInteger(t[k]) ? t[k] : null);
        const regionId = n('regionId'), regionX = n('regionX'), regionY = n('regionY');
        const z = t.z === undefined ? 0 : n('z');
        if (regionId === null || regionX === null || regionY === null || z === null) return null;
        if (regionX < 0 || regionX > 63 || regionY < 0 || regionY > 63 || z < 0 || z > 3) return null;
        const out = { regionId, regionX, regionY, z };
        const color = normaliseColor(t.color);
        if (color) out.color = color;
        if (typeof t.label === 'string' && t.label.trim()) out.label = t.label.trim();
        return out;
    }

    // Accepts what people paste: a marker array, {tiles: [...]}, or one marker on its own
    function parseMarkers(text) {
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            return { error: "That isn't valid JSON. Paste the text RuneLite copies when you choose Export on the world map orb." };
        }
        if (data && !Array.isArray(data) && Array.isArray(data.tiles)) data = data.tiles;
        if (data && !Array.isArray(data) && typeof data === 'object') data = [data];
        if (!Array.isArray(data)) return { error: 'Expected a list of ground markers.' };
        const tiles = [];
        let skipped = 0;
        for (const t of data) {
            const c = cleanTile(t);
            if (c) tiles.push(c); else skipped++;
        }
        if (!tiles.length) return { error: 'No ground markers found. Each marker needs regionId, regionX, regionY and z.' };
        return { tiles, skipped };
    }

    // Region 12850 starts at world x = (12850 >> 8) * 64, y = (12850 & 255) * 64
    function worldOf(t) {
        return { x: (t.regionId >> 8) * 64 + t.regionX, y: (t.regionId & 255) * 64 + t.regionY };
    }

    // Splits markers into separate drawings: one per floor, and one per group of tiles that sit
    // near each other, so a pack spread over a whole raid still shows readable tiles.
    const NEAR = 24;
    function areas(tiles) {
        const points = tiles.map(t => Object.assign({ t }, worldOf(t)));
        const parent = points.map((_, i) => i);
        const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const a = points[i], b = points[j];
                if (a.t.z === b.t.z && Math.abs(a.x - b.x) <= NEAR && Math.abs(a.y - b.y) <= NEAR) {
                    parent[find(i)] = find(j);
                }
            }
        }
        const groups = new Map();
        points.forEach((p, i) => {
            const k = find(i);
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k).push(p);
        });
        const list = [...groups.values()].map(points => {
            const xs = points.map(p => p.x), ys = points.map(p => p.y);
            return {
                z: points[0].t.z,
                points,
                minX: Math.min(...xs), maxX: Math.max(...xs),
                minY: Math.min(...ys), maxY: Math.max(...ys)
            };
        });
        // Floors in order, then west to east, north to south within a floor
        list.sort((a, b) => a.z - b.z || a.minX - b.minX || b.maxY - a.maxY);
        return list;
    }

    // ---------- Drawing ----------

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Like the plugin: the outline uses the marker's own alpha, the fill is a light wash of the colour
    function rgba(argb, fillAlpha) {
        const hex = argb.slice(1);
        const a = parseInt(hex.slice(0, 2), 16) / 255;
        const r = parseInt(hex.slice(2, 4), 16), g = parseInt(hex.slice(4, 6), 16), b = parseInt(hex.slice(6, 8), 16);
        return {
            fill: `rgba(${r},${g},${b},${fillAlpha.toFixed(2)})`,
            line: `rgba(${r},${g},${b},${Math.max(a, 0.8).toFixed(2)})`,
            solid: `rgb(${r},${g},${b})`,
            clear: a < 0.05
        };
    }

    // An SVG of one area, north up. Tiles use their own colour (RuneLite's default yellow if none),
    // drawn like the plugin: a solid outline with a lighter fill.
    function areaSvg(area, opts) {
        opts = opts || {};
        const pad = opts.pad === undefined ? 2 : opts.pad;
        // Small groups get extra floor around them so the map doesn't zoom in on two tiles
        const minSpan = opts.pad === undefined ? 14 : 0;
        const padX = Math.max(pad, Math.ceil((minSpan - (area.maxX - area.minX + 1)) / 2));
        const padY = Math.max(pad, Math.ceil((minSpan * 0.6 - (area.maxY - area.minY + 1)) / 2));
        const cols = area.maxX - area.minX + 1 + padX * 2;
        const rows = area.maxY - area.minY + 1 + padY * 2;
        // Labelled maps keep tiles big enough to read, and scroll on small screens instead
        const minCell = opts.labels !== false && area.points.some(p => p.t.label) ? 20 : 10;
        const cell = opts.cell || Math.max(minCell, Math.min(28, Math.floor((opts.width || 640) / Math.max(cols, rows * 1.4))));
        const w = cols * cell, h = rows * cell;
        const showLabels = opts.labels !== false;
        const recolor = opts.color ? normaliseColor(opts.color) : null;
        const parts = [];
        parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="tile-svg" role="img" aria-label="${esc(opts.title || 'Tile marker layout')}">`);
        parts.push(`<rect width="${w}" height="${h}" class="tile-bg"/>`);
        // Grid: a line on every tile edge, with a stronger line every 8 tiles of world position
        let grid = '', grid8 = '';
        for (let c = 0; c <= cols; c++) {
            const wx = area.minX - padX + c;
            (wx % 8 === 0 ? (s => { grid8 += s; }) : (s => { grid += s; }))(`M${c * cell} 0V${h}`);
        }
        for (let r = 0; r <= rows; r++) {
            const wy = area.maxY + padY + 1 - r;
            (wy % 8 === 0 ? (s => { grid8 += s; }) : (s => { grid += s; }))(`M0 ${r * cell}H${w}`);
        }
        parts.push(`<path d="${grid}" class="tile-grid"/><path d="${grid8}" class="tile-grid-strong"/>`);
        const labels = [];
        for (const p of area.points) {
            const x = (p.x - area.minX + padX) * cell;
            const y = (area.maxY + padY - p.y) * cell;
            let color = p.t.color || '#FFFFFF00';
            if (recolor) color = recolor;
            const c = rgba(color, 0.3);
            if (c.clear) {
                parts.push(`<rect x="${x + 1.5}" y="${y + 1.5}" width="${cell - 3}" height="${cell - 3}" fill="none" stroke="${c.line}" stroke-width="1.5" stroke-dasharray="3 2"/>`);
            } else {
                parts.push(`<rect x="${x + 1}" y="${y + 1}" width="${cell - 2}" height="${cell - 2}" fill="${c.fill}" stroke="${c.line}" stroke-width="2"/>`);
            }
            if (showLabels && p.t.label) labels.push({ x, y, text: p.t.label });
        }
        // Labels sit above the tiles; long ones are cut short here and listed in full under the map
        const fs = Math.max(9, Math.min(13, cell * 0.42));
        for (const l of labels) {
            const text = l.text.length > 14 ? l.text.slice(0, 12) + '…' : l.text;
            parts.push(`<text x="${l.x + cell / 2}" y="${l.y + cell / 2}" font-size="${fs.toFixed(1)}" class="tile-label" text-anchor="middle" dominant-baseline="central">${esc(text)}</text>`);
        }
        // North marker
        parts.push(`<g class="tile-north" transform="translate(${w - 18} 6)"><path d="M6 0L12 12H0Z"/><text x="6" y="24" text-anchor="middle" font-size="10">N</text></g>`);
        parts.push('</svg>');
        return parts.join('');
    }

    function areaName(area, index, all) {
        const floors = new Set(all.map(a => a.z)).size > 1;
        const sameFloor = all.filter(a => a.z === area.z);
        const bits = [];
        if (sameFloor.length > 1 || !floors) bits.push(all.length > 1 ? `Area ${index + 1}` : 'Area');
        if (floors) bits.push(`floor ${area.z}`);
        return bits.join(', ').replace(/^f/, 'F');
    }

    // Copy text in the JSON RuneLite expects (compact, no extra fields)
    function exportJson(tiles, opts) {
        opts = opts || {};
        const recolor = opts.color ? normaliseColor(opts.color) : null;
        const out = tiles.map(t => {
            const o = { regionId: t.regionId, regionX: t.regionX, regionY: t.regionY, z: t.z };
            if (recolor || t.color) o.color = recolor || t.color;
            if (t.label) o.label = t.label;
            return o;
        });
        return opts.pretty ? JSON.stringify(out, null, 2) : JSON.stringify(out);
    }

    const api = { normaliseColor, cleanTile, parseMarkers, worldOf, areas, areaSvg, areaName, exportJson };
    if (typeof document === 'undefined') return api;

    // ---------- Browser ----------

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (e) {
            const area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', '');
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
            area.remove();
            return ok;
        }
    }

    function flash(button, text) {
        if (!button.dataset.label) button.dataset.label = button.textContent;
        button.textContent = text;
        clearTimeout(button._t);
        button._t = setTimeout(() => { button.textContent = button.dataset.label; }, 1800);
    }

    function download(name, text) {
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // A map viewer: area buttons, the drawing, and the label list under it
    function viewer(root, tiles, state) {
        const list = areas(tiles);
        const picker = root.querySelector('[data-area-picker]');
        const map = root.querySelector('[data-map]');
        const legend = root.querySelector('[data-legend]');
        let current = 0;
        function draw() {
            const area = list[current];
            map.innerHTML = areaSvg(area, { width: Math.max(320, map.clientWidth || 640), color: state.color, title: state.title });
            if (legend) {
                const named = area.points.filter(p => p.t.label).sort((a, b) => a.t.label.localeCompare(b.t.label, undefined, { numeric: true }));
                legend.innerHTML = named.length
                    ? '<h3 class="tile-h3">Labels on this map</h3><ul class="tile-legend">' + named.map(p => {
                        const color = state.color ? normaliseColor(state.color) : (p.t.color || '#FFFFFF00');
                        return `<li><span class="tile-swatch" style="background:${rgba(color, 0.35).fill};border-color:${rgba(color, 0).solid}"></span>${esc(p.t.label)}</li>`;
                    }).join('') + '</ul>'
                    : '';
            }
            if (picker) picker.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === current)));
        }
        if (picker) {
            if (list.length > 1) {
                picker.innerHTML = list.map((a, i) => `<button type="button" aria-pressed="false">${esc(areaName(a, i, list))} <span class="tile-count">${a.points.length}</span></button>`).join('');
                picker.hidden = false;
                picker.querySelectorAll('button').forEach((b, i) => b.addEventListener('click', () => { current = i; draw(); }));
            } else {
                picker.innerHTML = '';
                picker.hidden = true;
            }
        }
        draw();
        let lastWidth = map.clientWidth;
        window.addEventListener('resize', () => {
            if (Math.abs(map.clientWidth - lastWidth) > 40) { lastWidth = map.clientWidth; draw(); }
        });
        return { redraw: draw };
    }

    // Pack page: copy, download, colour, JSON block
    function packPage(data) {
        const root = document.querySelector('[data-pack]');
        const state = { color: null, title: data.name + ' tile markers' };
        const view = viewer(root, data.tiles, state);
        const jsonBox = document.getElementById('pack-json');
        const pretty = document.getElementById('pack-pretty');
        const colorToggle = document.getElementById('pack-recolor');
        const colorInput = document.getElementById('pack-color');
        const text = () => exportJson(data.tiles, { color: state.color });
        function refreshJson() {
            jsonBox.textContent = exportJson(data.tiles, { color: state.color, pretty: pretty.checked });
        }
        function applyColor() {
            colorInput.disabled = !colorToggle.checked;
            state.color = colorToggle.checked ? colorInput.value : null;
            view.redraw();
            refreshJson();
        }
        colorToggle.addEventListener('change', applyColor);
        colorInput.addEventListener('input', applyColor);
        pretty.addEventListener('change', refreshJson);
        document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
            flash(btn, (await copyText(text())) ? `Copied ${data.tiles.length} tiles` : 'Copy failed: select the JSON below');
        }));
        document.getElementById('pack-download').addEventListener('click', () => download(data.slug + '-tile-markers.json', text()));
        applyColor();
    }

    // Hub page: search and category filter, plus the paste-your-own preview
    function hubPage() {
        const cards = [...document.querySelectorAll('[data-pack-card]')];
        const search = document.getElementById('pack-search');
        const filters = [...document.querySelectorAll('[data-filter]')];
        const count = document.getElementById('pack-count');
        const empty = document.getElementById('pack-empty');
        let category = 'all';
        function apply() {
            const q = search.value.trim().toLowerCase();
            let shown = 0;
            for (const card of cards) {
                const ok = (category === 'all' || card.dataset.category === category) && (!q || card.dataset.search.includes(q));
                card.hidden = !ok;
                if (ok) shown++;
            }
            count.textContent = `${shown} tile pack${shown === 1 ? '' : 's'}`;
            empty.hidden = shown > 0;
        }
        filters.forEach(btn => btn.addEventListener('click', () => {
            category = btn.dataset.filter;
            filters.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
            apply();
        }));
        search.addEventListener('input', apply);
        const params = new URLSearchParams(location.search);
        if (params.get('q')) search.value = params.get('q');
        const start = filters.find(b => b.dataset.filter === params.get('category'));
        if (start) {
            category = start.dataset.filter;
            filters.forEach(b => b.setAttribute('aria-pressed', String(b === start)));
        }
        apply();

        // Paste your own
        const box = document.getElementById('own-json');
        const out = document.getElementById('own-result');
        const msg = document.getElementById('own-message');
        const copyBtn = document.getElementById('own-copy');
        let parsed = null;
        document.getElementById('own-preview').addEventListener('click', () => {
            const result = parseMarkers(box.value);
            if (result.error) {
                parsed = null;
                out.hidden = true;
                msg.textContent = result.error;
                msg.className = 'tile-message text-loss';
                return;
            }
            parsed = result.tiles;
            const list = areas(parsed);
            msg.textContent = `${parsed.length} tile${parsed.length === 1 ? '' : 's'} in ${list.length} area${list.length === 1 ? '' : 's'}` + (result.skipped ? `. Skipped ${result.skipped} entr${result.skipped === 1 ? 'y' : 'ies'} that weren't markers.` : '.');
            msg.className = 'tile-message text-secondary';
            out.hidden = false;
            viewer(out, parsed, { color: null, title: 'Your tile markers' });
        });
        copyBtn.addEventListener('click', async () => {
            if (!parsed) return;
            flash(copyBtn, (await copyText(exportJson(parsed))) ? 'Copied' : 'Copy failed');
        });
    }

    function start() {
        const packData = document.getElementById('pack-data');
        if (packData) packPage(JSON.parse(packData.textContent));
        if (document.getElementById('pack-search')) hubPage();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();

    return api;
});
