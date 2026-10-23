#!/usr/bin/env node

// Tells Bing (and the other IndexNow search engines) which pages changed, so they recrawl them quickly.
//
//   node indexnow.js <from-commit> <to-commit>   submit pages changed between two commits
//   node indexnow.js --all                        submit every URL in sitemap.xml
//   add --dry-run to print the URLs without sending them
//
// Only URLs listed in sitemap.xml are sent (so dev.html, 404.html and test pages never are), plus
// pages that were deleted and dropped from the sitemap, so search engines see the 404 and drop them.
// It never fails the build: every problem is logged and the script exits 0.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HOST = 'osrs.lol';
const BASE_URL = `https://${HOST}`;
const KEY = '88017ae16c971a82c24452034e12292c';
const KEY_LOCATION = `${BASE_URL}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS_PER_REQUEST = 10000;

function git(...args) {
    return execFileSync('git', args, { cwd: __dirname, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function sitemapUrls(xml) {
    return new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim()).filter(u => u.startsWith(BASE_URL)));
}

// items/abyssal-whip.html -> https://osrs.lol/items/abyssal-whip, guides/index.html -> https://osrs.lol/guides/
function fileToUrl(file) {
    if (!file.endsWith('.html')) return null;
    if (file === 'index.html') return `${BASE_URL}/`;
    if (file.endsWith('/index.html')) return `${BASE_URL}/${file.slice(0, -'index.html'.length)}`;
    return `${BASE_URL}/${file.slice(0, -'.html'.length)}`;
}

function changedUrls(from, to) {
    const current = sitemapUrls(fs.readFileSync(path.join(__dirname, 'sitemap.xml'), 'utf8'));
    let previous = new Set();
    try {
        previous = sitemapUrls(git('show', `${from}:sitemap.xml`));
    } catch (e) {
        // No sitemap in the old commit; deleted pages just won't be reported
    }

    const urls = new Set();
    const lines = git('diff', '--name-status', '--no-renames', from, to).split('\n').filter(Boolean);
    for (const line of lines) {
        const [status, file] = line.split('\t');
        const url = fileToUrl(file);
        if (!url) continue;
        if (status === 'D') {
            if (previous.has(url) && !current.has(url)) urls.add(url);
        } else if (current.has(url)) {
            urls.add(url);
        }
    }
    // A brand-new page added to the sitemap without its own file changing (rare, but cheap to cover)
    for (const url of current) if (previous.size && !previous.has(url)) urls.add(url);
    return [...urls];
}

async function submit(urls) {
    for (let i = 0; i < urls.length; i += MAX_URLS_PER_REQUEST) {
        const batch = urls.slice(i, i + MAX_URLS_PER_REQUEST);
        try {
            const res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: batch })
            });
            const body = (await res.text()).slice(0, 500);
            // 200 = received, 202 = received and the key is still being checked
            if (res.status === 200 || res.status === 202) {
                console.log(`✅ IndexNow accepted ${batch.length} URLs (HTTP ${res.status})`);
            } else {
                console.warn(`⚠️ IndexNow returned HTTP ${res.status} for ${batch.length} URLs ${body}`);
            }
        } catch (err) {
            console.warn(`⚠️ IndexNow request failed: ${err.message}`);
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const refs = args.filter(a => !a.startsWith('--'));

    let urls;
    if (args.includes('--all')) {
        urls = [...sitemapUrls(fs.readFileSync(path.join(__dirname, 'sitemap.xml'), 'utf8'))];
    } else if (refs.length === 2 && !/^0+$/.test(refs[0])) {
        urls = changedUrls(refs[0], refs[1]);
    } else {
        console.log('IndexNow: usage is "node indexnow.js <from> <to>" or "node indexnow.js --all"; nothing sent');
        return;
    }

    console.log(`🔎 IndexNow: ${urls.length} changed page(s)`);
    if (!urls.length) return;
    if (dryRun) {
        console.log(urls.join('\n'));
        return;
    }
    await submit(urls);
}

main().catch(err => console.warn(`⚠️ IndexNow skipped: ${err.message}`));
