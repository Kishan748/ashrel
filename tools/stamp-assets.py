"""Stamp CSS/JS links with a content hash so deploys can't serve stale assets.

Cloudflare Pages sends static assets with max-age=14400 while HTML is served
fresh. Without a version in the URL a returning visitor gets new HTML with
four-hour-old CSS and JS, which means markup whose rules and behaviour simply
aren't there yet.

Appending a hash of each file's contents means the URL changes whenever the
file does, so caches are bypassed exactly when it matters and reused the rest
of the time.

Run before deploying whenever css/site.css or js/site.js changed:

    python3 tools/stamp-assets.py
"""

from __future__ import annotations

import glob
import hashlib
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Asset path as referenced in HTML -> file on disk.
ASSETS = {
    "/css/site.css": "css/site.css",
    "/js/site.js": "js/site.js",
}


def short_hash(path: str) -> str:
    with open(os.path.join(ROOT, path), "rb") as handle:
        return hashlib.md5(handle.read()).hexdigest()[:10]


def main() -> None:
    versions = {ref: short_hash(rel) for ref, rel in ASSETS.items()}

    pages = sorted(
        glob.glob(os.path.join(ROOT, "*.html"))
        + glob.glob(os.path.join(ROOT, "insights", "*.html"))
    )

    changed = 0
    for page in pages:
        with open(page, encoding="utf-8") as handle:
            html = handle.read()
        original = html

        for ref, version in versions.items():
            # Match the asset with or without an existing ?v= stamp.
            pattern = re.escape(ref) + r"(\?v=[0-9a-f]+)?"
            html = re.sub(pattern, ref + "?v=" + version, html)

        if html != original:
            with open(page, "w", encoding="utf-8") as handle:
                handle.write(html)
            changed += 1

    for ref, version in versions.items():
        print(f"{ref:16} -> ?v={version}")
    print(f"{changed} of {len(pages)} pages updated")


if __name__ == "__main__":
    main()
