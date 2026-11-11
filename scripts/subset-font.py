"""把站酷快乐体中文字体裁成「本应用真正用到的字」。

用法（在仓库根目录）：

    python scripts/subset-font.py

思路：扫一遍 src 和 index.html 里出现的所有字符，再加上数字、标点、常用符号，
用 pyftsubset 生成一个只含这些字形的 woff2。字体从 709KB 掉到几十 KB。

⚠️ 以后在界面里加了新汉字，记得重跑一次；漏掉的字会回落成系统字体（不会缺字，只是不同字体）。
"""

import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts" / "fonts" / "zcool-kuaile-cn.woff2"  # 全量字体只当源文件，不进构建产物
OUT = ROOT / "public" / "fonts" / "zcool-kuaile-subset.woff2"

# 界面里一定会出现的字符：数字、拉丁、中英标点、货币与数学符号、箭头
BASE = (
    "0123456789"
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    " .,:;!?()[]{}<>+-*/=%_|&@#~\"'`\\"
    "，。、；：？！「」『』（）【】《》〈〉—…·～"
    "¥￥×÷±≤≥≠∞←→↑↓↗★☆○●□■△▲"
)


def collect() -> str:
    seen: set[str] = set(BASE)
    targets = list((ROOT / "src").rglob("*.ts")) + list((ROOT / "src").rglob("*.tsx"))
    targets += list((ROOT / "src").rglob("*.css"))
    targets += [ROOT / "index.html", ROOT / "public" / "manifest.webmanifest"]
    for path in targets:
        if path.exists():
            seen.update(path.read_text(encoding="utf-8"))
    # 去掉控制字符
    return "".join(sorted(ch for ch in seen if ch.isprintable()))


def main() -> int:
    if not SRC.exists():
        print(f"找不到源字体：{SRC}", file=sys.stderr)
        return 1

    text = collect()
    text_file = ROOT / "scripts" / ".subset-chars.txt"
    text_file.write_text(text, encoding="utf-8")

    cmd = [
        sys.executable,
        "-m",
        "fontTools.subset",
        str(SRC),
        f"--text-file={text_file}",
        f"--output-file={OUT}",
        "--flavor=woff2",
        "--layout-features=kern,liga",
        "--no-hinting",
        "--desubroutinize",
        "--drop-tables+=DSIG",
        "--name-IDs=*",
    ]
    print("字数：", len(text))
    subprocess.run(cmd, check=True)

    before = SRC.stat().st_size / 1024
    after = OUT.stat().st_size / 1024
    print(f"{SRC.name}: {before:.0f} KB → {OUT.name}: {after:.0f} KB（省 {before - after:.0f} KB / {100 - after / before * 100:.0f}%）")
    text_file.unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
