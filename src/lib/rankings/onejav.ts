import { VideoInfo } from '@/types/javdb';
import * as cheerio from 'cheerio';
/**
 * Parses the second type of HTML structure for video lists.
 * @param htmlContent The HTML string to parse.
 * @param baseUrl The base URL of the website (e.g., "https://onejav.com") to construct absolute links.
 * @returns An array of extracted VideoInfo objects.
 */
export function parseOnejavVideoList(
  htmlContent: string,
  baseUrl: string
): VideoInfo[] {
  if (!htmlContent) {
    return [];
  }

  try {
    const $ = cheerio.load(htmlContent);
    const results: VideoInfo[] = [];

    // Select each card element using its unique class structure
    $('.card.mb-3').each((index, element) => {
      const item = $(element);

      // --- Extract Code ---
      // The code is the text of the first link within the title heading
      const rawCode = item.find('h5.title a').first().text().trim();

      // Use regex to add a hyphen between the letters and numbers (e.g., "HNTRZ022" -> "HNTRZ-022")
      const code = rawCode
        ? rawCode.replace(/^([a-zA-Z]+)(\d+)$/, '$1-$2')
        : null;

      // --- Extract Title ---
      // The title is in a <p> tag with a specific class combination
      const title =
        item.find('p.level.has-text-grey-dark').text().trim() || null;

      // --- Extract Cover ---
      const cover = item.find('img.image').attr('src');

      // --- Extract Link ---
      const relativeLink = item.find('h5.title a').first().attr('href');
      const link = relativeLink ? `${baseUrl}${relativeLink}` : null;

      // --- Extract and Format Date ---
      // The date is in the format "Month. Day, Year" and needs to be standardized
      const rawDate = item.find('p.subtitle.is-6 a').text().trim(); // e.g., "Sept. 19, 2025"
      let date: string | null = null;
      if (rawDate) {
        try {
          // The JavaScript Date constructor can parse this format directly
          const parsedDate = new Date(rawDate);
          // Convert to ISO format (YYYY-MM-DDTHH:mm:ss.sssZ) and take the first 10 characters
          date = parsedDate.toISOString().slice(0, 10);
        } catch (e) {
          console.error(`Failed to parse date string: "${rawDate}"`);
          // If parsing fails, date remains null
        }
      }

      // --- Score and Reviews are not present in this HTML structure ---
      const score: number | null = null;
      const reviews: number | null = null;

      // Only add to results if a code or title was found
      if (code || title) {
        results.push({
          code,
          title,
          cover,
          date,
          score,
          reviews,
          link
        });
      }
    });

    return results;
  } catch (error) {
    console.error('Error parsing HTML with Cheerio:', error);
    return [];
  }
}
