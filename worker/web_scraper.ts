const fetch = require('node-fetch');
import * as fs from 'fs';
import * as path from 'path';

const SCRAPED_DIR = path.join(process.cwd(), 'data', 'scraped_pages');

if (!fs.existsSync(SCRAPED_DIR)) {
  fs.mkdirSync(SCRAPED_DIR, { recursive: true });
}

export interface ScrapedPage {
  url: string;
  title: string;
  cleanedText: string;
  byteSize: number;
  savedFilePath: string;
}

/**
 * Live Web Scraper Tool:
 * Fetches target website HTML over HTTP, strips scripts/tags, extracts clean body text,
 * and saves the raw text to data/scraped_pages/ for full observability.
 */
export async function scrapeWebPage(url: string, jobId: string): Promise<ScrapedPage | null> {
  try {
    console.log(`[Web Scraper] Scrape loop fetching target URL: ${url}...`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 8000
    });

    if (!response.ok) {
      console.warn(`[Web Scraper] Warning: HTTP ${response.status} fetching ${url}`);
      return null;
    }

    const html = await response.text();

    // Clean HTML: Remove scripts, styles, comments
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Scraped Web Resource';

    const cleanedText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanedText.length < 100) {
      console.warn(`[Web Scraper] Scraped page content too short (${cleanedText.length} chars). Skipping.`);
      return null;
    }

    // Save scraped page text file to disk
    const jobDir = path.join(SCRAPED_DIR, jobId);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    const urlHash = Buffer.from(url).toString('hex').slice(0, 16);
    const fileName = `page_${urlHash}.txt`;
    const savedFilePath = path.join(jobDir, fileName);

    const fileContent = `SOURCE URL: ${url}\nTITLE: ${title}\nSCRAPED AT: ${new Date().toISOString()}\n\n${cleanedText.slice(0, 8000)}`;
    fs.writeFileSync(savedFilePath, fileContent, 'utf-8');

    console.log(`[Web Scraper] Successfully scraped ${cleanedText.length} chars from ${url}. Saved to ${savedFilePath}`);

    return {
      url,
      title,
      cleanedText: cleanedText.slice(0, 6000),
      byteSize: Buffer.byteLength(fileContent),
      savedFilePath
    };

  } catch (err) {
    console.warn(`[Web Scraper] Failed to scrape ${url}:`, (err as Error).message);
    return null;
  }
}
