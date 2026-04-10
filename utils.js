/**
 * Extracts and cleans the domain from a given URL.
 * Drops 'www.' and returns only the hostname.
 */
export function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;
    
    // Ignore internal pages like chrome://, edge://, about:blank, etc.
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return null;
    }

    // Remove 'www.' prefix for consistency
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    return hostname;
  } catch (error) {
    console.error("Error parsing URL:", url, error);
    return null;
  }
}

/**
 * Common unproductive domains. Can be customized later.
 */
export const UNPRODUCTIVE_DOMAINS = [
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'reddit.com',
  'youtube.com',
  'tiktok.com',
  'netflix.com',
  'hulu.com',
  'disneyplus.com',
  'amazon.com/Prime-Video',
  'primevideo.com',
  'hotstar.com',
  'zee5.com',
  'sonyliv.com',
  'jiocinema.com',
  'hbomax.com',
  'max.com',
  'peacocktv.com',
  'paramountplus.com',
  'tv.apple.com',
  'crunchyroll.com',
  'vimeo.com',
  'twitch.tv',
  'pinterest.com',
  'snapchat.com',
  'discord.com'
];

/**
 * Checks if a domain is traditionally "unproductive".
 */
export function isUnproductive(domain) {
  if (!domain) return false;
  return UNPRODUCTIVE_DOMAINS.some(d => domain.includes(d));
}

/**
 * Formats time in seconds to "Xh Ym" or "Xm Ys".
 */
export function formatTime(seconds) {
  if (typeof seconds !== 'number' || seconds < 0) return '0s';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Get the current date in YYYY-MM-DD format, using local time.
 */
export function getCurrentDateKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper: Parse a date key (YYYY-MM-DD) into a Date object local time
 */
export function parseDateKey(key) {
  const parts = key.split('-');
  if (parts.length !== 3) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Returns an array of date keys for the past `days` days, including today.
 */
export function getPastDateKeys(days = 7) {
  const keys = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    keys.push(`${year}-${month}-${day}`);
  }
  return keys;
}

/**
 * Gets a threshold timestamp to delete data older than this (in days).
 * Default is 7 days ago.
 */
export function getRetentionThresholdMs(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
