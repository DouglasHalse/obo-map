#!/usr/bin/env python3
"""Fetch all OBO parking spots, geocode addresses, output JSON."""

import json
import time
from pathlib import Path
from urllib.parse import urlencode

import requests
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

# --- Config ---
API_BASE = "https://obo-fastighet.momentum.se/Prod/Obo/PmApi/v2/market/objects"
API_KEY = "pJnKrR6B3FzRNFsF33xL8LhSs55KPJrm"
GEOAPIFY_KEY = "b6f995767b844f73871eb632ebee3d12"
TYPE_IDS = {
    "QFpVYrKF9r9rBRR4MqqRCFxg": "public",
    "parking":                    "tenant",
}
LIMIT = 100
OUTPUT = Path(__file__).parent.parent / "data" / "parking-spots.json"
GEOCODE_CACHE = Path(__file__).parent.parent / "data" / "geocode-cache.json"

HEADERS = {"X-Api-Key": API_KEY, "Accept": "application/json"}

ADDRESS_FIXES = {
    "L Wivallius väg":   "Lars Wivallius väg",
    "Hj Bergmans Väg":   "Hjalmar Bergmans väg",
    "Hj Bergmans väg":   "Hjalmar Bergmans väg",
    "Ö Vintergatan":     "Östra Vintergatan",
}


def parse_date(ms_str):
    if not ms_str:
        return None
    try:
        ms = int(ms_str.strip("/Date()"))
        from datetime import datetime, timezone
        return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return None


def fetch_all():
    items = []
    for type_id, source in TYPE_IDS.items():
        print(f"\n--- Fetching type={type_id} ({source}) ---")
        params = {"type": type_id, "limit": LIMIT, "offset": 0}
        resp = requests.get(f"{API_BASE}?{urlencode(params)}", headers=HEADERS, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        total = data["count"]
        for item in data["items"]:
            item["_source"] = source
        items.extend(data["items"])
        print(f"  Total: {total}, page 1 ({len(data['items'])} items)")
        for offset in range(LIMIT, total, LIMIT):
            params["offset"] = offset
            resp = requests.get(f"{API_BASE}?{urlencode(params)}", headers=HEADERS, timeout=30)
            resp.raise_for_status()
            page = resp.json()
            for item in page["items"]:
                item["_source"] = source
            items.extend(page["items"])
            print(f"  offset={offset}, got {len(page['items'])} (total: {len(items)})")
    print(f"\nTotal fetched: {len(items)} items from {len(TYPE_IDS)} sources")
    return items


def normalize_spot(item):
    loc = item.get("location", {})
    area_info = loc.get("area", {})
    display_name = item.get("displayName", "")
    return {
        "id": item["id"],
        "number": item.get("number", ""),
        "displayName": display_name,
        "type": item.get("size", {}).get("roomsDisplayName", ""),
        "area": area_info.get("displayName", ""),
        "areaPath": [a.get("displayName", "") for a in loc.get("areaPath", [])],
        "source": item.get("_source", "unknown"),
        "address": {
            "street": display_name,
            "city": "Örebro",
            "geocodeQuery": f"{display_name}, Örebro, Sweden",
        },
        "price": item.get("pricing", {}).get("price"),
        "priceInclVAT": item.get("pricing", {}).get("priceInclVAT"),
        "availableFrom": parse_date(item.get("availability", {}).get("availableFrom")),
        "signNumber": (loc.get("signNumber") or "").strip(),
        "image": item.get("thumbnail", {}).get("exists") and item["id"] or None,
        "queueType": item.get("queueType", ""),
    }


def geocode_geoapify(addr):
    """Geocode a single address with Geoapify. Returns (lat, lon, precise) or None."""
    try:
        r = requests.get("https://api.geoapify.com/v1/geocode/search", params={
            "text": addr, "format": "json", "apiKey": GEOAPIFY_KEY, "limit": 1
        }, timeout=10)
        r.raise_for_status()
        results = r.json().get("results", [])
        if results:
            res = results[0]
            precise = res.get("result_type") == "building"
            return (res["lat"], res["lon"], precise)
        return None
    except Exception as e:
        print(f"    Geoapify error: {e}")
        return None


def geocode_nominatim(addr, geocode_fn):
    """Fallback to Nominatim."""
    try:
        loc = geocode_fn(addr, addressdetails=True)
        if loc:
            cls = loc.raw.get("class", "")
            return (loc.latitude, loc.longitude, cls != "highway")
    except Exception:
        pass
    return None


def geocode_addresses(spots):
    cache = {}
    if GEOCODE_CACHE.exists():
        with open(GEOCODE_CACHE) as f:
            cache = json.load(f)
        print(f"Loaded {len(cache)} cached results")

    nominatim = Nominatim(user_agent="obo-parking-map")
    nom_geocode = RateLimiter(nominatim.geocode, min_delay_seconds=1.1)

    # Build unique addresses with abbreviation fixes
    unique = {}
    for spot in spots:
        addr = spot["address"]["geocodeQuery"]
        for short, full in ADDRESS_FIXES.items():
            if short in addr:
                addr = addr.replace(short, full)
                spot["address"]["geocodeQuery"] = addr
        if addr not in unique:
            unique[addr] = []

    # Only geocode addresses not in cache, or cached as imprecise (re-try with Geoapify)
    to_geocode = []
    to_retry = []
    for addr in unique:
        if addr not in cache:
            to_geocode.append(addr)
        elif not cache[addr].get("precise", False) and cache[addr].get("lat"):
            to_retry.append(addr)

    print(f"New addresses: {len(to_geocode)}, retrying imprecise: {len(to_retry)}")

    # Geoapify for new + imprecise retries
    for i, addr in enumerate(to_geocode + to_retry):
        result = geocode_geoapify(addr)
        if result:
            lat, lon, precise = result
            cache[addr] = {"lat": lat, "lon": lon, "precise": precise}
        else:
            # Fallback to Nominatim
            result = geocode_nominatim(addr, nom_geocode)
            if result:
                lat, lon, precise = result
                cache[addr] = {"lat": lat, "lon": lon, "precise": precise}
            else:
                cache[addr] = {"lat": None, "lon": None, "precise": False}
                print(f"  [{i+1}] NOT FOUND: {addr}")

        if (i + 1) % 20 == 0:
            with open(GEOCODE_CACHE, "w") as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)
            print(f"  Saved cache ({len(cache)} entries)")
        time.sleep(0.15)  # Geoapify is fast but be polite

    with open(GEOCODE_CACHE, "w") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    # Attach to spots
    for spot in spots:
        addr = spot["address"]["geocodeQuery"]
        coords = cache.get(addr, {})
        spot["lat"] = coords.get("lat")
        spot["lon"] = coords.get("lon")
        spot["precise"] = coords.get("precise", False)

    precise = sum(1 for s in spots if s.get("precise"))
    geocoded = sum(1 for s in spots if s["lat"])
    print(f"  Results: {geocoded} geocoded, {precise} building-level ({100*precise//len(spots)}%)")
    return spots


