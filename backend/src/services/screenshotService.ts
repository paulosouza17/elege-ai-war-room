import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const NEWS_API_BASE = process.env.NEWS_API_BASE || 'http://localhost:8001';
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'uploads', 'screenshots');
const SCREENSHOT_TIMEOUT_MS = 25_000; // 25 seconds

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

/**
 * Generate a deterministic filename based on the URL hash.
 * Same URL = same file, prevents re-capturing the same page.
 */
function urlToFilename(url: string): string {
    const hash = crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
    return `screenshot-${hash}.png`;
}

/**
 * Capture a screenshot of an article URL using the News API /screenshot endpoint.
 * Saves locally to /uploads/screenshots/ and returns the filename for serving via proxy.
 *
 * @returns filename string (e.g. "screenshot-abc123.png") or null on failure
 */
export async function captureScreenshot(articleUrl: string): Promise<string | null> {
    if (!articleUrl || !articleUrl.startsWith('http')) {
        return null;
    }

    const filename = urlToFilename(articleUrl);
    const filepath = path.join(SCREENSHOT_DIR, filename);

    // Already captured? Return immediately (dedup by URL hash)
    if (fs.existsSync(filepath)) {
        console.log(`[screenshotService] ♻️ Reusing cached screenshot: ${filename}`);
        return filename;
    }

    try {
        const screenshotUrl = `${NEWS_API_BASE}/screenshot?url=${encodeURIComponent(articleUrl)}`;
        console.log(`[screenshotService] 📸 Capturing screenshot: ${articleUrl.substring(0, 80)}...`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SCREENSHOT_TIMEOUT_MS);

        const response = await fetch(screenshotUrl, {
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
            console.warn(`[screenshotService] ⚠️ Screenshot API returned ${response.status} for ${articleUrl.substring(0, 60)}`);
            return null;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('image')) {
            console.warn(`[screenshotService] ⚠️ Non-image response (${contentType}) for ${articleUrl.substring(0, 60)}`);
            return null;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length < 1000) {
            // Likely an error page, not a real screenshot
            console.warn(`[screenshotService] ⚠️ Screenshot too small (${buffer.length} bytes), discarding`);
            return null;
        }

        fs.writeFileSync(filepath, buffer);
        console.log(`[screenshotService] ✅ Screenshot saved: ${filename} (${Math.round(buffer.length / 1024)}KB)`);

        return filename;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.warn(`[screenshotService] ⏱ Timeout capturing screenshot for ${articleUrl.substring(0, 60)}`);
        } else {
            console.warn(`[screenshotService] ❌ Screenshot failed for ${articleUrl.substring(0, 60)}: ${error.message}`);
        }
        return null;
    }
}

/**
 * Async background capture: captures screenshot and updates the feed item's
 * classification_metadata.screenshot_url field in DB.
 *
 * Does NOT block the publishing pipeline — fires and forgets.
 */
export async function captureScreenshotAsync(
    feedItemId: string,
    articleUrl: string,
    supabaseClient: SupabaseClient
): Promise<void> {
    try {
        const filename = await captureScreenshot(articleUrl);
        if (!filename) return;

        // Update the feed item with the screenshot URL
        const screenshotUrl = `/api/screenshots/${filename}`;

        const { error } = await supabaseClient
            .from('intelligence_feed')
            .update({
                media_url: screenshotUrl,
            })
            .eq('id', feedItemId);

        if (error) {
            console.error(`[screenshotService] DB update failed for ${feedItemId}: ${error.message}`);
        } else {
            console.log(`[screenshotService] 🔗 Linked screenshot to feed item ${feedItemId.substring(0, 8)}...`);
        }
    } catch (error: any) {
        console.error(`[screenshotService] Async capture failed: ${error.message}`);
    }
}
