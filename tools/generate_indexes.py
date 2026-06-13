#!/usr/bin/env python3
"""Generate yuki Slide Archive listing pages from the folder structure."""

from __future__ import annotations

import re
from dataclasses import dataclass
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parents[1]
YEAR_RE = re.compile(r"^\d{4}$")
MONTH_RE = re.compile(r"^(0[1-9]|1[0-2])$")
SITE_NAME = "yuki Slide Archive"
SITE_DESCRIPTION = "共有用 html-slide_archive"

GENERATED_COMMENT = (
    "<!-- このファイルは tools/generate_indexes.py が自動生成しています。"
    "手動編集せず、フォルダ構成を変更してからスクリプトを実行してください。 -->"
)

# Liquid Glass の4層構造(filter=ぼかし+屈折 / overlay=色 / specular=縁の光 / content=中身)
GLASS_LAYERS = (
    '<span class="glass__filter" aria-hidden="true"></span>'
    '<span class="glass__overlay" aria-hidden="true"></span>'
    '<span class="glass__specular" aria-hidden="true"></span>'
)

# 背景の液状屈折に使う SVG フィルタ(snipzy.dev 系の feTurbulence + feDisplacementMap)
SVG_DEFS = (
    '  <svg class="liquid-glass-defs" aria-hidden="true" focusable="false" '
    'width="0" height="0">\n'
    '    <filter id="liquidGlass" x="-20%" y="-20%" width="140%" height="140%" '
    'color-interpolation-filters="sRGB">\n'
    '      <feTurbulence type="turbulence" baseFrequency="0.008" numOctaves="2" '
    'seed="12" result="noise"></feTurbulence>\n'
    '      <feDisplacementMap in="SourceGraphic" in2="noise" scale="70" '
    'xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>\n'
    '    </filter>\n'
    '  </svg>'
)


def glass_breadcrumb(inner: str) -> str:
    return "\n".join(
        [
            '    <nav class="breadcrumb glass">',
            f"      {GLASS_LAYERS}",
            f'      <span class="glass__content breadcrumb__content">{inner}</span>',
            "    </nav>",
        ]
    )


def glass_back_link(href: str, label: str) -> str:
    return "\n".join(
        [
            f'    <a class="back-link glass" href="{escape(href, quote=True)}">',
            f"      {GLASS_LAYERS}",
            f'      <span class="glass__content">← {escape(label)}</span>',
            "    </a>",
        ]
    )


@dataclass(frozen=True)
class Slide:
    slug: str
    title: str
    description: str
    href: str


@dataclass(frozen=True)
class Month:
    slug: str
    slides: list[Slide]


@dataclass(frozen=True)
class Year:
    slug: str
    months: list[Month]


class MetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title = ""
        self.h1 = ""
        self.description = ""
        self.og_description = ""
        self._capture: str | None = None
        self._buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = {key.lower(): value or "" for key, value in attrs}

        if tag == "meta":
            name = attr.get("name", "").lower()
            prop = attr.get("property", "").lower()
            content = normalize(attr.get("content", ""))
            if content and name == "description" and not self.description:
                self.description = content
            if content and prop == "og:description" and not self.og_description:
                self.og_description = content
            return

        if tag in {"title", "h1"}:
            self._capture = tag
            self._buffer = []

    def handle_data(self, data: str) -> None:
        if self._capture:
            self._buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag != self._capture:
            return

        text = normalize("".join(self._buffer))
        if tag == "title" and text and not self.title:
            self.title = clean_title(text)
        if tag == "h1" and text and not self.h1:
            self.h1 = text
        self._capture = None
        self._buffer = []


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def clean_title(text: str) -> str:
    text = normalize(text)
    text = re.sub(r"\s*[|｜]\s*(yuki Slide Archive|Slide Archive)\s*$", "", text)
    return text


def title_from_slug(slug: str) -> str:
    return slug.replace("-", " ").replace("_", " ").title()


def href_segment(segment: str) -> str:
    return quote(segment, safe="-._~")


