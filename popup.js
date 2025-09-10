const toggle = document.getElementById('toggle');
const darkbg = document.getElementById('darkbg');
const status = document.getElementById('status');
const rerender = document.getElementById('rerender');

chrome.storage.sync.get({ enabled: true, darkBackground: true }, ({ enabled, darkBackground }) => {
  toggle.checked = enabled;
  darkbg.checked = darkBackground;
  status.textContent = (enabled ? "Enabled" : "Disabled") + ` • ${darkBackground ? "Dark" : "Light"} bg`;
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ enabled });
  status.textContent = (enabled ? "Enabled" : "Disabled") + ` • ${darkbg.checked ? "Dark" : "Light"} bg`;
  chrome.tabs.query({active: true, currentWindow: true}).then(([tab]) => {
    if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ANSI_SEPTIC_FORCE_RENDER" });
  });
});

darkbg.addEventListener('change', () => {
  const darkBackground = darkbg.checked;
  chrome.storage.sync.set({ darkBackground });
  status.textContent = (toggle.checked ? "Enabled" : "Disabled") + ` • ${darkBackground ? "Dark" : "Light"} bg`;
  chrome.tabs.query({active: true, currentWindow: true}).then(([tab]) => {
    if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ANSI_SEPTIC_FORCE_RENDER" });
  });
});

rerender.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "ANSI_SEPTIC_FORCE_RENDER" });
});
