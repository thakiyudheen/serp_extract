import readline from "readline";
import { CONFIG } from "./core/config.js";
import { SerpService } from "./services/serpService.js";
import { CsvWriter } from "./services/csvWriter.js";

function promptKeyword(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      `\n🔍 Enter search query / keyword:\n> `,
      (answer) => {
        rl.close();
        const trimmed = answer.trim();

        if (!trimmed) {
          console.log(`[Input] No keyword entered. Using default: "Canada immigration consultant"`);
          return resolve("Canada immigration consultant");
        }
        resolve(trimmed);
      }
    );
  });
}

async function main(): Promise<void> {
  console.log("=========================================");
  console.log("🛡️  SERP Crawling & URL Extraction Tool  ");
  console.log("=========================================");

  const query = await promptKeyword();

  const serpService = new SerpService();
  const csvWriter = new CsvWriter();

  try {
    const urls = await serpService.fetchRankingUrls(query);

    if (urls.length === 0) {
      console.warn("\n⚠️ No URLs found for the query.");
      return;
    }

    console.log(`\n📋 Ranking URLs Extracted for "${query}":`);
    console.log("-----------------------------------------");
    urls.forEach((url, index) => {
      console.log(` ${index + 1}. ${url}`);
    });
    console.log("-----------------------------------------");

    await csvWriter.writeResults(query, urls, CONFIG.OUTPUT.CSV_PATH);
    console.log(`\n✅ Operation complete! Results saved to: ${CONFIG.OUTPUT.CSV_PATH}`);
  } catch (err: any) {
    console.error(`\n💥 Fatal Pipeline Error: ${err.message}`);
  }
}

main().catch((err: unknown) => {
  console.error(`\n💥 System crash: ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});
