#!/usr/bin/env python3
"""Capture DeadDrop demo screenshots for路演 PPT."""
from pathlib import Path
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://127.0.0.1:3001"
DESKTOP_DIR = Path("/Users/zwm/Desktop/路演——PPT")
WORK_DIR = Path(__file__).resolve().parent / "demo-screenshots"
VIEWPORT = {"width": 430, "height": 932}

# Body scan labels: 1.2s emotion transition + up to 8*0.15s stagger + 0.5s fade-in
BODY_SCAN_SETTLE_SEC = 4.0


def resolve_output_dir() -> Path:
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    return WORK_DIR


def click_text(page, text, timeout=8000):
    page.get_by_role("button", name=text, exact=False).first.click(timeout=timeout)


def enter_app(page):
    page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
    time.sleep(0.6)
    click_text(page, "开始探索")
    time.sleep(0.5)
    click_text(page, "继续")
    time.sleep(1.0)


def copy_to_desktop(out_dir: Path):
    import shutil
    try:
        DESKTOP_DIR.mkdir(parents=True, exist_ok=True)
        for f in sorted(out_dir.glob("*.png")):
            shutil.copy2(f, DESKTOP_DIR / f.name)
        print(f"Copied to {DESKTOP_DIR}")
    except OSError as e:
        print(f"Could not copy to Desktop: {e}")


def capture_all():
    out_dir = resolve_output_dir()

    def shot(page, name: str):
        path = out_dir / name
        page.screenshot(path=str(path), full_page=False)
        print(f"saved {path}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT, device_scale_factor=2)

        page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        time.sleep(0.8)
        shot(page, "01-首页欢迎-DeadDrop.png")

        click_text(page, "开始探索")
        time.sleep(0.6)
        shot(page, "02-创建匿名身份.png")

        click_text(page, "继续")
        time.sleep(1.2)
        shot(page, "03-地图探索-附近纸条.png")

        click_text(page, "列表")
        time.sleep(0.8)
        shot(page, "04-纸条列表.png")

        click_text(page, "发布")
        time.sleep(0.8)
        shot(page, "05-发布-情绪选择.png")

        click_text(page, "开心")
        time.sleep(BODY_SCAN_SETTLE_SEC)
        shot(page, "06-发布-身体扫描.png")

        click_text(page, "继续")
        time.sleep(0.6)
        shot(page, "07-发布-书写放下.png")

        click_text(page, "取消")
        time.sleep(0.5)

        cards = page.locator("button.quote-card")
        if cards.count() > 0:
            cards.first.click()
            time.sleep(0.8)
            shot(page, "08-纸条详情.png")
            click_text(page, "返回")
            time.sleep(0.5)

        click_text(page, "我的")
        time.sleep(1.0)
        shot(page, "09-个人中心-我的.png")

        browser.close()

    print(f"Done. {len(list(out_dir.glob('*.png')))} screenshots in {out_dir}")
    copy_to_desktop(out_dir)


def capture_notes_and_body():
    """Re-capture pages affected by note data + body scan timing."""
    out_dir = resolve_output_dir()

    def shot(page, name: str):
        path = out_dir / name
        page.screenshot(path=str(path), full_page=False)
        print(f"saved {path}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT, device_scale_factor=2)
        enter_app(page)

        shot(page, "03-地图探索-附近纸条.png")

        click_text(page, "列表")
        time.sleep(0.8)
        shot(page, "04-纸条列表.png")

        click_text(page, "发布")
        time.sleep(0.8)
        shot(page, "05-发布-情绪选择.png")

        click_text(page, "开心")
        time.sleep(BODY_SCAN_SETTLE_SEC)
        shot(page, "06-发布-身体扫描.png")

        click_text(page, "继续")
        time.sleep(0.6)
        shot(page, "07-发布-书写放下.png")

        click_text(page, "取消")
        time.sleep(0.5)

        cards = page.locator("button.quote-card")
        if cards.count() > 0:
            cards.first.click()
            time.sleep(0.8)
            shot(page, "08-纸条详情.png")

        browser.close()

    print(f"Updated note-related screenshots in {out_dir}")
    copy_to_desktop(out_dir)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "partial":
        capture_notes_and_body()
    else:
        capture_all()
