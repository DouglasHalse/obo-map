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
TYPE_IDS = {
    "QFpVYrKF9r9rBRR4MqqRCFxg": "public",   # Bilplats allman
    "parking":                    "tenant",   # Bilplats hyresgast
}
LIMIT = 100
OUTPUT = Path(__file__).parent.parent / "data" / "parking-spots.json"
GEOCODE_CACHE = Path(__file__).parent.parent / "data" / "geocode-cache.json"

HEADERS = {
    "X-Api-Key": API_KEY,
    "Accept": "application/json",
}

# Known Orebro neighborhoods (longest-match-first)
OREBRO_AREAS = [
    "Adolfsberg/Mosas", "Bjorkhaga/Karlslund", "Brickebacken",
    "Baronbackarna", "Centralt Oster", "Centralt", "Garphyttan",
    "Ladugardsangen", "Lillan", "Markbacken", "Norr", "Rosta",
    "Sorbyangen", "Tengvallsgatan", "Tybble/Sorby", "Varberga",
    "Vasastan", "Vintrosa/Latorp", "Vivalla", "Vasthaga",
    "Almby/Nasby", "Ornsro", "Osternarke",
]

# Abbreviation fixes for Nominatim (normalize before geocoding)
ADDRESS_FIXES = {
    "L Wivallius väg":   "Lars Wivallius väg",
    "Lars Wivallius väg": "Lars Wivallius väg",  # already ok
    "Hj Bergmans Väg":   "Hjalmar Bergmans väg",
    "Hj Bergmans väg":   "Hjalmar Bergmans väg",
    "Ö Vintergatan":     "Östra Vintergatan",
}


def parse_date(ms_str):
    """Parse /Date(1234567890000)/ to ISO date string."""
    if not ms_str:
        return None
    try:
        ms = int(ms_str.strip("/Date()"))
        from datetime import datetime, timezone
        return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return None


def fetch_all():
    """Fetch all parking spots from both public and tenant tabs."""
    items = []

    for type_id, source in TYPE_IDS.items():
        print(f"\n--- Fetching type={type_id} ({source}) ---")
        params = {"type": type_id, "limit": LIMIT, "offset": 0}
        url = f"{API_BASE}?{urlencode(params)}"
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        total = data["count"]
        batch = data["items"]
        for item in batch:
            item["_source"] = source
        items.extend(batch)
        print(f"  Total: {total}, page 1 ({len(batch)} items)")

        for offset in range(LIMIT, total, LIMIT):
            params["offset"] = offset
            url = f"{API_BASE}?{urlencode(params)}"
            resp = requests.get(url, headers=HEADERS, timeout=30)
            resp.raise_for_status()
            page = resp.json()
            batch = page["items"]
            for item in batch:
                item["_source"] = source
            items.extend(batch)
            print(f"  offset={offset}, got {len(batch)} (total so far: {len(items)})")

    print(f"\nTotal fetched: {len(items)} items from {len(TYPE_IDS)} sources")
    return items


def normalize_spot(item):
    """Extract only the fields we need for the map."""
    loc = item.get("location", {})
    area_info = loc.get("area", {})
    pricing = item.get("pricing", {})
    avail = item.get("availability", {})
    size = item.get("size", {})
    thumb = item.get("thumbnail", {})

    # Bulk endpoint doesn't include address details — use displayName as street address
    display_name = item.get("displayName", "")
    area_display = area_info.get("displayName", "")

    # Build geocode query: street address + Orebro, Sweden
    geocode_query = f"{display_name}, Orebro, Sweden"

    return {
        "id": item["id"],
        "number": item.get("number", ""),
        "displayName": display_name,
        "type": size.get("roomsDisplayName", ""),
        "area": area_display,
        "areaPath": [a.get("displayName", "") for a in loc.get("areaPath", [])],
        "source": item.get("_source", "unknown"),
        "address": {
            "street": display_name,
            "number": "",
            "postcode": "",
            "city": "Örebro",
            "full": display_name,
            "geocodeQuery": geocode_query,
        },
        "price": pricing.get("price"),
        "priceInclVAT": pricing.get("priceInclVAT"),
        "availableFrom": parse_date(avail.get("availableFrom")),
        "signNumber": loc.get("signNumber", "").strip() if loc.get("signNumber") else "",
        "image": thumb.get("exists") and item["id"] or None,
        "queueType": item.get("queueType", ""),
    }


def geocode_addresses(spots):
    """Geocode all unique addresses with caching and abbreviation fixes."""
    cache = {}
    if GEOCODE_CACHE.exists():
        with open(GEOCODE_CACHE) as f:
            cache = json.load(f)
        print(f"Loaded {len(cache)} cached geocode results")

    geolocator = Nominatim(user_agent="obo-parking-map")
    geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1.1)

    # Build unique addresses with abbreviation fixes
    unique_addresses = {}
    for spot in spots:
        addr = spot["address"]["geocodeQuery"]
        # Apply known abbreviation fixes
        for short, full in ADDRESS_FIXES.items():
            if short in addr:
                addr = addr.replace(short, full)
                spot["address"]["geocodeQuery"] = addr
        if addr not in unique_addresses:
            unique_addresses[addr] = []

    to_geocode = [a for a in unique_addresses if a not in cache]
    print(f"Need to geocode {len(to_geocode)} new addresses (~{len(to_geocode) * 1.1:.0f}s)")

    for i, addr in enumerate(to_geocode):
        try:
            location = geocode(addr)
            if location:
                cache[addr] = {"lat": location.latitude, "lon": location.longitude}
            else:
                cache[addr] = {"lat": None, "lon": None}
                print(f"  [{i+1}/{len(to_geocode)}] NOT FOUND: {addr}")
        except Exception as e:
            cache[addr] = {"lat": None, "lon": None}
            print(f"  [{i+1}/{len(to_geocode)}] ERROR: {addr} — {e}")

        if (i + 1) % 10 == 0:
            with open(GEOCODE_CACHE, "w") as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)
            print(f"  Saved cache ({len(cache)} entries)")

        time.sleep(1.1)

    with open(GEOCODE_CACHE, "w") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    # Attach coordinates
    for spot in spots:
        addr = spot["address"]["geocodeQuery"]
        coords = cache.get(addr, {})
        spot["lat"] = coords.get("lat")
        spot["lon"] = coords.get("lon")

    return spots


def main():
    print("=== OBO Parking Map — Data Pipeline ===")

    print("\n=== Fetching from API ===")
    items = fetch_all()
    print(f"Fetched {len(items)} raw items")

    print("\n=== Normalizing data ===")
    spots = [normalize_spot(item) for item in items]

    print("\n=== Geocoding addresses ===")
    spots = geocode_addresses(spots)

    geocoded = sum(1 for s in spots if s["lat"])
    not_found = sum(1 for s in spots if not s["lat"])

    print(f"\n=== Writing output: {OUTPUT} ===")
    output = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total": len(spots),
        "geocoded": geocoded,
        "notFound": not_found,
        "spots": spots,
    }

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Done! {geocoded} geocoded, {not_found} not found")
    print(f"Output: {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
