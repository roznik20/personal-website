"""
Scans the photos/ directory, reads EXIF from any new images,
auto-categorises them, and updates photos/manifest.json.

Existing entries are preserved — user-set fields (title, location, category)
are never overwritten. Only new files get appended.

Categorisation heuristics (can be overridden manually in manifest.json):
  - ISO >= 1600 + exposure >= 4s  → astrophotography
  - Hour 21:00–05:00              → night
  - Hour 05:00–08:00 or 17:00–21:00 → golden hour
  - Everything else               → day
"""

import json
from datetime import datetime
from pathlib import Path

PHOTOS_DIR = Path("photos")
MANIFEST   = PHOTOS_DIR / "manifest.json"
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def categorise(hour: int, iso: float, exposure_sec: float) -> str:
    if iso >= 1600 and exposure_sec >= 4:
        return "astrophotography"
    if hour >= 21 or hour < 5:
        return "night"
    if (5 <= hour < 8) or (17 <= hour < 21):
        return "golden hour"
    return "day"


def read_exif(path: Path) -> dict:
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS

        img = Image.open(path)
        raw = img._getexif()
        if not raw:
            return {}

        exif = {TAGS.get(k, k): v for k, v in raw.items()}
        result = {}

        # Date & time
        dt_str = exif.get("DateTimeOriginal") or exif.get("DateTime")
        if dt_str:
            try:
                dt = datetime.strptime(str(dt_str), "%Y:%m:%d %H:%M:%S")
                result["date"]  = dt.strftime("%Y-%m")
                result["_hour"] = dt.hour
            except ValueError:
                pass

        # Camera
        make  = str(exif.get("Make",  "")).strip()
        model = str(exif.get("Model", "")).strip()
        if model:
            result["camera"] = (f"{make} {model}".strip()
                                if make and make not in model else model)

        # Technical settings string
        parts = []
        fl = exif.get("FocalLength")
        if fl is not None:
            parts.append(f"{int(fl)}mm")

        fn = exif.get("FNumber")
        if fn is not None:
            parts.append(f"f/{fn}")

        et = exif.get("ExposureTime")
        if et is not None:
            result["_exposure_sec"] = float(et)
            if et < 1:
                parts.append(f"1/{int(round(1 / et))}s")
            else:
                parts.append(f"{et}s")

        iso_val = exif.get("ISOSpeedRatings")
        if iso_val is not None:
            result["_iso"] = float(iso_val)
            parts.append(f"ISO {iso_val}")

        if parts:
            result["exif"] = " \u00b7 ".join(parts)

        return result

    except Exception as e:
        print(f"  EXIF error on {path.name}: {e}")
        return {}


def main():
    # Load existing manifest, keyed by filename
    existing: dict[str, dict] = {}
    if MANIFEST.exists():
        with open(MANIFEST, encoding="utf-8") as f:
            for entry in json.load(f):
                existing[entry["file"]] = entry

    # Collect all image files (sorted for deterministic order)
    image_files = sorted(
        p.name for p in PHOTOS_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in EXTENSIONS
    )

    manifest = []
    added = 0

    for filename in image_files:
        if filename in existing:
            manifest.append(existing[filename])
            continue

        # New file — read EXIF and categorise
        print(f"  + {filename}")
        exif = read_exif(PHOTOS_DIR / filename)

        hour        = exif.pop("_hour",         12)
        iso         = exif.pop("_iso",           0)
        exposure    = exif.pop("_exposure_sec",  0)

        entry = {
            "file":     filename,
            "title":    "",
            "location": "",
            "date":     exif.get("date",   ""),
            "category": categorise(hour, iso, exposure),
            "camera":   exif.get("camera", ""),
            "exif":     exif.get("exif",   ""),
        }
        manifest.append(entry)
        added += 1

    if added == 0:
        print("Manifest already up to date.")
        return

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"Manifest updated — {added} new file(s), {len(manifest)} total.")


if __name__ == "__main__":
    main()
