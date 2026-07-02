// app.js — Entry point

const CATEGORY_LABELS = {
    'residential':               { sv: 'Bostad', en: 'Housing' },
    'VJKbFxvkM99GGWCvwXyhWYCX':  { sv: 'Snabbvalet', en: 'Quick pick' },
    'X7PPpCMvT7FHDfGVJgBtytKc':   { sv: 'Senior', en: 'Senior' },
    'BwCRpdHRgKvKXprdYwptKVKg':   { sv: 'Student', en: 'Student' },
    'qppm9gc6c96FHHvjWbTQbd8J':   { sv: 'Ungdom', en: 'Youth' },
    'parking':                     { sv: 'P-plats hyr.', en: 'Tenant parking' },
    'QFpVYrKF9r9rBRR4MqqRCFxg':   { sv: 'P-plats allm.', en: 'Public parking' },
    'commercial':                  { sv: 'Förråd', en: 'Storage' },
};

let activeCategory = 'QFpVYrKF9r9rBRR4MqqRCFxg'; // default: Bilplats allmän
let allData = null;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('langToggle').textContent = getLang() === 'sv' ? 'EN' : 'SV';
    document.getElementById('langToggle').addEventListener('click', toggleLanguage);

    try {
        initMap();

        const response = await fetch('data/parking-spots.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        allData = await response.json();

        console.log(`Loaded ${allData.total} spots across ${Object.keys(CATEGORY_LABELS).length} categories`);

        const genDate = new Date(allData.generated);
        const daysOld = (Date.now() - genDate) / (1000 * 60 * 60 * 24);
        if (daysOld > 7) console.warn(`Data is ${Math.round(daysOld)} days old`);

        buildCategoryTabs();
        switchCategory(activeCategory);

        document.getElementById('loading').style.display = 'none';
        updatePageTexts();

        // Mobile filter toggle
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('filterToggle');
        const mapEl = document.getElementById('map');

        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            toggleBtn.classList.toggle('active');
        });

        mapEl.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                sidebar.classList.remove('open');
                toggleBtn.classList.remove('active');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' && e.ctrlKey) {
                e.preventDefault();
                sidebar.classList.toggle('open');
                toggleBtn.classList.toggle('active');
            }
        });

    } catch (err) {
        console.error('Failed to load parking data:', err);
        document.getElementById('loading').innerHTML =
            `<div class="error-overlay"><p>${t('Load error')}</p><p class="error-hint">${err.message}</p></div>`;
    }
});

function buildCategoryTabs() {
    const container = document.getElementById('categoryTabs');
    const catCounts = {};
    allData.spots.forEach(s => {
        catCounts[s.category] = (catCounts[s.category] || 0) + 1;
    });

    container.innerHTML = Object.entries(CATEGORY_LABELS).map(([id, labels]) => {
        const count = catCounts[id] || 0;
        const label = labels[getLang()] || labels['sv'];
        const active = id === activeCategory ? ' active' : '';
        return `<button class="category-tab${active}" data-cat="${id}" onclick="switchCategory('${id}')">
            ${label}<span class="tab-count">${count}</span></button>`;
    }).join('');
}

function switchCategory(catId) {
    activeCategory = catId;
    const spots = allData.spots.filter(s => s.category === catId);

    // Update tab styling
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.cat === catId);
    });

    // Rebuild filters for this category
    addMarkers(spots);
    initFilters(spots, (filtered) => updateMap(filtered));
}

function updatePageTexts() {
    document.getElementById('filterToggle').setAttribute('aria-label', t('Filters'));
    document.getElementById('filterToggle').setAttribute('title', t('Filters'));
    document.getElementById('loadingText').textContent = t('Loading');
}
