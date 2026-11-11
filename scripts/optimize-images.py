"""把 public/assets 里的角色图 / 背景图压到「实际显示尺寸够用」的大小。

这些图原本是按 2048 长边导出的，但页面里角色最高只显示到 ~380 CSS px（二倍屏 ~760），
背景最宽 ~1400 CSS px。按 2 倍屏留一点余量重新编码，能省掉一大半流量。

用法（仓库根目录）：

    python scripts/optimize-images.py
"""

import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets"

# 文件 → (最长边上限, quality)
RULES = {
    "fish-poor.webp": (900, 82),
    "fish-work.webp": (900, 82),
    "fish-sleep.webp": (900, 82),
    "fish-rich.webp": (900, 82),
    "fish-setup.webp": (620, 84),
    "fish-poke-before.webp": (900, 82),
    "fish-poke-work.webp": (900, 82),
    "fish-poke-sleep.webp": (900, 82),
    "fish-poke-after.webp": (900, 82),
    "loading-fish.webp": (420, 80),
}
JPEG_RULES = {
    "bg-day.jpg": (1920, 78),
    "bg-night.jpg": (1920, 78),
    "bg-rest-day.jpg": (1920, 78),
    "bg-rest-night.jpg": (1920, 78),
}


def shrink(path: pathlib.Path, longest: int, quality: int, is_jpeg: bool) -> tuple[int, int, int]:
    before = path.stat().st_size
    img = Image.open(path)
    w, h = img.size
    scale = min(1.0, longest / max(w, h))
    if scale < 1.0:
        img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    if is_jpeg:
        img = img.convert("RGB")
        img.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    else:
        img.save(path, "WEBP", quality=quality, method=6)
    after = path.stat().st_size
    return before, after, max(img.size)


def main() -> int:
    if not ASSETS.is_dir():
        print("找不到 public/assets", file=sys.stderr)
        return 1
    total_before = total_after = 0
    for name, (longest, quality) in {**RULES, **JPEG_RULES}.items():
        path = ASSETS / name
        if not path.exists():
            continue
        is_jpeg = name.endswith(".jpg")
        before, after, size = shrink(path, longest, quality, is_jpeg)
        total_before += before
        total_after += after
        print(f"{name:26} {before/1024:7.1f} KB → {after/1024:6.1f} KB  (最长边 {size})")
    print(f"{'合计':26} {total_before/1024:7.1f} KB → {total_after/1024:6.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
