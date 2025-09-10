// Toggle enable/disable in chrome.storage
const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

chrome.storage.sync.get({ enabled: true }, ({ enabled }) => {
  toggle.checked = enabled;
  status.textContent = enabled ? "Enabled" : "Disabled";
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ enabled });
  status.textContent = enabled ? "Enabled" : "Disabled";
});