def trim(text: str, limit: int = 120) -> str:
    text = normalize(text)
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def find_entry_html(slide_dir: Path) -> Path | None:
    """スライドフォルダ内から入口になるHTMLを探す。

    index.html を最優先し、無ければ浅い階層のHTMLを採用する。
    """
    candidates = sorted(
        (p for p in slide_dir.rglob("*.html") if p.is_file()),
        key=lambda p: (
            p.name.lower() != "index.html",
            len(p.relative_to(slide_dir).parts),
            str(p.relative_to(slide_dir)).lower(),
        ),
    )
    return candidates[0] if candidates else None


def read_slide(slide_dir: Path) -> Slide | None:
    entry_path = find_entry_html(slide_dir)
    if entry_path is None:
        return None

    parser = MetadataParser()
    try:
        parser.feed(entry_path.read_text(encoding="utf-8"))
    except UnicodeDecodeError:
        parser.feed(entry_path.read_text(encoding="utf-8", errors="replace"))

    rel_parts = entry_path.relative_to(slide_dir.parent).parts
    if entry_path.name.lower() == "index.html":
        href = "/".join(href_segment(part) for part in rel_parts[:-1]) + "/"
    else:
        href = "/".join(href_segment(part) for part in rel_parts)

    title = parser.title or parser.h1 or title_from_slug(slide_dir.name)
    description = (
        parser.description
        or parser.og_description
        or f"{slide_dir.name}/ に置かれているHTMLスライド"
    )
    return Slide(slug=slide_dir.name, title=title, description=trim(description), href=href)


def find_month(month_dir: Path) -> Month:
    slides = []
    for slide_dir in sorted((p for p in month_dir.iterdir() if p.is_dir()), key=lambda p: p.name):
        slide = read_slide(slide_dir)
        if slide:
            slides.append(slide)
    return Month(slug=month_dir.name, slides=slides)


def find_years(base_dir: Path) -> list[Year]:
    if not base_dir.is_dir():
        return []

    years = []
    for year_dir in sorted(
        (p for p in base_dir.iterdir() if p.is_dir() and YEAR_RE.fullmatch(p.name)),
        key=lambda p: p.name,
        reverse=True,
    ):
        months = []
        for month_dir in sorted(
            (p for p in year_dir.iterdir() if p.is_dir() and MONTH_RE.fullmatch(p.name)),
            key=lambda p: p.name,
            reverse=True,
        ):
            month = find_month(month_dir)
            if month.slides:
                months.append(month)
        if months:
            years.append(Year(slug=year_dir.name, months=months))
    return years


def slide_count(year: Year) -> int:
    return sum(len(month.slides) for month in year.months)


def total_slide_count(years: list[Year]) -> int:
    return sum(slide_count(year) for year in years)


def card_list(items: list[tuple[str, str, str]], empty_message: str) -> str:
    if not items:
        return f"    <p class=\"empty-note\">{escape(empty_message)}</p>"

    lines = ["    <ul class=\"card-list\">"]
    for href, title, description in items:
        lines.extend(
            [
                "      <li>",
                f"        <a class=\"card glass\" href=\"{escape(href, quote=True)}\">",
                f"          {GLASS_LAYERS}",
                "          <span class=\"glass__content card__content\">",
                f"            <span class=\"card-title\">{escape(title)}</span>",
                f"            <span class=\"card-desc\">{escape(description)}</span>",
                "            <span class=\"card-arrow\" aria-hidden=\"true\"></span>",
                "          </span>",
                "        </a>",
                "      </li>",
            ]
        )
    lines.append("    </ul>")
    return "\n".join(lines)


