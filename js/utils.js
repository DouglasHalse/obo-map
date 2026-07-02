// utils.js — Shared helpers, i18n, marker styles

// === i18n ===
const LANG_KEY = 'obo-map-lang';

const STRINGS = {
    'listings':        { sv: 'objekt', en: 'listings' },
    'Available now':   { sv: 'Lediga nu', en: 'Available now' },
    'Showing':         { sv: 'Visar', en: 'Showing' },
    'of':              { sv: 'av', en: 'of' },
    All:               { sv: 'Alla', en: 'All' },
    'All areas':       { sv: 'Alla områden', en: 'All areas' },
    'Area':            { sv: 'Område', en: 'Area' },
    'Type':            { sv: 'Typ', en: 'Type' },
    'Max price':       { sv: 'Maxpris', en: 'Max price' },
    'kr/month':        { sv: 'kr/mån', en: 'kr/mo' },
    'Available from':  { sv: 'Ledig från', en: 'Available from' },
    'Not available':   { sv: 'Ej tillgänglig', en: 'Not available' },
    'Rent':            { sv: 'Hyra', en: 'Rent' },
    'Sign':            { sv: 'Skylt', en: 'Sign' },
    'Loading':         { sv: 'Laddar data...', en: 'Loading data...' },
    'Load error':      { sv: 'Kunde inte ladda data.', en: 'Could not load data.' },
    'More':            { sv: 'till — använd filtren', en: 'more — use filters' },
    'No results':      { sv: 'Inga objekt matchar filtren.', en: 'No listings match the filters.' },
    'View on ÖBO':     { sv: 'Visa på ÖBO', en: 'View on ÖBO' },
    'Map title':       { sv: 'ÖBO Parkeringskarta', en: 'ÖBO Parking Map' },
    'Subtitle':        { sv: 'Lediga bilplatser i Örebro', en: 'Available parking in Örebro' },
    'Filters':         { sv: 'Filter', en: 'Filters' },
    'Ledig nu':        { sv: 'Ledig nu', en: 'Available' },
    'Rooms':           { sv: 'Rum', en: 'Rooms' },
    'Size':            { sv: 'Yta', en: 'Size' },
    'sqm':             { sv: 'kvm', en: 'm²' },
};

let currentLang = localStorage.getItem(LANG_KEY) || 'en';

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

// === ÖBO detail page URL (uses spot's category type ID) ===
function getOboUrl(spot) {
    const base = 'https://minasidor.obo.se/market';
    return base + '/' + (spot.category || 'QFpVYrKF9r9rBRR4MqqRCFxg') + '/' + spot.id;
}

// === Marker styles (all types from actual data) ===
const MARKER_STYLES = {
    'Varmgarage':                      { color: '#e74c3c', label: { sv: 'Varmgarage',                      en: 'Heated garage' },            icon: '🏠' },
    'Garage med motorvärmare':         { color: '#c0392b', label: { sv: 'Garage med motorvärmare',         en: 'Garage w/heater' },           icon: '🏠🔥' },
    'Kallgarage':                      { color: '#7f8c8d', label: { sv: 'Kallgarage',                      en: 'Cold garage' },               icon: '🏚️' },
    'Laddplats garage':                { color: '#8e44ad', label: { sv: 'Laddplats garage',                en: 'Charging garage' },           icon: '⚡🏠' },
    'Motorcykelgarage':                { color: '#e67e22', label: { sv: 'Motorcykelgarage',                en: 'Motorcycle garage' },         icon: '🏍️' },
    'P-plats med elbilsladdare':       { color: '#9b59b6', label: { sv: 'P-plats med elbilsladdare',       en: 'EV charger' },                icon: '⚡' },
    'P-plats med tak och el':         { color: '#f39c12', label: { sv: 'P-plats med tak och el',          en: 'Covered + elec.' },           icon: '🏠⚡' },
    'P-plats med tidsstyrd el och tak':{ color: '#e67e22', label: { sv: 'P-plats med tidstyrd el och tak',en: 'Covered + timer' },           icon: '🏠⏰' },
    'P-plats med tak, grind och el':  { color: '#d68910', label: { sv: 'P-plats med tak, grind och el',   en: 'Covered, gate + elec.' },     icon: '🏠🔒' },
    'P-plats med tak, el och förråd': { color: '#d4ac0d', label: { sv: 'P-plats med tak, el och förråd',  en: 'Covered, elec. + storage' },  icon: '🏠📦' },
    'P-plats med el':                  { color: '#3498db', label: { sv: 'P-plats med el',                 en: 'Electricity' },               icon: '🔌' },
    'P-plats med tidstyrd el':         { color: '#2980b9', label: { sv: 'P-plats med tidstyrd el',        en: 'Timer electricity' },         icon: '⏰' },
    'Parkeringsplats':                 { color: '#2ecc71', label: { sv: 'Parkeringsplats',                en: 'Parking spot' },              icon: '🅿️' },
    'MC-plats':                        { color: '#e67e22', label: { sv: 'Motorcykelplats',                en: 'Motorcycle spot' },           icon: '🏍️' },
    'Husvagnsparkering':               { color: '#795548', label: { sv: 'Husvagnsparkering',              en: 'Caravan spot' },              icon: '🚐' },
    // Residential types
    '1 rum och kök':  { color: '#cf0035', label: { sv: '1 rum och kök', en: '1 room + kitchen' }, icon: '🏠' },
    '2 rum och kök':  { color: '#cf0035', label: { sv: '2 rum och kök', en: '2 rooms + kitchen' }, icon: '🏠' },
    '3 rum och kök':  { color: '#cf0035', label: { sv: '3 rum och kök', en: '3 rooms + kitchen' }, icon: '🏠' },
    '4 rum och kök':  { color: '#cf0035', label: { sv: '4 rum och kök', en: '4 rooms + kitchen' }, icon: '🏠' },
    '5 rum och kök':  { color: '#cf0035', label: { sv: '5 rum och kök', en: '5 rooms + kitchen' }, icon: '🏠' },
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