def geocode_areas(spots):
    """Geocode area names to get GeoJSON polygons. Falls back to spot bounding boxes."""
    import math
    AREA_CACHE = Path(__file__).parent.parent / "data" / "area-cache.json"
    AREA_OUTPUT = Path(__file__).parent.parent / "data" / "areas.json"

    cache = {}
    if AREA_CACHE.exists():
        with open(AREA_CACHE) as f:
            cache = json.load(f)

    # Get unique area names and their spots
    area_spots = {}
    for s in spots:
        area = s["area"]
        if area and s["lat"]:
            area_spots.setdefault(area, []).append(s)

    geolocator = Nominatim(user_agent="obo-parking-map")
    geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1.1)

    areas_output = {}
    new_queries = [a for a in area_spots if a not in cache]
    print(f"Geocoding {len(new_queries)} area boundaries...")

    for area in new_queries:
        # Try Nominatim with GeoJSON
        try:
            loc = geocode(f"{area}, Örebro", geometry="geojson", addressdetails=True)
            if loc and "geojson" in loc.raw:
                geo = loc.raw["geojson"]
                cls = loc.raw.get("class", "")
                t = loc.raw.get("type", "")
                bbox = loc.raw.get("boundingbox", [])
                cache[area] = {
                    "type": "geojson",
                    "geometry": geo,
                    "source": f"{cls}/{t}",
                }
                areas_output[area] = cache[area]
                continue
        except Exception:
            pass

        # Fallback: bounding box of all spots in this area
        pts = area_spots[area]
        lats = [s["lat"] for s in pts]
        lons = [s["lon"] for s in pts]
        pad = 0.002  # ~200m padding
        coords = [[
            [min(lons) - pad, min(lats) - pad],
            [max(lons) + pad, min(lats) - pad],
            [max(lons) + pad, max(lats) + pad],
            [min(lons) - pad, max(lats) + pad],
            [min(lons) - pad, min(lats) - pad],
        ]]
        cache[area] = {
            "type": "bbox",
            "geometry": {"type": "Polygon", "coordinates": coords},
            "source": "spot-bbox",
        }
        areas_output[area] = cache[area]

    # Also handle cached entries
    for area in area_spots:
        if area in cache and area not in areas_output:
            areas_output[area] = cache[area]

    with open(AREA_CACHE, "w") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    with open(AREA_OUTPUT, "w") as f:
        json.dump(areas_output, f, ensure_ascii=False, indent=2)

    geojson_count = sum(1 for a in areas_output.values() if a["type"] == "geojson")
    print(f"  Areas: {len(areas_output)} total, {geojson_count} with real boundaries, "
          f"{len(areas_output) - geojson_count} fallback bboxes → {AREA_OUTPUT}")
    return areas_output


def main():
    print("=== OBO Parking Map — Data Pipeline ===")
    print("\n=== Fetching from API ===")
    items = fetch_all()
    print("\n=== Normalizing ===")
    spots = [normalize_spot(item) for item in items]
    print("\n=== Geocoding (Geoapify + Nominatim fallback) ===")
    spots = geocode_addresses(spots)
    geocoded = sum(1 for s in spots if s["lat"])
    not_found = sum(1 for s in spots if not s["lat"])
    print(f"\n=== Writing: {OUTPUT} ===")
    output = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total": len(spots),
        "geocoded": geocoded,
        "notFound": not_found,
        "spots": spots,
    }
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"Done! {geocoded} geocoded, {not_found} not found ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
