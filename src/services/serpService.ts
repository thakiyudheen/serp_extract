import axios from "axios";
import { CONFIG } from "../core/config.js";
import { BrowserService } from "../core/browser.js";
import { CaptchaError } from "../core/errors.js";
import { createCursor } from "ghost-cursor";

export class SerpService {
  private browserService = new BrowserService();

  async fetchRankingUrls(keyword: string): Promise<string[]> {
    console.log(`[SerpService] Extracting ranking URLs for: "${keyword}"`);

    // 1. Try Puppeteer Stealth Crawling first
    try {
      console.log("[SerpService] Attempting Stealth Crawl (Puppeteer)...");
      const urls = await this.crawlGoogleStealth(keyword);
      if (urls && urls.length > 0) {
        const uniqueUrls = this.filterUniqueUrls(urls);
        console.log(`[SerpService] Successfully extracted ${uniqueUrls.length} unique URLs via Google Stealth.`);
        return uniqueUrls;
      }
    } catch (err: any) {
      console.warn(`[SerpService] Google Stealth Crawl failed: ${err.message}. Falling back to SerpApi...`);
    }

    // 2. Fallback to SerpApi if Puppeteer failed and key is available
    if (CONFIG.SERP_API.ENABLED && CONFIG.SERP_API.API_KEY) {
      try {
        console.log("[SerpService] Attempting API extraction (SerpApi)...");
        const urls = await this.fetchWithSerpApi(keyword);
        if (urls && urls.length > 0) {
          const uniqueUrls = this.filterUniqueUrls(urls);
          console.log(`[SerpService] Successfully extracted ${uniqueUrls.length} unique URLs via SerpApi.`);
          return uniqueUrls;
        }
      } catch (err: any) {
        console.warn(`[SerpService] SerpApi also failed: ${err.message}. Triggering Wikipedia fallback...`);
      }
    }

    // 3. Final fallback to Wikipedia
    console.log("[SerpService] Triggering final fallback to Wikipedia search...");
    return [
      `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(keyword)}`
    ];
  }

  private filterUniqueUrls(urls: string[]): string[] {
    const seen = new Set<string>();
    return urls.filter(url => {
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    }).slice(0, CONFIG.SEARCH.MAX_URLS_PER_KEYWORD);
  }

  private async fetchWithSerpApi(keyword: string): Promise<string[]> {
    const response = await axios.get("https://serpapi.com/search", {
      params: {
        q: keyword,
        api_key: CONFIG.SERP_API.API_KEY,
        engine: "google",
        num: CONFIG.SEARCH.MAX_URLS_PER_KEYWORD,
      },
    });

    const organicResults = response.data.organic_results || [];
    return organicResults
      .map((res: any) => res.link)
      .filter((link: string) => link && link.startsWith("http"));
  }

  private async crawlGoogleStealth(keyword: string): Promise<string[]> {
    const page = await this.browserService.createPage();
    const cursor = createCursor(page);

    // Debug page logging
    page.on("console", (msg) => console.log(`[Browser Console] ${msg.text()}`));
    page.on("pageerror", (err) => console.error(`[Browser Error] ${(err as Error).message}`));

    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&hl=en`;
      console.log(`[SerpService] Navigating directly to search URL: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: "networkidle2" });
      await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 2000));

      // Handle consent popups if they appear on the search page
      await this.handleConsent(page, cursor);

      const pageTitle = await page.title();
      const bodyLength = await page.evaluate(() => document.body?.innerHTML?.length || 0);
      console.log(`[SerpService] Loaded page title: "${pageTitle}", Body length: ${bodyLength}`);

      if (pageTitle.includes("unusual traffic")) {
        throw new CaptchaError();
      }

      await page.waitForSelector("h3, a[jsname]", { timeout: 15000 }).catch(() => { });

      const urls = await page.evaluate(() => {
        const results: string[] = [];
        const anchors = Array.from(document.querySelectorAll("a"));

        anchors.forEach((a) => {
          const href = a.href;
          if (!href || !href.startsWith("http")) return;

          try {
            const hostname = new URL(href).hostname.toLowerCase();
            // Filter out Google domains inline
            if (
              hostname === "google" ||
              hostname.endsWith(".google") ||
              hostname.includes(".google.") ||
              hostname.startsWith("google.") ||
              hostname.includes("googleusercontent.com") ||
              hostname.includes("gstatic.com")
            ) {
              return;
            }
          } catch (e) {
            return;
          }

          // Check if it represents an organic search result title or block
          const hasH3 = a.querySelector("h3") !== null;
          const isResultContainer = a.closest("div.g, div.yuRUbf, div.tF2Cxc, div[jsname='r57atc']") !== null;

          if (hasH3 || isResultContainer) {
            results.push(href);
          }
        });
        return results;
      });

      console.log(`[SerpService] Loaded page title again: "${pageTitle}"`);

      if (urls.length === 0) {
        console.warn(`[SerpService] No URLs matched our organic filters. Saving screenshot to debug.png...`);
        try {
          await page.screenshot({ path: "debug.png" });
        } catch (e) {
          console.error(`[SerpService] Failed to save debug screenshot:`, e);
        }
      }

      await this.browserService.saveCookies(page);
      return urls;
    } finally {
      await page.close();
      await this.browserService.close();
    }
  }

  private async typeHumanLike(page: any, text: string): Promise<void> {
    for (let i = 0; i < text.length; i++) {
      if (Math.random() < 0.05) {
        const mistake = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        await page.keyboard.sendCharacter(mistake);
        await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 150));
        await page.keyboard.press("Backspace");
        await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 150));
      }
      await page.keyboard.sendCharacter(text[i]);
      await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 120));
    }
  }

  private async handleConsent(page: any, cursor: any): Promise<void> {
    const selectors = [
      "::-p-xpath(//button[contains(., 'Accept all')])",
      "::-p-xpath(//button[contains(., 'I agree')])",
      "::-p-xpath(//button[contains(., 'Agree')])",
    ];

    for (const selector of selectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await cursor.move(button);
          await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500));
          await cursor.click();
          await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 5000 }).catch(() => { });
          return;
        }
      } catch (err) {
        // Ignore errors in consent check
      }
    }
  }
}
