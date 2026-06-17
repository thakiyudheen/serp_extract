import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";
import path from "path";

export interface ICsvRow {
  rank: number;
  url: string;
}

export class CsvWriter {
  async writeResults(keyword: string, urls: string[], filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Always overwrite — each new search replaces previous results
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "rank", title: "Rank" },
        { id: "url",  title: "URL" },
      ],
    });

    const records: ICsvRow[] = urls.map((url, index) => ({
      rank: index + 1,
      url,
    }));

    await csvWriter.writeRecords(records);
    console.log(`[CSV Writer] Exported ${records.length} URLs to ${filePath}`);
  }
}

