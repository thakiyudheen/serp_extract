export class ScrapingError extends Error {
  constructor(message: string, public url?: string) {
    super(message);
    this.name = "ScrapingError";
  }
}

export class TimeoutError extends ScrapingError {
  constructor(message: string, url?: string) {
    super(message, url);
    this.name = "TimeoutError";
  }
}

export class CaptchaError extends ScrapingError {
  constructor(message = "Google Captcha detected", url?: string) {
    super(message, url);
    this.name = "CaptchaError";
  }
}
