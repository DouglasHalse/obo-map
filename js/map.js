// map.js — Leaflet map with clustered markers

const MAP_CENTER = [59.275, 15.213];
const MAP_ZOOM = 13;

let map;
let markerCluster;
let allMarkers = [];
let markerLookup = {};

function initMap() {
    map = L.map('map', {
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
    }).addTo(map);

    markerCluster = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            let size = count > 100 ? 'large' : count > 20 ? 'medium' : 'small';
            return L.divIcon({
                html: `<div class="cluster-icon cluster-${size}">${count}</div>`,
                className: 'cluster-container',
                iconSize: L.point(40, 40),
            });
        },
    });

    map.addLayer(markerCluster);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
    L.control.locate({ position: 'topright', strings: { title: 'Show my location' }, flyTo: true }).addTo(map);
}

function createMarkerIcon(spot) {
    const style = getMarkerStyle(spot.type);
    const size = 11;

    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            width:${size*2}px;height:${size*2}px;
            background:${style.color};
            border:2px solid white;
            border-radius:50%;
            box-shadow:0 1px 4px rgba(0,0,0,0.3);
            cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            font-size:${size-2}px;
        "></div>`,
        iconSize: [size * 2, size * 2],
        iconAnchor: [size, size],
    });
}

function createPopupContent(spot) {
    const style = getMarkerStyle(spot.type);
    const price = formatPrice(spot.price);
    const avail = spot.availableFrom ? formatDate(spot.availableFrom) : t('Not available');
    const oboUrl = getOboUrl(spot);

    let imgHtml = '';
    if (spot.image) {
        imgHtml = `<img src="https://obo-fastighet.momentum.se/Prod/Obo/PmApi/v2/market/objects/${spot.image}/thumbnail?width=300&height=200&version=f-1560719"
             style="width:100%;border-radius:6px;margin-bottom:8px;" alt="${spot.displayName}" loading="lazy">`;
    }

    return `
        <div class="popup-content">
            ${imgHtml}
            <h3>${spot.displayName}</h3>
            <p><span class="popup-badge" style="background:${style.color}">${style.label}</span></p>
            <p><strong>${t('Rent')}:</strong> ${price}${spot.sqm && isNonParkingCategory(spot.category) ? ' &middot; ' + Math.round(spot.sqm) + ' ' + t('sqm') : ''}</p>
            <p><strong>${t('Available from')}:</strong> ${avail}</p>
            <p><strong>${t('Area')}:</strong> ${spot.area || '—'}</p>
            ${spot.signNumber ? `<p><strong>${t('Sign')}:</strong> ${spot.signNumber}</p>` : ''}
            <p class="popup-id">${spot.number}</p>
            <a href="${oboUrl}" target="_blank" rel="noopener" class="popup-obo-link">
                ${t('View on ÖBO')} ↗
            </a>
        </div>`;
}

function addMarkers(spots) {
    markerCluster.clearLayers();
    allMarkers = [];
    markerLookup = {};

    spots.forEach(spot => {
        if (!spot.lat || !spot.lon) return;

        const icon = createMarkerIcon(spot);
        const marker = L.marker([spot.lat, spot.lon], { icon });

        marker.bindPopup(createPopupContent(spot), {
            maxWidth: 260,
            className: 'obo-popup',
            autoPanPaddingTopLeft: [10, 70],
        });

        marker.on('click', () => {
            highlightResultCard(spot.id);
            if (window.innerWidth < 768) {
                map.panTo([spot.lat - 0.001, spot.lon], { animate: true, duration: 0.3 });
            }
        });

        markerCluster.addLayer(marker);
        allMarkers.push({ marker, spot });
        markerLookup[spot.id] = marker;
    });
}

function flyToSpot(spotId) {
    const entry = allMarkers.find(m => m.spot.id === spotId);
    if (!entry) return;
    const { marker } = entry;
    markerCluster.zoomToShowLayer(marker, () => {
        marker.openPopup();
    });
}

function highlightResultCard(spotId) {
    document.querySelectorAll('.result-card').forEach(card => card.classList.remove('active'));
    const card = document.querySelector(`.result-card[data-id="${spotId}"]`);
    if (card) {
        card.classList.add('active');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

let highlightedMarker = null;

function highlightMapMarker(spotId) {
    unhighlightMapMarker();
    const marker = markerLookup[spotId];
    if (!marker) return;
    highlightedMarker = marker;
    const el = marker.getElement();
    if (!el) return;
    const dot = el.querySelector('div');
    if (dot) {
        dot.style.transform = 'scale(1.6)';
        dot.style.boxShadow = '0 0 10px 3px rgba(207,0,53,0.5)';
        dot.style.zIndex = '1000';
    }
}

function unhighlightMapMarker() {
    if (highlightedMarker) {
        const el = highlightedMarker.getElement();
        if (el) {
            const dot = el.querySelector('div');
            if (dot) {
                dot.style.transform = '';
                dot.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
                dot.style.zIndex = '';
            }
        }
        highlightedMarker = null;
    }
}
