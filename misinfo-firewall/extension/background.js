const API_URL = "https://attitude-triangle-tinsel.ngrok-free.dev";

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "misinfo-check",
    title: "Check with Misinfo Firewall",
    contexts: ["selection"],
  });
});

// Handle right click → check
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "misinfo-check") return;
  const selectedText = info.selectionText?.trim();
  if (!selectedText || selectedText.length < 10) {
    chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_RESULT",
      error: "Please select a longer piece of text to fact-check.",
    });
    return;
  }

  // Tell content script to show loading state
  chrome.tabs.sendMessage(tab.id, { type: "SHOW_LOADING", text: selectedText });

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: selectedText }),
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    chrome.tabs.sendMessage(tab.id, { type: "SHOW_RESULT", data });
  } catch (err) {
    chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_RESULT",
      error: "Could not reach the server. Make sure backend is running.",
    });
  }
});