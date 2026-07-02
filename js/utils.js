// utils.js — Shared helpers

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPrice(price) {
    if (price == null) return '—';
    return Math.round(price).toLocaleString('sv-SE') + ' kr/mån';
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

const MARKER_STYLES = {
    'Varmgarage':               { color: '#e74c3c', label: 'Varmgarage',               icon: '🏠' },
    'P-plats med elbilsladdare': { color: '#9b59b6', label: 'Elbilsladdare',            icon: '⚡' },
    'P-plats med tak och el':   { color: '#f39c12', label: 'Tak + el',                  icon: '🏠' },
    'P-plats med el':           { color: '#3498db', label: 'El',                        icon: '🔌' },
    'P-plats med tidstyrd el':  { color: '#2980b9', label: 'Tidstyrd el',               icon: '⏰' },
    'Parkeringsplats':          { color: '#2ecc71', label: 'Parkeringsplats',           icon: '🅿️' },
    'default':                  { color: '#95a5a6', label: 'Övrig',                     icon: '📍' },
};

function getMarkerStyle(type) {
    return MARKER_STYLES[type] || MARKER_STYLES['default'];
}
