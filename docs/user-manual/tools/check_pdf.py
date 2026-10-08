"""Acceptance checks for the user manual (see docs/user-manual/GATES.md).

Usage: py -I docs/user-manual/tools/check_pdf.py <path> <headings|shots|callouts|density|secrets|render>
"""
import re
import sys
from pathlib import Path

HEADINGS = [
    "Introduction to MathPulse AI",
    "Software & Hardware Specifications",
    "Installation & Deployment Guide",
    "System Access & Authentication",
    "Users Functions and Capabilities Guide",
    "Troubleshooting & Common Issues (FAQ)",
    "System Maintenance & Security",
    "Appendix A: Glossary of Terms & System Definitions",
]
WORD_LIMIT = 260


def page_texts(pdf_path):
    import pymupdf

    with pymupdf.open(pdf_path) as doc:
        return [page.get_text() for page in doc]


def normalize(text):
    return re.sub(r"\s+", " ", text).replace("’", "'").upper()


def check_headings(path):
    texts = page_texts(path)
    # Skip the table of contents (page 2) so a heading only counts where its section starts.
    body = normalize(" ".join(texts[2:]))
    found = [heading for heading in HEADINGS if normalize(heading) in body]
    missing = [heading for heading in HEADINGS if heading not in found]
    print(f"pages: {len(texts)}")
    print(f"headings: {len(found)}/{len(HEADINGS)}")
    for heading in missing:
        print(f"missing: {heading}")


def check_shots(path):
    from PIL import Image

    counts = {"student": 0, "teacher": 0, "admin": 0}
    prefix = {"s": "student", "t": "teacher", "a": "admin"}
    bad = []
    for png in sorted(Path(path).glob("*.png")):
        role = prefix.get(png.name[0])
        if role:
            counts[role] += 1
        with Image.open(png) as image:
            if image.size != (780, 1688):
                bad.append(f"{png.name} {image.size}")
    print(" ".join(f"{role}={count}" for role, count in counts.items()) + f" bad_size={len(bad)}")
    for line in bad:
        print(f"bad: {line}")


def check_callouts(path):
    html = Path(path).read_text(encoding="utf-8")
    print(f"callouts={len(re.findall(r'class=\"zoom\"', html))}")


def check_density(path):
    counts = [len(text.split()) for text in page_texts(path)]
    over = [(index + 1, count) for index, count in enumerate(counts) if count > WORD_LIMIT]
    print(f"max_words={max(counts)} limit={WORD_LIMIT} over_limit={len(over)}")
    for page, count in over:
        print(f"page {page}: {count} words")


def check_secrets(path):
    text = " ".join(page_texts(path))
    hits = re.findall(r"@123456|Password\s*:\s*\S+", text)
    print(f"secrets={len(hits)}")


def check_render(path):
    # PDFium is the engine inside Chrome and Edge, so this is what most readers will see.
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument(path)
    blank, letter = 0, 0
    for index in range(len(pdf)):
        page = pdf[index]
        width, height = page.get_size()
        letter += round(width) == 612 and round(height) == 792
        gray = page.render(scale=0.3).to_pil().convert("L")
        white = sum(gray.histogram()[245:]) / (gray.width * gray.height)
        if white > 0.97:
            blank += 1
            print(f"blank page {index + 1}")
    print(f"pages={len(pdf)} letter={letter} blank={blank}")


CHECKS = {
    "render": check_render,
    "headings": check_headings,
    "shots": check_shots,
    "callouts": check_callouts,
    "density": check_density,
    "secrets": check_secrets,
}

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    CHECKS[sys.argv[2]](sys.argv[1])
