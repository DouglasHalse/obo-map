// filters.js — Filter logic and UI

let filterState = {
    area: '',
    types: [],
    priceMax: 5000,
    availableNow: false,
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

    const knownTypes = types.filter(t => MARKER_STYLES[t] && t !== 'default');

    container.innerHTML = `
        <div class="filter-group">
            <label for="areaFilter">${t('Area')}</label>
            <select id="areaFilter">
                <option value="">${t('All areas')}</option>
                ${areas.map(a => `<option value="${a}">${a}</option>`).join('')}
            </select>
        </div>

        <div class="filter-group">
            <label>${t('Type')}</label>
            <div class="multi-select" id="typeMultiSelect">
                <div class="multi-select-trigger" id="typeSelectTrigger">
                    <span class="multi-select-label">${t('All areas')}</span>
                    <span class="multi-select-arrow">▼</span>
                </div>
                <div class="multi-select-dropdown" id="typeSelectDropdown">
                    ${knownTypes.map((tp, i) => {
                        const style = getMarkerStyle(tp);
                        return `<label class="multi-select-option">
                            <input type="checkbox" value="${tp}" data-idx="${i}">
                            ${style.label}
                        </label>`;
                    }).join('')}
                </div>
            </div>
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
        filterState.area = e.target.value;
        applyFilters();
    });

    // Type multi-select
    const typeDropdown = document.getElementById('typeSelectDropdown');
    const typeTrigger = document.getElementById('typeSelectTrigger');
    const typeLabel = typeTrigger.querySelector('.multi-select-label');

    typeTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        typeDropdown.classList.toggle('open');
    });

    typeDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            filterState.types = [...typeDropdown.querySelectorAll('input:checked')].map(c => c.value);
            updateTypeDisplay();
            applyFilters();
        });
    });

    document.addEventListener('click', (e) => {
        if (!document.getElementById('typeMultiSelect').contains(e.target)) {
            typeDropdown.classList.remove('open');
        }
    });

    function updateTypeDisplay() {
        const checked = typeDropdown.querySelectorAll('input:checked');
        if (checked.length === 0) {
            typeLabel.innerHTML = t('All areas');
        } else {
            typeLabel.innerHTML = checked.length + ' ' + t('Type').toLowerCase();
        }
    }

    document.getElementById('availableNow').addEventListener('change', (e) => {
        filterState.availableNow = e.target.checked;
        applyFilters();
    });

    document.getElementById('priceMaxSlider').addEventListener('input', (e) => {
        filterState.priceMax = +e.target.value;
        document.getElementById('priceDisplay').textContent = `${e.target.value} ${t('kr/month')}`;
        applyFilters();
    });
}

function applyFilters() {
    const today = new Date().toISOString().split('T')[0];

    const filtered = allSpots.filter(spot => {
        if (filterState.area && spot.area !== filterState.area) return false;
        if (filterState.types.length > 0 && !filterState.types.includes(spot.type)) return false;
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
        <p class="stats-text">${t('Showing')} <strong>${showing}</strong> ${t('of')} ${allSpots.length} ${t('listings')}</p>
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
        <div class="result-card ${isAvailable ? 'available' : ''}"
             data-id="${spot.id}"
             onmouseenter="highlightMapMarker('${spot.id}')"
             onmouseleave="unhighlightMapMarker()"
             onclick="flyToSpot('${spot.id}')">
            <div class="result-image">
                ${spot.image
                    ? `<img src="https://obo-fastighet.momentum.se/Prod/Obo/PmApi/v2/market/objects/${spot.image}/thumbnail?width=120&height=80&version=f-1560719"
                         alt="" loading="lazy">`
                    : `<div class="no-image">🅿️</div>`}
            </div>
            <div class="result-info">
                <h4>${spot.displayName}</h4>
                <p class="result-price">${formatPrice(spot.price)} &middot; ${style.label}</p>
                <p class="result-available">
                    ${spot.availableFrom ? t('Available from') + ' ' + formatDate(spot.availableFrom) : '—'}
                    <a href="${oboUrl}" target="_blank" rel="noopener" class="result-obo-link"
                       onclick="event.stopPropagation()">${t('View on ÖBO')} ↗</a>
                </p>
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
