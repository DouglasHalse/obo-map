// filters.js — Filter logic and UI

let filterState = {
    area: '',
    types: [],
    priceMax: 5000,
    availableNow: false,
    source: 'all',
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

    filterState.priceMax = priceMax;

    // Filter out "Övrig" from default — only show known types as checkboxes
    const knownTypes = types.filter(t => MARKER_STYLES[t] && t !== 'default');

    container.innerHTML = `
        <div class="filter-group">
            <label for="areaFilter">${t('Area')}</label>
            <select id="areaFilter">
                <option value="">${t('All areas')}</option>
                ${areas.map(a => `<option value="${a}" onmouseover="highlightArea(this.value)" onmouseout="clearAreaHighlight()">${a}</option>`).join('')}
            </select>
        </div>

        <div class="filter-group">
            <label>${t('Type')}</label>
            <div class="checkbox-group" id="typeFilters">
                ${knownTypes.map(tp => {
                    const style = getMarkerStyle(tp);
                    return `
                        <label class="checkbox-label">
                            <input type="checkbox" value="${tp}" class="type-checkbox">
                            <span class="checkmark" style="background:${style.color}"></span>
                            ${style.label}
                        </label>`;
                }).join('')}
            </div>
        </div>

        <div class="filter-group">
            <label for="sourceFilter">${t('Category')}</label>
            <select id="sourceFilter">
                <option value="all">${t('All areas')}</option>
                <option value="public">${t('Public')}</option>
                <option value="tenant">${t('Tenant')}</option>
            </select>
        </div>

        <div class="filter-group">
            <label>${t('Max price')}: <strong id="priceDisplay">${priceMax} ${t('kr/month')}</strong></label>
            <input type="range" id="priceMaxSlider" min="0" max="${priceMax}"
                   value="${priceMax}" step="100">
        </div>

        <div class="filter-group">
            <label class="checkbox-label toggle-label">
                <input type="checkbox" id="availableNow">
                <span class="toggle-switch"></span>
                ${t('Available now')}
            </label>
        </div>
    `;

    document.getElementById('areaFilter').addEventListener('change', (e) => {
        clearAreaHighlight();
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
        document.getElementById('priceDisplay').textContent = `${e.target.value} ${t('kr/month')}`;
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
        if ((spot.price || 0) > filterState.priceMax) return false;
        if (filterState.availableNow) {
            if (!spot.availableFrom || spot.availableFrom > today) return false;
        }
        return true;
    });

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
        <p class="stats-text">${t('Showing')} <strong>${showing}</strong> ${t('of')} ${allSpots.length} ${t('Parking spots').toLowerCase()}</p>
    `;
}

function updateResultsList(spots) {
    const container = document.getElementById('resultsList');
    const today = new Date().toISOString().split('T')[0];
    const maxShow = 200;

    const html = spots.slice(0, maxShow).map(spot => {
        const style = getMarkerStyle(spot.type);
        const isAvailable = spot.availableFrom && spot.availableFrom <= today;
        const oboUrl = getOboUrl(spot);

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
                    ${spot.source === 'tenant' ? '<span class="badge badge-tenant">' + t('Tenant') + '</span>' : ''}
                    ${isAvailable ? '<span class="badge badge-available">' + t('Ledig nu') + '</span>' : ''}
                </div>
                <p class="result-price">${formatPrice(spot.price)}</p>
                <p class="result-available">${spot.availableFrom ? t('Available from') + ' ' + formatDate(spot.availableFrom) : '—'}</p>
                <a href="${oboUrl}" target="_blank" rel="noopener" class="result-obo-link"
                   onclick="event.stopPropagation()">${t('View on ÖBO')} ↗</a>
            </div>
        </div>`;
    }).join('');

    if (spots.length > maxShow) {
        container.innerHTML = html + `<p class="results-truncated">+ ${spots.length - maxShow} ${t('More')}</p>`;
    } else if (spots.length === 0) {
        container.innerHTML = `<p class="results-empty">${t('No results')}</p>`;
    } else {
        container.innerHTML = html;
    }
}
