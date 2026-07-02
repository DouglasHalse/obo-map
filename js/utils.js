// utils.js — Shared helpers, i18n, marker styles

// === i18n ===
const LANG_KEY = 'obo-map-lang';

const STRINGS = {
    'Parking spots':   { sv: 'Parkeringsplatser', en: 'Parking spots' },
    'Available now':   { sv: 'Lediga nu', en: 'Available now' },
    'Showing':         { sv: 'Visar', en: 'Showing' },
    'of':              { sv: 'av', en: 'of' },
    All:               { sv: 'Alla', en: 'All' },
    'All areas':       { sv: 'Alla områden', en: 'All areas' },
    'Area':            { sv: 'Område', en: 'Area' },
    'Type':            { sv: 'Typ av plats', en: 'Parking type' },
    'Category':        { sv: 'Kategori', en: 'Category' },
    'Public':          { sv: 'Allmänna', en: 'Public' },
    'Tenant':          { sv: 'Hyresgäster', en: 'Tenants' },
    'Max price':       { sv: 'Maxpris', en: 'Max price' },
    'kr/month':        { sv: 'kr/mån', en: 'kr/mo' },
    'Available from':  { sv: 'Ledig från', en: 'Available from' },
    'Not available':   { sv: 'Ej tillgänglig', en: 'Not available' },
    'Rent':            { sv: 'Hyra', en: 'Rent' },
    'Sign':            { sv: 'Skylt', en: 'Sign' },
    'Loading':         { sv: 'Laddar parkeringsdata...', en: 'Loading parking data...' },
    'Load error':      { sv: 'Kunde inte ladda parkeringsdata.', en: 'Could not load parking data.' },
    'More':            { sv: 'till — använd filtren', en: 'more — use filters' },
    'No results':      { sv: 'Inga platser matchar filtren.', en: 'No spots match the filters.' },
    'View on ÖBO':     { sv: 'Visa på ÖBO', en: 'View on ÖBO' },
    'Map title':       { sv: 'ÖBO Parkeringskarta', en: 'ÖBO Parking Map' },
    'Subtitle':        { sv: 'Lediga bilplatser i Örebro', en: 'Available parking in Örebro' },
    'Filters':         { sv: 'Filter', en: 'Filters' },
    'Ledig nu':        { sv: 'Ledig nu', en: 'Available' },
};

let currentLang = localStorage.getItem(LANG_KEY) || 'sv';

function t(key) {
    const entry = STRINGS[key];
    if (!entry) return key;
    return entry[currentLang] || entry['sv'] || key;
}

function toggleLanguage() {
    currentLang = currentLang === 'sv' ? 'en' : 'sv';
    localStorage.setItem(LANG_KEY, currentLang);
    location.reload();
}

function getLang() { return currentLang; }

// === Formatting ===
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const locale = currentLang === 'sv' ? 'sv-SE' : 'en-GB';
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPrice(price) {
    if (price == null) return '—';
    return Math.round(price).toLocaleString('sv-SE') + ' ' + t('kr/month');
}

// === ÖBO detail page URL ===
const OBO_MARKET_BASE = 'https://minasidor.obo.se/market/QFpVYrKF9r9rBRR4MqqRCFxg';
function getOboUrl(spot) {
    return OBO_MARKET_BASE + '/' + spot.id;
}

// === Marker styles (all types from actual data) ===
const MARKER_STYLES = {
    'Varmgarage':                      { color: '#e74c3c', label: { sv: 'Varmgarage',             en: 'Heated garage' },            icon: '🏠' },
    'Garage med motorvärmare':         { color: '#c0392b', label: { sv: 'Garage m/värmare',       en: 'Garage w/heater' },           icon: '🏠🔥' },
    'Kallgarage':                      { color: '#7f8c8d', label: { sv: 'Kallgarage',             en: 'Cold garage' },               icon: '🏚️' },
    'Laddplats garage':                { color: '#8e44ad', label: { sv: 'Laddplats garage',       en: 'Charging garage' },           icon: '⚡🏠' },
    'Motorcykelgarage':                { color: '#e67e22', label: { sv: 'MC-garage',              en: 'Motorcycle garage' },         icon: '🏍️' },
    'P-plats med elbilsladdare':       { color: '#9b59b6', label: { sv: 'Elbilsladdare',          en: 'EV charger' },                icon: '⚡' },
    'P-plats med tak och el':         { color: '#f39c12', label: { sv: 'Tak + el',               en: 'Covered + elec.' },           icon: '🏠⚡' },
    'P-plats med tidsstyrd el och tak':{ color: '#e67e22', label: { sv: 'Tak + tidstyrd el',     en: 'Covered + timer' },           icon: '🏠⏰' },
    'P-plats med tak, grind och el':  { color: '#d68910', label: { sv: 'Tak, grind + el',        en: 'Covered, gate + elec.' },     icon: '🏠🔒' },
    'P-plats med tak, el och förråd': { color: '#d4ac0d', label: { sv: 'Tak, el + förråd',       en: 'Covered, elec. + storage' },  icon: '🏠📦' },
    'P-plats med el':                  { color: '#3498db', label: { sv: 'El',                     en: 'Electricity' },               icon: '🔌' },
    'P-plats med tidstyrd el':         { color: '#2980b9', label: { sv: 'Tidstyrd el',            en: 'Timer electricity' },         icon: '⏰' },
    'Parkeringsplats':                 { color: '#2ecc71', label: { sv: 'Parkeringsplats',        en: 'Parking spot' },              icon: '🅿️' },
    'MC-plats':                        { color: '#e67e22', label: { sv: 'MC-plats',               en: 'Motorcycle spot' },           icon: '🏍️' },
    'Husvagnsparkering':               { color: '#795548', label: { sv: 'Husvagn',                en: 'Caravan spot' },              icon: '🚐' },
    'default':                         { color: '#95a5a6', label: { sv: 'Övrig',                  en: 'Other' },                     icon: '📍' },
};

function getMarkerStyle(type) {
    const style = MARKER_STYLES[type] || MARKER_STYLES['default'];
    return {
        color: style.color,
        label: style.label[currentLang] || style.label['sv'],
        icon: style.icon,
    };
}
