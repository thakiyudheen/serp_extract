import "dotenv/config";

export interface IConfig {
  SEARCH: {
    MAX_URLS_PER_KEYWORD: number;
    DELAY_BETWEEN_SEARCHES_MS: [number, number];
  };
  SERP_API: {
    ENABLED: boolean;
    API_KEY: string;
  };
  USER_AGENTS: string[];
  OUTPUT: {
    CSV_PATH: string;
  };
}

export const CONFIG: IConfig = {
  SEARCH: {
    MAX_URLS_PER_KEYWORD: 10, // Default to top 10 URLs
    DELAY_BETWEEN_SEARCHES_MS: [2000, 5000],
  },
  SERP_API: {
    ENABLED: !!process.env.SERP_API_KEY,          // auto-enable if key is in .env
    API_KEY: process.env.SERP_API_KEY || "",
  },
  USER_AGENTS: [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
  ],
  OUTPUT: {
    CSV_PATH: "search_results.csv",
  },
};

export const getRandomUA = () =>
  CONFIG.USER_AGENTS[Math.floor(Math.random() * CONFIG.USER_AGENTS.length)];
