// app.js — Entry point

document.addEventListener('DOMContentLoaded', async () => {
    // Set initial UI language
    document.getElementById('langToggle').textContent = getLang() === 'sv' ? 'EN' : 'SV';
    document.getElementById('langToggle').addEventListener('click', toggleLanguage);

    try {
        initMap();

        const response = await fetch('data/parking-spots.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        console.log(`Loaded ${data.total} parking spots (${data.geocoded} geocoded)`);

        const genDate = new Date(data.generated);
        const daysOld = (Date.now() - genDate) / (1000 * 60 * 60 * 24);
        if (daysOld > 7) console.warn(`Data is ${Math.round(daysOld)} days old`);

        addMarkers(data.spots);

        initFilters(data.spots, (filtered) => {
            updateMap(filtered);
        });

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
        document.getElementById('loading').innerHTML = `
            <div class="error-overlay">
                <p>${t('Load error')}</p>
                <p class="error-hint">${err.message}</p>
            </div>`;
    }
});

function updatePageTexts() {
    document.getElementById('mapTitle').textContent = t('Map title');
    document.getElementById('subtitle').textContent = t('Subtitle');
    document.getElementById('filterToggle').setAttribute('aria-label', t('Filters'));
    document.getElementById('filterToggle').setAttribute('title', t('Filters'));
    document.getElementById('loadingText').textContent = t('Loading');
}
