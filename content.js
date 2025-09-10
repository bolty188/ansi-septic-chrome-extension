(function(){
  // Only run on .txt or .log URLs
  try {
    const url = location.href.split('#')[0].split('?')[0].toLowerCase();
    const isTxtOrLog = url.endsWith('.txt') || url.endsWith('.log');
    if (!isTxtOrLog) return;
  } catch(e) { /* if parsing fails, carry on */ }

  // Check if extension toggle
  chrome.storage.sync.get({ enabled: true }, ({ enabled }) => {
    if (!enabled) return;
    renderAnsi();
  });

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }

  // Map ANSI codes
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

  function sgrToStyle(sgr) {
    const style = { color: null, backgroundColor: null, fontWeight: null, fontStyle: null, textDecoration: null };
    for (const code of sgr) {
      const n = parseInt(code, 10);
      if (Number.isNaN(n)) continue;
      if (n === 0) { // reset
        style.color = style.backgroundColor = style.fontWeight = style.fontStyle = style.textDecoration = null;
      } else if (n === 1) {
        style.fontWeight = 'bold';
      } else if (n === 3) {
        style.fontStyle = 'italic';
      } else if (n === 4) {
        style.textDecoration = 'underline';
      } else if (n === 22) {
        style.fontWeight = null;
      } else if (n === 23) {
        style.fontStyle = null;
      } else if (n === 24) {
        style.textDecoration = null;
      } else if (colorMap[n]) {
        style.color = colorMap[n];
      } else if (bgMap[n]) {
        style.backgroundColor = bgMap[n];
      }
    }
    return style;
  }

  function styleToCss(style) {
    let css = '';
    if (style.color) css += `color:${style.color};`;
    if (style.backgroundColor) css += `background-color:${style.backgroundColor};`;
    if (style.fontWeight) css += `font-weight:${style.fontWeight};`;
    if (style.fontStyle) css += `font-style:${style.fontStyle};`;
    if (style.textDecoration) css += `text-decoration:${style.textDecoration};`;
    return css;
  }

  function parseAnsiToHtml(text) {
    const ESC = '\u001b[';
    const parts = text.split(ESC);
    let html = escapeHtml(parts[0]);
    let current = { color:null, backgroundColor:null, fontWeight:null, fontStyle:null, textDecoration:null };

    for (let i = 1; i < parts.length; i++) {
      const segment = parts[i];
      const m = segment.match(/^([0-9;]*?)m/);

      if (!m) {
        html += escapeHtml(ESC + segment);
        continue;
      }

      const sgr = m[1] ? m[1].split(';') : ['0'];
      const updated = sgrToStyle(sgr);

      if (sgr.includes('0') || sgr.includes('00') || sgr.length === 0) {
        current = { color:null, backgroundColor:null, fontWeight:null, fontStyle:null, textDecoration:null };
      }
      
      for (const k of Object.keys(updated)) {
        if (updated[k] !== null) current[k] = updated[k];
      }
      const css = styleToCss(current);
      const rest = segment.slice(m[0].length);
      const safe = escapeHtml(rest);

      if (css) {
        html += `<span style="${css}">${safe}</span>`;
      } else {
        html += safe;
      }
    }
    return html;
  }

  function renderAnsi(){
    const pre = document.body.querySelector('pre, body');
    const text = pre ? pre.innerText : document.body.innerText;
    if (!text || text.indexOf('\u001b[') === -1) return; // no ansi codes, do nothing

    const html = parseAnsiToHtml(text);
    document.documentElement.style.background = 'white';
    document.body.innerHTML = '';
    const container = document.createElement('pre');
    container.style.margin = '0';
    container.style.whiteSpace = 'pre-wrap';
    container.style.wordBreak = 'break-word';
    container.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    container.innerHTML = html;
    document.body.appendChild(container);
  }
})();