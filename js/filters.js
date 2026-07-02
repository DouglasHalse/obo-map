// filters.js — Filter logic and UI

let filterState = {
    area: '',
    types: [],
    priceMin: 0,
    priceMax: 5000,
    availableNow: false,
    source: 'all',  // 'all', 'public', 'tenant'
};

let allSpots = [];
let onFilterChange = null;

function initFilters(spots, callback) {
    allSpots = spots;
    onFilterChange = callback;
    buildFilterUI(spots);
    applyFilters();
}

function buildFilterUI(spots) {
    const container = document.getElementById('filters');

    const areas = [...new Set(spots.map(s => s.area).filter(Boolean))].sort();
    const types = [...new Set(spots.map(s => s.type).filter(Boolean))].sort();
    const prices = spots.map(s => s.price || 0).filter(p => p > 0);
    const priceMax = Math.ceil(Math.max(...prices, 3000) / 100) * 100;

    filterState.priceMin = 0;
    filterState.priceMax = priceMax;

    container.innerHTML = `
        <div class="filter-group">
            <label for="areaFilter">Område</label>
            <select id="areaFilter">
                <option value="">Alla områden</option>
                ${areas.map(a => `<option value="${a}">${a}</option>`).join('')}
            </select>
        </div>

        <div class="filter-group">
            <label>Typ av plats</label>
            <div class="checkbox-group" id="typeFilters">
                ${types.map(t => {
                    const style = getMarkerStyle(t);
                    return `
                        <label class="checkbox-label">
                            <input type="checkbox" value="${t}" class="type-checkbox">
                            <span class="checkmark" style="background:${style.color}"></span>
                            ${style.label}
                        </label>`;
                }).join('')}
            </div>
        </div>

        <div class="filter-group">
            <label for="sourceFilter">Kategori</label>
            <select id="sourceFilter">
                <option value="all">Alla platser</option>
                <option value="public">Allmänna</option>
                <option value="tenant">Hyresgäster</option>
            </select>
        </div>

        <div class="filter-group">
            <label>Maxpris: <strong id="priceDisplay">${priceMax} kr/mån</strong></label>
            <input type="range" id="priceMaxSlider" min="0" max="${priceMax}"
                   value="${priceMax}" step="100">
        </div>

        <div class="filter-group">
            <label class="checkbox-label toggle-label">
                <input type="checkbox" id="availableNow">
                <span class="toggle-switch"></span>
                Endast lediga nu
            </label>
        </div>
    `;

    // Wire events
    document.getElementById('areaFilter').addEventListener('change', (e) => {
        filterState.area = e.target.value;
        applyFilters();
    });

    document.querySelectorAll('.type-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            filterState.types = [...document.querySelectorAll('.type-checkbox:checked')].map(c => c.value);
            applyFilters();
        });
    });

    document.getElementById('sourceFilter').addEventListener('change', (e) => {
        filterState.source = e.target.value;
        applyFilters();
    });

    document.getElementById('priceMaxSlider').addEventListener('input', (e) => {
        filterState.priceMax = +e.target.value;
        document.getElementById('priceDisplay').textContent = `${e.target.value} kr/mån`;
        applyFilters();
    });

    document.getElementById('availableNow').addEventListener('change', (e) => {
        filterState.availableNow = e.target.checked;
        applyFilters();
    });
}

function applyFilters() {
    const today = new Date().toISOString().split('T')[0];

    const filtered = allSpots.filter(spot => {
        if (filterState.area && spot.area !== filterState.area) return false;
        if (filterState.types.length > 0 && !filterState.types.includes(spot.type)) return false;
        if (filterState.source !== 'all' && spot.source !== filterState.source) return false;
        const price = spot.price || 0;
        if (price > filterState.priceMax) return false;
        if (filterState.availableNow) {
            if (!spot.availableFrom || spot.availableFrom > today) return false;
        }
        return true;
    });

    // Sort: available now first, then by price ascending
    filtered.sort((a, b) => {
        const aAvail = a.availableFrom && a.availableFrom <= today ? 0 : 1;
        const bAvail = b.availableFrom && b.availableFrom <= today ? 0 : 1;
        if (aAvail !== bAvail) return aAvail - bAvail;
        return (a.price || 0) - (b.price || 0);
    });

    updateStats(filtered.length);
    updateResultsList(filtered);

    if (onFilterChange) onFilterChange(filtered);
}

function updateStats(showing) {
    document.getElementById('stats').innerHTML = `
        <p class="stats-text">Visar <strong>${showing}</strong> av ${allSpots.length} platser</p>
    `;
}

function updateResultsList(spots) {
    const container = document.getElementById('resultsList');
    const today = new Date().toISOString().split('T')[0];
    const maxShow = 200;

    const html = spots.slice(0, maxShow).map(spot => {
        const style = getMarkerStyle(spot.type);
        const isAvailable = spot.availableFrom && spot.availableFrom <= today;

        return `
        <div class="result-card ${isAvailable ? 'available' : ''} ${spot.source === 'tenant' ? 'tenant' : ''}"
             data-id="${spot.id}" onclick="flyToSpot('${spot.id}')">
            <div class="result-image">
                ${spot.image
                    ? `<img src="https://obo-fastighet.momentum.se/Prod/Obo/PmApi/v2/market/objects/${spot.image}/thumbnail?width=120&height=80&version=f-1560719"
                         alt="" loading="lazy">`
                    : `<div class="no-image">🅿️</div>`}
            </div>
            <div class="result-info">
                <h4>${spot.displayName}</h4>
                <div class="result-badges">
                    <span class="badge" style="background:${style.color}">${style.label}</span>
                    ${spot.source === 'tenant' ? '<span class="badge badge-tenant">Hyresgäst</span>' : ''}
                    ${isAvailable ? '<span class="badge badge-available">Ledig nu</span>' : ''}
                </div>
                <p class="result-price">${formatPrice(spot.price)}</p>
                <p class="result-available">${spot.availableFrom ? 'Ledig ' + formatDate(spot.availableFrom) : '—'}</p>
            </div>
        </div>`;
    }).join('');

    if (spots.length > maxShow) {
        container.innerHTML = html + `<p class="results-truncated">+ ${spots.length - maxShow} till — använd filtren för att smalna av</p>`;
    } else if (spots.length === 0) {
        container.innerHTML = '<p class="results-empty">Inga platser matchar filtren.</p>';
    } else {
        container.innerHTML = html;
    }
}
