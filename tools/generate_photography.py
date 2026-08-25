"""Generate the ambient workplace photography for the Ashrel site.

Two images only, both used as darkened backgrounds behind text:

  hero-people.jpg  — right-weighted subject; the left half sits under the
                     headline, so the composition must keep that side quiet.
  band-people.jpg  — wide room shot; the scrim runs dark on the left, so the
                     subject belongs right of centre.

These are ambient images in the stock-photography sense. They are never
presented as Ashrel staff, clients, or the authors of a testimonial.

Usage:
    hf auth login          # or export HF_TOKEN=...
    python3 tools/generate_photography.py [--model MODEL] [--only hero|band]
"""

from __future__ import annotations

import argparse
import os
import sys

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "img")

DEFAULT_MODEL = "black-forest-labs/FLUX.1-dev"

# Shared style so the two frames read as one shoot.
STYLE = (
    "editorial corporate photography, natural window light, cool desaturated "
    "colour grade with deep navy shadows, shallow depth of field, 35mm, "
    "photorealistic, candid unposed moment, no text, no logos, no watermark"
)

NEGATIVE = (
    "illustration, 3d render, cartoon, cgi, plastic skin, oversaturated, "
    "stock-photo smile, direct eye contact with camera, text, watermark, logo, "
    "distorted hands, extra fingers, deformed face"
)

PROMPTS = {
    "hero": {
        "prompt": (
            "A professional working at a laptop in a modern Australian corporate "
            "office, seated at a glass desk beside floor-to-ceiling windows, "
            "looking down at the screen in concentration. Subject positioned on "
            "the right third of the frame; the left third is empty office space "
            "and soft window light. Muted charcoal and slate tones. " + STYLE
        ),
        "width": 1600,
        "height": 1000,
        "file": "hero-people.jpg",
    },
    "band": {
        "prompt": (
            "Two colleagues in quiet discussion beside a meeting room window in a "
            "corporate office, one gesturing at a laptop, both in profile, "
            "mid-conversation. Wide horizontal composition with the pair on the "
            "right side of the frame and open, uncluttered office space filling "
            "the left half. Muted navy and grey palette. " + STYLE
        ),
        "width": 1600,
        "height": 900,
        "file": "band-people.jpg",
    },
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--only", choices=sorted(PROMPTS), help="generate a single image")
    parser.add_argument("--steps", type=int, default=30)
    args = parser.parse_args()

    try:
        from huggingface_hub import InferenceClient, get_token
    except ImportError:
        print("huggingface_hub is not installed. Run: pip install huggingface_hub", file=sys.stderr)
        return 1

    token = get_token() or os.environ.get("HF_TOKEN")
    if not token:
        print(
            "No Hugging Face token found.\n"
            "  Run  hf auth login\n"
            "  or   export HF_TOKEN=hf_...",
            file=sys.stderr,
        )
        return 1

    client = InferenceClient(model=args.model, token=token)
    os.makedirs(OUT_DIR, exist_ok=True)

    wanted = [args.only] if args.only else list(PROMPTS)
    for name in wanted:
        spec = PROMPTS[name]
        destination = os.path.join(OUT_DIR, spec["file"])
        print(f"generating {name} -> img/{spec['file']} ({spec['width']}x{spec['height']})")

        image = client.text_to_image(
            spec["prompt"],
            negative_prompt=NEGATIVE,
            width=spec["width"],
            height=spec["height"],
            num_inference_steps=args.steps,
        )
        image.convert("RGB").save(destination, "JPEG", quality=82, optimize=True)
        size_kb = os.path.getsize(destination) / 1024
        print(f"  saved {size_kb:.0f}KB")

    print("\nDone. Review the files before committing — regenerate any frame whose "
          "composition crowds the text area.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
