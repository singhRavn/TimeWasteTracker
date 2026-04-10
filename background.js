import { getDomainFromUrl, isUnproductive, getCurrentDateKey, parseDateKey, getRetentionThresholdMs } from './utils.js';

// Clean up tracking data older than 7 days
function cleanupOldData() {
  chrome.storage.local.get(null, (result) => {
    const thresholdMs = getRetentionThresholdMs(7);
    const keysToRemove = [];
    
    for (const key of Object.keys(result)) {
      // Validate key format YYYY-MM-DD
      const dateObj = parseDateKey(key);
      if (dateObj) {
        if (dateObj.getTime() < thresholdMs) {
          keysToRemove.push(key);
        }
      }
    }
    
    if (keysToRemove.length > 0) {
      chrome.storage.local.remove(keysToRemove, () => {
        console.log("Cleaned up old tracking data:", keysToRemove);
      });
    }
  });
}

// Ensure cleanup runs when extension wakes up/starts periodically
chrome.runtime.onStartup.addListener(cleanupOldData);
chrome.runtime.onInstalled.addListener(cleanupOldData);

let currentTabId = null;
let currentDomain = null;
let startTime = null;

// Track time spent periodically to prevent data loss or just on switch
// Let's do both: every 10 seconds flush, and on switch flush.
const FLUSH_INTERVAL_MS = 10000; 
let flushInterval = null;

function startTracking(tabId, url) {
  flushCurrentTime(); // Save any pending time from the previous domain
  
  currentTabId = tabId;
  currentDomain = getDomainFromUrl(url);
  
  if (currentDomain) {
    startTime = Date.now();
    
    // Start interval to flush data periodically
    if (flushInterval) clearInterval(flushInterval);
    flushInterval = setInterval(flushCurrentTime, FLUSH_INTERVAL_MS);
  } else {
    // Not a valid URL to track
    startTime = null;
    if (flushInterval) clearInterval(flushInterval);
  }
}

function flushCurrentTime() {
  if (!currentDomain || !startTime) return;

  const now = Date.now();
  const timeSpentMs = now - startTime;
  const timeSpentSecs = timeSpentMs / 1000;
  
  // Advance start time to now so we don't double count
  startTime = now;

  const dateKey = getCurrentDateKey();

  chrome.storage.local.get([dateKey], (result) => {
    let dayData = result[dateKey] || { totalTime: 0, domains: {} };
    
    // Total time
    dayData.totalTime += timeSpentSecs;
    
    // Domain time
    if (!dayData.domains[currentDomain]) {
      dayData.domains[currentDomain] = {
        timeSpent: 0,
        unproductive: isUnproductive(currentDomain)
      };
    }
    dayData.domains[currentDomain].timeSpent += timeSpentSecs;

    // Save back
    chrome.storage.local.set({ [dateKey]: dayData });
  });
}

// Ensure time is saved when Chrome is closed or suspended
chrome.runtime.onSuspend.addListener(() => {
  flushCurrentTime();
});

// Update tracking when active tab changes
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    if (chrome.runtime.lastError || !tab) {
      flushCurrentTime();
      currentDomain = null;
      startTime = null;
      return;
    }
    
    // If we're changing to a new domain
    if (tab.active && tab.url) {
      startTracking(tab.id, tab.url);
    }
  });
});

// Update tracking when same tab's URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && tabId === currentTabId && changeInfo.url) {
    startTracking(tabId, changeInfo.url);
  }
});

// Update tracking when window focus changes
chrome.windows.onFocusChanged.addListener(windowId => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // All Chrome windows lost focus
    flushCurrentTime();
    currentDomain = null;
    startTime = null;
  } else {
    // A Chrome window got focus, find its active tab
    chrome.tabs.query({ active: true, windowId: windowId }, tabs => {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) return;
      const tab = tabs[0];
      if (tab.url) {
        startTracking(tab.id, tab.url);
      }
    });
  }
});

// Initial boot
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  if (tabs && tabs.length > 0 && tabs[0].url) {
    startTracking(tabs[0].id, tabs[0].url);
  }
});
