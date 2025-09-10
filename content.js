(function(){
  // don't block re-renders, use cached source
  if (!window.__ansiSepticSourceText) window.__ansiSepticSourceText = null;

  function pageLooksLikePlainText() {
    try {
      const url = location.href.split('#')[0].split('?')[0].toLowerCase();
      const isTxtOrLog = url.endsWith('.txt') || url.endsWith('.log');
      const isTextPlain = (document.contentType || '').toLowerCase().startsWith('text/plain');
      const hasSinglePre = !!document.body && document.body.children.length === 1 && document.body.firstElementChild && document.body.firstElementChild.tagName === 'PRE';
      return isTxtOrLog || isTextPlain || hasSinglePre;
    } catch (e) { return false; }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "ANSI_SEPTIC_FORCE_RENDER") {
      chrome.storage.sync.get({ enabled: true, darkBackground: true }, (cfg) => {
        if (!cfg.enabled) return;
        renderAnsi(true, cfg.darkBackground);
      });
    }
  });

  if (!pageLooksLikePlainText()) return;

  chrome.storage.sync.get({ enabled: true, darkBackground: true }, (cfg) => {
    if (!cfg.enabled) return;
    renderAnsi(false, cfg.darkBackground);
  });

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  const colorMap = {
    30: 'black', 31: 'red', 32: 'green', 33: 'olive', 34: 'blue',
    35: 'purple', 36: 'teal', 37: 'silver',
    90: 'gray', 91: 'lightcoral', 92: 'lightgreen', 93: 'khaki',
    94: 'lightskyblue', 95: 'plum', 96: 'paleturquoise', 97: 'white'
  };
  const bgMap = {
    40: 'black', 41: 'red', 42: 'green', 43: 'olive', 44: 'blue',
    45: 'purple', 46: 'teal', 47: 'silver',
    100: 'gray', 101: 'lightcoral', 102: 'lightgreen', 103: 'khaki',
    104: 'lightskyblue', 105: 'plum', 106: 'paleturquoise', 107: 'white'
  };

  function clamp(n, a, b){ return Math.min(b, Math.max(a, n)); }

  function sgrToStyle(sgr) {
    const style = {};
    for (let i = 0; i < sgr.length; i++) {
      const code = parseInt(sgr[i] || "0", 10);
      if (Number.isNaN(code)) continue;
      if (code === 0) {
        style.color = style.backgroundColor = style.fontWeight = style.fontStyle = style.textDecoration = style.filter = null;
      } else if (code === 1) {
        style.fontWeight = 'bold';
      } else if (code === 3) {
        style.fontStyle = 'italic';
      } else if (code === 4) {
        style.textDecoration = 'underline';
      } else if (code === 7) {
        style.filter = 'invert(100%) hue-rotate(180deg)';
      } else if (code === 22) {
        style.fontWeight = null;
      } else if (code === 23) {
        style.fontStyle = null;
      } else if (code === 24) {
        style.textDecoration = null;
      } else if (code === 27) {
        style.filter = null;
      } else if (code === 39) {
        style.color = null;
      } else if (code === 49) {
        style.backgroundColor = null;
      } else if (code === 38 || code === 48) {
        const isFg = code === 38;
        const mode = parseInt(sgr[i+1] || "0", 10);
        if (mode === 5) {
          const n = clamp(parseInt(sgr[i+2]||"0",10), 0, 255);
          const rgb = ansi256ToRgb(n);
          const css = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
          if (isFg) style.color = css; else style.backgroundColor = css;
          i += 2;
        } else if (mode === 2) {
          const r = clamp(parseInt(sgr[i+2]||"0",10),0,255);
          const g = clamp(parseInt(sgr[i+3]||"0",10),0,255);
          const b = clamp(parseInt(sgr[i+4]||"0",10),0,255);
          const css = `rgb(${r}, ${g}, ${b})`;
          if (isFg) style.color = css; else style.backgroundColor = css;
          i += 4;
        }
      } else if (colorMap[code]) {
        style.color = colorMap[code];
      } else if (bgMap[code]) {
        style.backgroundColor = bgMap[code];
      }
    }
    return style;
  }

  function ansi256ToRgb(n){
    if (n < 16) {
      const base = [
        [0,0,0],[205,0,0],[0,205,0],[205,205,0],[0,0,238],[205,0,205],[0,205,205],[229,229,229],
        [127,127,127],[255,0,0],[0,255,0],[255,255,0],[92,92,255],[255,0,255],[0,255,255],[255,255,255]
      ];
      return base[n];
    } else if (n <= 231) {
      n -= 16;
      const r = Math.floor(n / 36), g = Math.floor((n % 36) / 6), b = n % 6;
      const conv = [0, 95, 135, 175, 215, 255];
      return [conv[r], conv[g], conv[b]];
    } else {
      const c = 8 + 10 * (n - 232);
      return [c,c,c];
    }
  }

  function styleToCss(style) {
    let css = '';
    if (style.color != null) css += `color:${style.color};`;
    if (style.backgroundColor != null) css += `background-color:${style.backgroundColor};`;
    if (style.fontWeight) css += `font-weight:${style.fontWeight};`;
    if (style.fontStyle) css += `font-style:${style.fontStyle};`;
    if (style.textDecoration) css += `text-decoration:${style.textDecoration};`;
    if (style.filter) css += `filter:${style.filter};`;
    return css;
  }

  function normalizeInput(text){
    text = text.replace(/\^\[\[/g, '\u001b[');
    text = text.replace(/\\x1b\[/gi, '\u001b[');
    text = text.replace(/\x1b\[/g, '\u001b[');
    text = text.replace(/\\u001b\[/gi, '\u001b[');
    text = text.replace(/\u001b\[/g, '\u001b[');
    text = text.replace(/\\033\[/g, '\u001b[');
    text = text.replace(/\u009b/g, '\u001b[');
    return text;
  }

  function getSourceText(){
    if (window.__ansiSepticSourceText !== null) return window.__ansiSepticSourceText;
    const pre = document.body.querySelector('pre') || document.body;
    const original = pre ? pre.textContent : document.body.textContent;
    window.__ansiSepticSourceText = original || "";
    return window.__ansiSepticSourceText;
  }

  function parseAnsiToHtml(text) {
    text = normalizeInput(text);
    const ESC = '\u001b[';
    const parts = text.split(ESC);
    let html = escapeHtml(parts[0]);
    let current = { color:null, backgroundColor:null, fontWeight:null, fontStyle:null, textDecoration:null, filter:null };
    for (let i = 1; i < parts.length; i++) {
      const segment = parts[i];
      const m = segment.match(/^([0-9;]*?)m/);
      if (!m) { html += escapeHtml(ESC + segment); continue; }
      const sgr = m[1] ? m[1].split(';') : ['0'];
      if (sgr.includes('0') || sgr.includes('00') || sgr.length === 0) {
        current = { color:null, backgroundColor:null, fontWeight:null, fontStyle:null, textDecoration:null, filter:null };
      }
      const updated = sgrToStyle(sgr);
      for (const k of Object.keys(updated)) {
        if (updated[k] !== undefined) current[k] = updated[k];
      }
      const css = styleToCss(current);
      const rest = segment.slice(m[0].length);
      const safe = escapeHtml(rest);
      html += css ? `<span style="${css}">${safe}</span>` : safe;
    }
    return html;
  }

  function renderAnsi(force, darkBg){
    const text = getSourceText();
    if (!text) return;

    const html = parseAnsiToHtml(text);
    document.body.innerHTML = '';
    const container = document.createElement('pre');
    container.style.margin = '0';
    container.style.whiteSpace = 'pre-wrap';
    container.style.wordBreak = 'break-word';
    container.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    if (darkBg) {
      document.documentElement.style.background = '#000';
      document.body.style.background = '#000';
      container.style.background = '#000';
      container.style.color = '#e5e5e5';
    } else {
      document.documentElement.style.background = '#fff';
      document.body.style.background = '#fff';
      container.style.background = '#fff';
      container.style.color = '#111';
    }
    container.innerHTML = html;
    document.body.appendChild(container);
  }
})();