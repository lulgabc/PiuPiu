#!/usr/bin/env python3
"""Extract the poems from the local DK anthology into a private JSON library.

The book is copyrighted by DK and the individual poets. The generated file is
for personal/local use only. It is written to `data/poetry.local.json`, which is
gitignored, plus a portable copy in ~/Downloads for the in-app importer.

Usage:
  python3 tools/extract-poems.py "/path/to/A World Full of Poems.pdf"
"""

from __future__ import annotations

import json
import os
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError as exc:  # pragma: no cover - developer tool
    raise SystemExit("PyMuPDF is required: python3 -m pip install pymupdf") from exc

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = Path.home() / "Downloads" / "A World Full of Poems Inspiring poetry for children.pdf"
LOCAL_OUT = ROOT / "data" / "poetry.local.json"
IMPORT_OUT = Path.home() / "Downloads" / "PiuPiu-poetry-library.json"

CATEGORY_META = {
    "FAMILY AND FRIENDS": {"id": "family", "name": "Family and Friends", "hue": 12, "icon": "users"},
    "FEELINGS": {"id": "feelings", "name": "Feelings", "hue": 300, "icon": "heart"},
    "ANIMALS AND NATURE": {"id": "animals", "name": "Animals and Nature", "hue": 140, "icon": "paw"},
    "CITIES, TOWNS, AND TRAVEL": {"id": "cities", "name": "Cities, Towns, and Travel", "hue": 205, "icon": "bus"},
    "FUN AND GAMES": {"id": "fun", "name": "Fun and Games", "hue": 45, "icon": "ball"},
    "SCIENCE AND ART": {"id": "science", "name": "Science and Art", "hue": 185, "icon": "palette"},
    "BODY AND HEALTH": {"id": "body", "name": "Body and Health", "hue": 340, "icon": "person"},
    "A WORLD OF LEARNING": {"id": "learning", "name": "A World of Learning", "hue": 265, "icon": "book"},
}

NOTE_RE = re.compile(r"^(Note|NOTE|Activity|ACTIVITY|Did you know|DID YOU KNOW)\b")


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\u00a0", " ")).strip()


def slug(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def is_page_number(block: dict) -> bool:
    return bool(re.fullmatch(r"\s*\d{1,3}\s*", block["text"]))


def clean_lines(lines: list[str]) -> tuple[list[str], list[int]]:
    flat: list[str] = []
    stanza_starts: list[int] = []
    pending_break = False
    for raw in lines:
        line = raw.strip()
        if not line:
            if flat:
                pending_break = True
            continue
        if re.fullmatch(r"\d{1,3}", line):
            continue
        if NOTE_RE.match(line):
            break
        if pending_break:
            stanza_starts.append(len(flat))
            pending_break = False
        flat.append(line)
    if not stanza_starts or stanza_starts[0] != 0:
        stanza_starts = [0, *stanza_starts]
    return flat, stanza_starts


def page_blocks(doc, page_number: int) -> list[dict]:
    blocks = []
    page = doc[page_number - 1]
    for block in page.get_text("blocks"):
        x0, y0, x1, y1, text, *_ = block
        text = text.strip("\n")
        if not text.strip():
            continue
        blocks.append({"x0": x0, "y0": y0, "x1": x1, "y1": y1, "text": text})
    return blocks


def poem_body(doc, page_number: int, title: str, author: str, is_start: bool) -> list[str]:
    blocks = page_blocks(doc, page_number)
    body: list[dict]
    if is_start:
        title_index = author_index = None
        for index, block in enumerate(blocks):
            text = norm(block["text"])
            if title_index is None and (text == title or title.lower() in text.lower()):
                title_index = index
            if author_index is None and author and (text == author or author.lower() in text.lower()):
                author_index = index
        if author_index is not None:
            cutoff = blocks[author_index]["y1"] - 2
        elif title_index is not None:
            cutoff = blocks[title_index]["y1"] + 4
        else:
            cutoff = -1
        body = [block for block in blocks if block["y0"] >= cutoff]
    else:
        body = blocks[:]
    body = [
        block
        for block in body
        if not is_page_number(block)
        and not NOTE_RE.match(norm(block["text"]))
    ]
    lines: list[str] = []
    for block in body:
        text = norm(block["text"])
        if is_start and (text == title or text == author):
            continue
        lines.extend(block["text"].splitlines())
    return lines


def build_library(source_path: Path) -> dict:
    doc = fitz.open(source_path)
    toc = doc.get_toc()
    entries = [{"level": level, "title": norm(title), "page": page} for level, title, page in toc]

    categories = []
    for entry in entries:
        if entry["level"] != 1:
            continue
        meta = CATEGORY_META.get(entry["title"])
        if meta and meta not in categories:
            categories.append(meta)

    poems = []
    for index, entry in enumerate(entries):
        if entry["level"] != 2 or entry["title"] == "Poetry activities":
            continue
        category_title = None
        for back in range(index, -1, -1):
            if entries[back]["level"] == 1:
                category_title = entries[back]["title"]
                break
        meta = CATEGORY_META.get(category_title or "")
        if not meta:
            continue
        start = entry["page"]
        end = entries[index + 1]["page"] - 1 if index + 1 < len(entries) else doc.page_count
        end = max(start, end)
        raw = entry["title"]
        if "—" in raw:
            title, author = raw.rsplit("—", 1)
        elif " – " in raw:
            title, author = raw.rsplit(" – ", 1)
        else:
            title, author = raw, ""
        title = norm(title)
        author = norm(author)
        lines: list[str] = []
        for page_number in range(start, end + 1):
            lines.extend(poem_body(doc, page_number, title, author, page_number == start))
            lines.append("")
        flat, stanza_starts = clean_lines(lines)
        if not flat:
            print(f"warning: empty poem skipped: {raw}", file=sys.stderr)
            continue
        poems.append(
            {
                "id": f"{slug(title)}-{start}",
                "category": meta["id"],
                "title": title,
                "author": author,
                "page": max(1, start - 2),
                "lines": flat,
                "stanzaStarts": stanza_starts,
            }
        )
    doc.close()
    return {
        "version": 1,
        "source": "A World Full of Poems (DK, 2020), selected by Sylvia M. Vardell",
        "rights": "Personal use only. The source book and individual poems are copyrighted; do not redistribute this file without permission.",
        "categories": categories,
        "poems": poems,
    }


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    if not source.exists():
        raise SystemExit(f"PDF not found: {source}")
    library = build_library(source)
    LOCAL_OUT.parent.mkdir(parents=True, exist_ok=True)
    LOCAL_OUT.write_text(json.dumps(library, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    IMPORT_OUT.write_text(json.dumps(library, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    counts = Counter(poem["category"] for poem in library["poems"])
    print(f"Wrote {len(library['poems'])} poems to {LOCAL_OUT}")
    print(f"Portable import copy: {IMPORT_OUT}")
    for category in library["categories"]:
        print(f"  {category['id']:9} {counts.get(category['id'], 0):3}  {category['name']}")


if __name__ == "__main__":
    main()
