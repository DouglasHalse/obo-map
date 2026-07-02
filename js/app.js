// app.js — Entry point

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Init map immediately
        initMap();

        // Fetch data
        const response = await fetch('data/parking-spots.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        console.log(`Loaded ${data.total} parking spots (${data.geocoded} geocoded, ${data.notFound} not found)`);

        // Check for stale data
        const genDate = new Date(data.generated);
        const daysOld = (Date.now() - genDate) / (1000 * 60 * 60 * 24);
        if (daysOld > 7) {
            console.warn(`Data is ${Math.round(daysOld)} days old`);
        }

        // Add all markers initially
        addMarkers(data.spots);

        // Init filters with callback to update map
        initFilters(data.spots, (filtered) => {
            updateMap(filtered);
        });

        // Hide loading
        document.getElementById('loading').style.display = 'none';

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

        // Keyboard shortcut: Ctrl+F for filters
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
                <p>Kunde inte ladda parkeringsdata.</p>
                <p class="error-hint">${err.message}</p>
            </div>`;
    }
});
