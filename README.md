# OBO Listing Map

An interactive map of available listings from ÖBO (Örebrobostäder) — the public housing company in Örebro, Sweden. Shows housing, parking, and storage units on a Leaflet map with filtering by area, type, price, and availability.

**Live site:** https://douglashalse.github.io/obo-map/

## What it does

- Fetches all 1,400+ listings from OBO's public API across 8 categories (housing, student, senior, youth, quick-pick, tenant parking, public parking, storage)
- Geocodes addresses via Google Maps (with Geoapify and Nominatim as fallbacks) to building-level precision
- Displays results on an interactive Leaflet map with clustered markers
- Sidebar with category tabs, area/type/price filters, and a scrollable results list
- Each listing links to its official detail page on OBO's website
- Daily data refresh via GitHub Actions at 04:00 UTC

## Tech

- Static site, no backend — hosted on GitHub Pages
- Vanilla JavaScript (no framework), Leaflet.js for the map, Leaflet.markercluster for clustering
- Python data pipeline (`scripts/fetch_parking.py`) fetches from OBO's Momentum REST API, geocodes addresses, and writes `data/parking-spots.json`
- GitHub Actions cron job runs the pipeline daily and commits updated data

## Local development

```
git clone https://github.com/DouglasHalse/obo-map.git
cd obo-map
pip install -r scripts/requirements.txt
python scripts/fetch_parking.py
python -m http.server 8080
```

Open http://localhost:8080. The Google Maps geocoding key is optional — set `GOOGLE_GEOCODE_KEY` if you want building-level precision.

## About

This project is almost entirely AI-generated (vibe coded).
