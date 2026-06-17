import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer";
import fs from "fs";

puppeteer.use(StealthPlugin());

export class BrowserService {
  private browser: Browser | null = null;
  private cookiePath = "./cookies.json";
  
  // Prefer the real system Google Chrome binary as it is fully code-signed and authentic,
  // falling back to the cached Puppeteer headless-shell version if standard Chrome is missing.
  private systemChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  private fallbackChromePath = "/Users/thakiyudheen/.cache/puppeteer/chrome-headless-shell/mac_arm-147.0.7727.57/chrome-headless-shell-mac-arm64/chrome-headless-shell";

  async init(): Promise<Browser> {
    if (this.browser) return this.browser;

    const width = 1920;
    const height = 1080;

    const args = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-infobars",
      `--window-size=${width},${height}`,
      "--lang=en-US,en",
    ];

    const launchOptions: any = {
      headless: "new", // Run headlessly — no visible browser window
      args,
      defaultViewport: { width, height },
    };

    if (fs.existsSync(this.systemChromePath)) {
      console.log(`[Browser] Using system Google Chrome in headless mode: ${this.systemChromePath}`);
      launchOptions.executablePath = this.systemChromePath;
    } else if (fs.existsSync(this.fallbackChromePath)) {
      console.log(`[Browser] Using fallback Chrome in headless mode: ${this.fallbackChromePath}`);
      launchOptions.executablePath = this.fallbackChromePath;
    }

    this.browser = await (puppeteer as any).launch(launchOptions);
    return this.browser!;
  }

  async createPage(): Promise<Page> {
    const browser = await this.init();
    const page = await browser.newPage();

    // Enable standard cookie caching to simulate long-term user session
    if (fs.existsSync(this.cookiePath)) {
      try {
        const cookies = JSON.parse(fs.readFileSync(this.cookiePath, "utf-8"));
        await page.setCookie(...cookies);
      } catch (err) {
        console.error("[Browser] Cookie load failed:", err);
      }
    }

    return page;
  }

  async saveCookies(page: Page): Promise<void> {
    try {
      const cookies = await page.cookies();
      fs.writeFileSync(this.cookiePath, JSON.stringify(cookies, null, 2));
    } catch (err) {
      console.error("[Browser] Failed to save cookies:", err);
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (err) {
        console.error("[Browser] Error closing browser:", err);
      } finally {
        this.browser = null;
      }
    }
  }
}
