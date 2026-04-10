import { formatTime, getCurrentDateKey, isUnproductive, getPastDateKeys } from './utils.js';

let currentView = 'today'; // 'today' | 'history'

document.addEventListener('DOMContentLoaded', async () => {
  setupToggleBtn();
  loadDataAndRender();
});

function setupToggleBtn() {
  const toggleBtn = document.getElementById('toggle-view-btn');
  const toggleText = document.getElementById('toggle-view-text');
  
  toggleBtn.addEventListener('click', () => {
    if (currentView === 'today') {
      currentView = 'history';
      toggleText.textContent = 'Today';
    } else {
      currentView = 'today';
      toggleText.textContent = 'Past 7 Days';
    }
    loadDataAndRender();
  });
}

function loadDataAndRender() {
  const dateObj = new Date();
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  const dateDisplay = document.getElementById('date-display');
  
  if (currentView === 'today') {
    dateDisplay.textContent = dateObj.toLocaleDateString(undefined, options);
    const dateKey = getCurrentDateKey();
    
    chrome.storage.local.get([dateKey], (result) => {
      const dayData = result[dateKey];
      if (!dayData || !dayData.domains || Object.keys(dayData.domains).length === 0) {
        renderEmptyState();
        updateLabels("Total Browsing Time", "Top Sites");
        return;
      }
      renderDashboard(dayData);
      updateLabels("Total Browsing Time", "Top Sites");
    });
  } else {
    // History View
    dateDisplay.textContent = "7-Day History";
    const keys = getPastDateKeys(7);
    
    chrome.storage.local.get(keys, (result) => {
      // Aggregate data
      const aggregated = { totalTime: 0, domains: {} };
      
      for (const key of keys) {
        const dayData = result[key];
        if (dayData && dayData.domains) {
          aggregated.totalTime += (dayData.totalTime || 0);
          
          for (const [domain, data] of Object.entries(dayData.domains)) {
            if (!aggregated.domains[domain]) {
              aggregated.domains[domain] = { timeSpent: 0, unproductive: data.unproductive };
            }
            aggregated.domains[domain].timeSpent += data.timeSpent;
          }
        }
      }
      
      if (aggregated.totalTime === 0) {
        renderEmptyState();
        updateLabels("7-Day Total Time", "Top Sites (7 Days)");
        return;
      }
      
      renderDashboard(aggregated);
      updateLabels("7-Day Total Time", "Top Sites (7 Days)");
    });
  }
}

function renderEmptyState() {
  document.getElementById('total-time').textContent = '0m 0s';
  document.getElementById('prod-bar').style.width = '50%';
  document.getElementById('unprod-bar').style.width = '50%';
  document.getElementById('prod-time').textContent = '0m 0s Productive';
  document.getElementById('unprod-time').textContent = '0m 0s Unproductive';
  document.getElementById('sites-list').innerHTML = '<div class="empty-state">No browsing data found.</div>';
}

function updateLabels(totalLabel, sitesLabel) {
  document.querySelector('.summary-label').textContent = totalLabel;
  document.querySelector('.section-header h3').textContent = sitesLabel;
}

function renderDashboard(dayData) {
  const { totalTime, domains } = dayData;
  
  // Total Time
  document.getElementById('total-time').textContent = formatTime(totalTime);
  
  // Calculate productive vs unproductive
  let productiveTime = 0;
  let unproductiveTime = 0;
  
  const siteArray = [];
  
  for (const [domain, data] of Object.entries(domains)) {
    siteArray.push({
      domain,
      timeSpent: data.timeSpent,
      unproductive: data.unproductive
    });
    
    if (data.unproductive) {
      unproductiveTime += data.timeSpent;
    } else {
      productiveTime += data.timeSpent;
    }
  }
  
  // Update Productivity Bar
  const prodPct = totalTime > 0 ? (productiveTime / totalTime) * 100 : 50;
  const unprodPct = totalTime > 0 ? (unproductiveTime / totalTime) * 100 : 50;
  
  document.getElementById('prod-bar').style.width = `${prodPct}%`;
  document.getElementById('unprod-bar').style.width = `${unprodPct}%`;
  
  document.getElementById('prod-time').textContent = `${formatTime(productiveTime)} Productive`;
  document.getElementById('unprod-time').textContent = `${formatTime(unproductiveTime)} Unproductive`;
  
  // Sort and Render Sites List
  siteArray.sort((a, b) => b.timeSpent - a.timeSpent);
  
  const sitesListEl = document.getElementById('sites-list');
  sitesListEl.innerHTML = ''; // clear empty state
  
  siteArray.slice(0, 10).forEach(site => { // Top 10
    const itemEl = document.createElement('div');
    itemEl.className = 'site-item';
    
    // Handle 'null' domains gracefully
    const isLocalOrSystem = site.domain === 'null' || !site.domain;
    const displayName = isLocalOrSystem ? 'Local & System Pages' : site.domain;
    
    // Attempt to grab a favicon (Chrome only API)
    const faviconUrl = isLocalOrSystem ? '' : `https://www.google.com/s2/favicons?domain=${site.domain}&sz=32`;
    
    const isUnprod = site.unproductive;
    const typeLabel = isUnprod ? 'Unproductive' : 'Productive';
    const typeClass = isUnprod ? 'unproductive-text' : '';
    
    itemEl.innerHTML = `
      <div class="site-info">
        <div class="site-icon">
          <img src="${faviconUrl}" alt="" onerror="this.style.display='none'">
        </div>
        <div class="site-name-wrap">
          <span class="site-name">${displayName}</span>
          <span class="site-type ${typeClass}">${typeLabel}</span>
        </div>
      </div>
      <div class="site-time">
        ${formatTime(site.timeSpent)}
      </div>
    `;
    
    sitesListEl.appendChild(itemEl);
  });
}
