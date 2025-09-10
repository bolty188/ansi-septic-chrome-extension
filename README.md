# ANSI-Septic

A lightweight Chrome extension that renders ANSI escape codes inside `.txt` and `.log` files viewed in the browser. Includes a popup to enable/disable processing.

## Install (Developer Mode)

1. Download and unzip the release.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** and select the `ANSI-Septic` folder.
5. (Optional) To allow local files, enable “Allow access to file URLs” for ANSI-Septic on the extensions page.

## How it works

- The content script runs on all URLs but only processes pages whose URL ends with `.txt` or `.log`.
- If ANSI escape codes (like `\x1b[31m`) are detected, the page is re-rendered with styled `<span>` tags.
- The popup toggle persists in `chrome.storage.sync` (default: Enabled).

## Notes

- Supports the 16 standard foreground and background colors, plus **bold**, *italic*, and underline.
- Keeps things simple — no heavy dependencies, just a tiny parser.

