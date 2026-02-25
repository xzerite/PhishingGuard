// ── Config ────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000';

// ── DOM ───────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const urlInput = $('urlInput');
const scanBtn = $('scanBtn');
const loadingEl = $('loading');
const loadingPhase = $('loadingPhase');
const loadingUrl = $('loadingUrl');
const resultsEl = $('results');
const errorBanner = $('errorBanner');
const offlineBanner = $('offlineBanner');

// ── Utilities ─────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function animateNum(el, to, dur = 950, suffix = '') {
    const start = performance.now(), from = parseInt(el.textContent) || 0;
    (function tick(now) {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = Math.round(from + (to - from) * easeOutCubic(p)) + suffix;
        if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
}

// Gauge: r=56, circumference=351.9, travel arc = 270/360 * 351.9 = 263.9
function scoreToOffset(score, circ = 351.9, travel = 263.9) {
    return circ - (clamp(score, 0, 100) / 100) * travel;
}

function scoreColour(score) {
    if (score >= 50) return 'var(--red)';
    if (score >= 25) return 'var(--yellow)';
    return 'var(--green)';
}

function verdict(isPhishing, score) {
    if (isPhishing || score >= 50) return {
        cls: 'danger', icon: '⛔',
        chip: 'PHISHING DETECTED',
        headline: 'Danger — Do Not Proceed',
        desc: 'This URL exhibits strong phishing indicators. Visiting this site may result in credential theft, malware installation, or financial fraud.'
    };
    if (score >= 25) return {
        cls: 'warning', icon: '⚠️',
        chip: 'SUSPICIOUS',
        headline: 'Warning — Exercise Caution',
        desc: 'Suspicious signals were detected. This URL may be safe, but some characteristics match patterns commonly used in phishing campaigns.'
    };
    return {
        cls: 'safe', icon: '✅',
        chip: 'SAFE',
        headline: 'Safe — No Threats Detected',
        desc: 'This URL passed all seven detection layers including domain intelligence, entropy analysis, protocol checks, and the AI scoring model.'
    };
}

function reasonIcon(r) {
    const t = r.toLowerCase();
    if (t.includes('ip address')) return { i: '🖥', label: 'IP Address URL' };
    if (t.includes('https') || t.includes('http')) return { i: '🔓', label: 'Insecure Connection' };
    if (t.includes('similar') || t.includes('typo')) return { i: '🎭', label: 'Brand Impersonation' };
    if (t.includes('long')) return { i: '📏', label: 'Abnormal Length' };
    if (t.includes('@')) return { i: '📧', label: 'Suspicious Symbol' };
    if (t.includes('subdomain')) return { i: '🌐', label: 'Subdomain Abuse' };
    if (t.includes('random') || t.includes('entropy')) return { i: '🎲', label: 'High Entropy Domain' };
    if (t.includes('ai') || t.includes('model')) return { i: '🤖', label: 'AI Model Flag' };
    return { i: '⚑', label: 'Threat Signal' };
}

function threatScore(r) {
    const t = r.toLowerCase();
    if (t.includes('similar')) return '+50';
    if (t.includes('ip address')) return '+30';
    if (t.includes('@')) return '+20';
    if (t.includes('https')) return '+20';
    if (t.includes('subdomain')) return '+15';
    if (t.includes('entropy') || t.includes('random')) return '+15';
    if (t.includes('long')) return '+10';
    if (t.includes('ai') || t.includes('model')) return 'AI';
    return '+?';
}

// All possible checks
function buildCheckRows(data) {
    const { risk_score, reasons } = data;
    const r = reasons.map(x => x.toLowerCase()).join(' ');

    const checks = [
        { icon: '🖥', label: 'IP Address Domain', pass: !r.includes('ip address') },
        { icon: '🔒', label: 'HTTPS / TLS', pass: !r.includes('http') },
        { icon: '🎭', label: 'Typosquatting', pass: !r.includes('similar') },
        { icon: '📏', label: 'URL Length', pass: !r.includes('long') },
        { icon: '📧', label: 'Suspicious Symbols', pass: !r.includes('@') },
        { icon: '🌐', label: 'Subdomain Structure', pass: !r.includes('subdomain') },
        { icon: '🎲', label: 'Domain Entropy', pass: !r.includes('random') },
    ];

    const container = $('checkRows');
    container.innerHTML = '';
    checks.forEach((c, i) => {
        const row = document.createElement('div');
        row.className = 'check-row';
        row.style.animationDelay = `${i * 60}ms`;
        const statusClass = c.pass ? 'cs-pass' : 'cs-fail';
        const statusText = c.pass ? 'PASS' : 'FAIL';
        row.innerHTML = `
      <div class="check-name">
        <span class="check-ico">${c.icon}</span>${c.label}
      </div>
      <span class="check-status ${statusClass}">${statusText}</span>
    `;
        container.appendChild(row);
    });
}

function buildThreats(reasons) {
    const list = $('threatsList');
    list.innerHTML = '';
    reasons.forEach((r, i) => {
        const { i: icon, label } = reasonIcon(r);
        const score = threatScore(r);
        const item = document.createElement('div');
        item.className = 'threat-item';
        item.style.animationDelay = `${i * 90}ms`;
        item.innerHTML = `
      <div class="threat-ico">${icon}</div>
      <div class="threat-body">
        <div class="threat-title">${label}</div>
        <div class="threat-desc">${r}</div>
      </div>
      <span class="threat-score-badge">${score}</span>
    `;
        list.appendChild(item);
    });
}

// ── Render ────────────────────────────────────────────────────
function renderResults(data, url, elapsed) {
    const { is_phishing, risk_score, reasons } = data;
    const score = clamp(risk_score, 0, 100);
    const v = verdict(is_phishing, score);

    // URL banner
    $('resUrl').textContent = url;
    $('resTime').textContent = elapsed ? `${elapsed}ms` : '— ms';

    // Verdict card
    $('verdictCard').className = `verdict-card ${v.cls}`;
    $('verdictIcon').textContent = v.icon;
    const chip = $('verdictChip');
    chip.className = `verdict-chip ${v.cls}`;
    chip.textContent = v.chip;
    $('verdictHeadline').textContent = v.headline;
    $('verdictDesc').textContent = v.desc;

    // Verdict meta
    $('vmScore').textContent = score;
    $('vmFlags').textContent = reasons ? reasons.length : 0;
    $('vmTime').textContent = elapsed ? `${elapsed}ms` : '—';

    // Gauge
    const fill = $('gaugeFill');
    fill.style.stroke = scoreColour(score);
    fill.style.strokeDashoffset = scoreToOffset(score);
    animateNum($('gaugeNum'), score);
    $('gaugeLabel').textContent = v.chip;
    $('gaugeLabel').style.color = score >= 50 ? 'var(--red)' : score >= 25 ? 'var(--yellow)' : 'var(--green)';

    // Stats row
    animateNum($('ssScore'), score);
    $('ssFlags').textContent = reasons ? reasons.length : 0;
    $('ssChecks').textContent = 7;
    $('ssVerdict').textContent = is_phishing ? '⛔' : score >= 25 ? '⚠️' : '✅';

    // Check breakdown
    buildCheckRows(data);

    // Threats vs clean
    if (reasons && reasons.length > 0) {
        $('threatsCard').style.display = 'block';
        $('cleanCard').style.display = 'none';
        buildThreats(reasons);
    } else {
        $('threatsCard').style.display = 'none';
        $('cleanCard').style.display = 'block';
    }

    resultsEl.style.display = 'block';
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Loading phrases ───────────────────────────────────────────
const phases = [
    'Parsing URL structure…',
    'Checking domain intelligence…',
    'Running typosquatting analysis…',
    'Evaluating heuristic rules…',
    'Computing domain entropy…',
    'Querying ML scoring model…',
    'Compiling verdict…'
];
let phaseTimer = null, phaseIdx = 0;

function startPhases(url) {
    phaseIdx = 0;
    loadingPhase.textContent = phases[0];
    loadingUrl.textContent = url.length > 60 ? url.slice(0, 60) + '…' : url;
    phaseTimer = setInterval(() => {
        phaseIdx = Math.min(phaseIdx + 1, phases.length - 1);
        loadingPhase.textContent = phases[phaseIdx];
    }, 650);
}
function stopPhases() { clearInterval(phaseTimer); }

// ── Client-side demo analyser ─────────────────────────────────
function demoAnalyse(url) {
    const reasons = [];
    let score = 0;
    let parsed;
    try { parsed = new URL(url); } catch { return { is_phishing: false, risk_score: 0, reasons: [] }; }

    const domain = parsed.hostname.toLowerCase();
    const full = url.toLowerCase();

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) {
        score += 30; reasons.push('URL uses an IP address instead of a domain name.');
    }
    if (url.length > 75) {
        score += 10; reasons.push('URL is unusually long.');
    }
    if (full.includes('@')) {
        score += 20; reasons.push("URL contains '@' symbol, often used to hide the real domain.");
    }
    if ((domain.match(/\./g) || []).length > 3) {
        score += 15; reasons.push('Excessive subdomains detected.');
    }
    if (parsed.protocol !== 'https:') {
        score += 20; reasons.push('Connection is not secure (HTTP instead of HTTPS).');
    }

    const brands = [
        'google', 'facebook', 'amazon', 'apple', 'microsoft', 'paypal',
        'netflix', 'binance', 'coinbase', 'chase', 'wellsfargo', 'visa', 'mastercard'
    ];
    for (const b of brands) {
        if (full.includes(b) && !domain.endsWith(`${b}.com`) && !domain.endsWith(`${b}.net`)) {
            score += 50;
            reasons.push(`Domain looks suspiciously similar to '${b}.com'.`);
            break;
        }
    }

    // Entropy-like check on subdomain parts
    const parts = domain.split('.');
    const longest = parts.reduce((a, b) => a.length > b.length ? a : b, '');
    const charSet = new Set(longest).size;
    if (longest.length > 12 && charSet > 8) {
        score += 15;
        reasons.push('Domain name appears to be randomly generated (high entropy).');
    }

    return { is_phishing: score >= 50, risk_score: Math.min(score, 100), reasons };
}

// ── Scan ──────────────────────────────────────────────────────
async function runScan() {
    const url = urlInput.value.trim();
    if (!url) { urlInput.focus(); return; }

    // Reset
    resultsEl.style.display = 'none';
    loadingEl.style.display = 'none';
    errorBanner.style.display = 'none';
    offlineBanner.style.display = 'none';
    scanBtn.disabled = true;

    const t0 = Date.now();
    loadingEl.style.display = 'block';
    startPhases(url);

    try {
        const res = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Server returned ${res.status}`);
        }

        const data = await res.json();
        const elapsed = Date.now() - t0;

        stopPhases();
        loadingEl.style.display = 'none';
        renderResults(data, url, elapsed);

    } catch (err) {
        stopPhases();
        loadingEl.style.display = 'none';

        if (err.message.includes('fetch') || err.message.includes('Failed') ||
            err.message.includes('network') || err.message.includes('Load')) {
            // Backend offline — run demo
            const data = demoAnalyse(url);
            const elapsed = Date.now() - t0;
            renderResults(data, url, elapsed);
            offlineBanner.style.display = 'flex';
        } else {
            errorBanner.style.display = 'flex';
            $('errorText').textContent = err.message;
        }
    } finally {
        scanBtn.disabled = false;
    }
}

// ── Events ────────────────────────────────────────────────────
scanBtn.addEventListener('click', runScan);
urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') runScan(); });
