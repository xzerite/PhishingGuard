const API_URL = "http://localhost:8000/analyze";

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    checkPhishing(tab.url, tabId);
  }
});

async function checkPhishing(url, tabId) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: url })
    });
    
    const result = await response.json();
    
    if (result.is_phishing) {
      chrome.action.setBadgeText({ text: "!", tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#FF0000", tabId: tabId });
      
      // Notify content script to show warning
      chrome.tabs.sendMessage(tabId, {
        action: "SHOW_WARNING",
        data: result
      });
    } else {
      chrome.action.setBadgeText({ text: "OK", tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#00FF00", tabId: tabId });
    }
  } catch (error) {
    console.error("PhishGuard API Error:", error);
  }
}