def page(title: str, css_href: str, header_title: str, header_desc: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{escape(title)}</title>
  <script>
    (function() {{
      var theme = "light";
      try {{
        theme = localStorage.getItem("slide-archive-theme") ||
          (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      }} catch (error) {{
        theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }}
      document.documentElement.dataset.theme = theme;
    }})();
  </script>
  <link rel="stylesheet" href="{escape(css_href, quote=True)}">
</head>
<body>
  {GENERATED_COMMENT}
{SVG_DEFS}
  <header class="site-header">
    <div class="site-header__inner glass">
      {GLASS_LAYERS}
      <div class="glass__content site-header__content">
        <div class="site-header__copy">
          <h1>{escape(header_title)}</h1>
          <p>{escape(header_desc)}</p>
        </div>
        <button class="theme-toggle glass" type="button" data-theme-toggle aria-label="ダークモードとライトモードを切り替える" aria-pressed="false">
          {GLASS_LAYERS}
          <span class="glass__content theme-toggle__content">
            <span class="theme-toggle__track" aria-hidden="true">
              <span class="theme-toggle__thumb"></span>
            </span>
            <span class="theme-toggle__label" data-theme-label>Light</span>
          </span>
        </button>
      </div>
    </div>
  </header>

  <main class="container">
{body}
  </main>

  <footer class="site-footer">
    {escape(SITE_NAME)} - 静的HTMLスライド置き場
  </footer>
  <script>
    (function() {{
      var root = document.documentElement;
      var button = document.querySelector("[data-theme-toggle]");
      var label = document.querySelector("[data-theme-label]");
      var media = window.matchMedia("(prefers-color-scheme: dark)");

      function storedTheme() {{
        try {{
          return localStorage.getItem("slide-archive-theme");
        }} catch (error) {{
          return null;
        }}
      }}

      function setStoredTheme(theme) {{
        try {{
          localStorage.setItem("slide-archive-theme", theme);
        }} catch (error) {{
          return;
        }}
      }}

      function applyTheme(theme) {{
        root.dataset.theme = theme;
        if (button) {{
          button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
        }}
        if (label) {{
          label.textContent = theme === "dark" ? "Dark" : "Light";
        }}
      }}

      applyTheme(root.dataset.theme === "dark" ? "dark" : "light");

      if (button) {{
        button.addEventListener("click", function() {{
          var next = root.dataset.theme === "dark" ? "light" : "dark";
          applyTheme(next);
          setStoredTheme(next);
        }});
      }}

      media.addEventListener("change", function(event) {{
        if (!storedTheme()) {{
          applyTheme(event.matches ? "dark" : "light");
        }}
      }});
    }})();
  </script>
</body>
</html>
"""


def root_body(years: list[Year], archive_years: list[Year]) -> str:
    year_items = [
        (
            f"{href_segment(year.slug)}/",
            f"{year.slug}年",
            f"{year.slug}年のスライド一覧({slide_count(year)}件)",
        )
        for year in years
    ]
    archive_count = total_slide_count(archive_years)
    archive_desc = (
        f"古いスライド・通常一覧から外したフォルダ({archive_count}件)"
        if archive_count
        else "古いスライド・通常一覧から外したフォルダ"
    )
    return "\n".join(
        [
            "    <h2>年別一覧</h2>",
            card_list(year_items, "公開中のスライドはまだありません。"),
            "",
            "    <h2>Archive</h2>",
            card_list([("archive/", "Archive", archive_desc)], "アーカイブはまだありません。"),
        ]
    )


def year_body(year: Year) -> str:
    month_items = [
        (
            f"{href_segment(month.slug)}/",
            f"{int(month.slug)}月",
            f"{year.slug}年{int(month.slug)}月のスライド({len(month.slides)}件)",
        )
        for month in year.months
    ]
    return "\n".join(
        [
            glass_breadcrumb('<a href="../">トップ</a> / ' + escape(f"{year.slug}年")),
            "",
            "    <h2>月別一覧</h2>",
            card_list(month_items, f"{year.slug}年の月別フォルダはまだありません。"),
            "",
            glass_back_link("../", "トップへ戻る"),
        ]
    )


def month_body(year: Year, month: Month) -> str:
    slide_items = [
        (slide.href, slide.title, slide.description)
        for slide in month.slides
    ]
    month_label = f"{int(month.slug)}月"
    return "\n".join(
        [
            glass_breadcrumb(
                f'<a href="../../">トップ</a> / <a href="../">{escape(year.slug)}年</a> / {escape(month_label)}'
            ),
            "",
            "    <h2>スライド一覧</h2>",
            card_list(slide_items, f"{year.slug}年{month_label}のスライドはまだありません。"),
            "",
            glass_back_link("../", f"{year.slug}年の月別一覧へ戻る"),
        ]
    )


def archive_body(years: list[Year]) -> str:
    year_items = [
        (
            f"{href_segment(year.slug)}/",
            f"{year.slug}年",
            f"アーカイブされたスライド({slide_count(year)}件)",
        )
        for year in years
    ]
    return "\n".join(
        [
            glass_breadcrumb('<a href="../">トップ</a> / Archive'),
            "",
            "    <h2>年別一覧</h2>",
            card_list(year_items, "現在アーカイブされたスライドはありません。"),
            "",
            "    <section class=\"slide-section glass\">",
            f"      {GLASS_LAYERS}",
            "      <div class=\"glass__content\">",
            "        <h2>注意</h2>",
            "        <p>",
            "          このフォルダもGitHub Pagesで公開される可能性があります。",
            "          非公開情報・個人情報・内部資料は置かないでください。",
            "        </p>",
            "      </div>",
            "    </section>",
            "",
            glass_back_link("../", "トップへ戻る"),
        ]
    )


def archive_year_body(year: Year) -> str:
    month_items = [
        (
            f"{href_segment(month.slug)}/",
            f"{int(month.slug)}月",
            f"{year.slug}年{int(month.slug)}月にアーカイブされたスライド({len(month.slides)}件)",
        )
        for month in year.months
    ]
    return "\n".join(
        [
            glass_breadcrumb(
                f'<a href="../../">トップ</a> / <a href="../">Archive</a> / {escape(year.slug)}年'
            ),
            "",
            "    <h2>月別一覧</h2>",
            card_list(month_items, f"{year.slug}年にアーカイブされたスライドはまだありません。"),
            "",
            glass_back_link("../", "Archiveへ戻る"),
        ]
    )


def archive_month_body(year: Year, month: Month) -> str:
    slide_items = [
        (slide.href, slide.title, slide.description)
        for slide in month.slides
    ]
    month_label = f"{int(month.slug)}月"
    return "\n".join(
        [
            glass_breadcrumb(
                f'<a href="../../../">トップ</a> / <a href="../../">Archive</a> / '
                f'<a href="../">{escape(year.slug)}年</a> / {escape(month_label)}'
            ),
            "",
            "    <h2>アーカイブ一覧</h2>",
            card_list(slide_items, f"{year.slug}年{month_label}にアーカイブされたスライドはまだありません。"),
            "",
            glass_back_link("../", f"{year.slug}年のアーカイブ月別一覧へ戻る"),
        ]
    )


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def main() -> None:
    years = find_years(ROOT)
    archive_years = find_years(ROOT / "archive")

    write(
        ROOT / "index.html",
        page(
            SITE_NAME,
            "assets/css/common.css",
            SITE_NAME,
            SITE_DESCRIPTION,
            root_body(years, archive_years),
        ),
    )

    for year in years:
        write(
            ROOT / year.slug / "index.html",
            page(
                f"{year.slug}年 | {SITE_NAME}",
                "../assets/css/common.css",
                f"{year.slug}年",
                f"{year.slug}年のスライド一覧(月別)",
                year_body(year),
            ),
        )
        for month in year.months:
            write(
                ROOT / year.slug / month.slug / "index.html",
                page(
                    f"{year.slug}年{int(month.slug)}月 | {SITE_NAME}",
                    "../../assets/css/common.css",
                    f"{year.slug}年{int(month.slug)}月",
                    f"{year.slug}年{int(month.slug)}月のスライド一覧",
                    month_body(year, month),
                ),
            )

    write(
        ROOT / "archive" / "index.html",
        page(
            f"Archive | {SITE_NAME}",
            "../assets/css/common.css",
            "Archive",
            "古いスライド・通常一覧から外したフォルダの置き場です。",
            archive_body(archive_years),
        ),
    )

    for year in archive_years:
        write(
            ROOT / "archive" / year.slug / "index.html",
            page(
                f"Archive {year.slug}年 | {SITE_NAME}",
                "../../assets/css/common.css",
                f"Archive {year.slug}年",
                f"{year.slug}年にアーカイブされたスライド一覧(月別)",
                archive_year_body(year),
            ),
        )
        for month in year.months:
            write(
                ROOT / "archive" / year.slug / month.slug / "index.html",
                page(
                    f"Archive {year.slug}年{int(month.slug)}月 | {SITE_NAME}",
                    "../../../assets/css/common.css",
                    f"Archive {year.slug}年{int(month.slug)}月",
                    f"{year.slug}年{int(month.slug)}月にアーカイブされたスライド一覧",
                    archive_month_body(year, month),
                ),
            )


if __name__ == "__main__":
    main()
