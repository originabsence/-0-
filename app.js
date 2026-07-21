const GUIDES = {
  latex: [
    ['$x$', 'inline math'],
    ['$$x$$', 'display math'],
    ['\\frac{a}{b}', 'fraction'],
    ['x^{2}', 'exponent'],
    ['x_{i}', 'subscript'],
    ['\\sqrt{x}', 'square root'],
    ['\\sum_{i=1}^{n}', 'sum'],
    ['\\int_{a}^{b}', 'integral'],
    ['\\alpha \\beta \\gamma', 'greek letters'],
    ['\\cdot', 'multiply dot'],
    ['\\times', 'multiply x'],
    ['\\leq \\geq \\neq', 'comparisons'],
    ['\\infty', 'infinity'],
    ['\\pm', 'plus minus'],
    ['\\left( \\right)', 'auto sized brackets'],
    ['\\rightarrow', 'arrow'],
    ['\\begin{matrix}a&b\\\\c&d\\end{matrix}', 'matrix']
  ],
  markdown: [
    ['# text', 'heading'],
    ['**text**', 'bold'],
    ['*text*', 'italic'],
    ['[text](link)', 'link'],
    ['![alt](link)', 'image'],
    ['- text', 'list item'],
    ['1. text', 'numbered list'],
    ['`code`', 'inline code'],
    ['```', 'code block'],
    ['> text', 'quote'],
    ['---', 'horizontal line']
  ]
};

const state = {
  tabs: [],
  activeId: null,
  counters: { latex: 0, markdown: 0, text: 0, html: 0 }
};

function uid(){ return Math.random().toString(36).slice(2, 9); }

function newTab(type){
  state.counters[type]++;
  const tab = {
    id: uid(),
    type,
    name: type + ' ' + state.counters[type],
    content: defaultContent(type)
  };
  state.tabs.push(tab);
  state.activeId = tab.id;
  render();
}

function defaultContent(type){
  if(type === 'latex') return '$$\\frac{a}{b} + \\sqrt{c}$$';
  if(type === 'markdown') return '# hello\n\nsome **bold** text';
  if(type === 'html') return '<h1>hello</h1>';
  return '';
}

function closeTab(id){
  const idx = state.tabs.findIndex(t => t.id === id);
  if(idx === -1) return;
  if(state.tabs.length === 1) return;
  state.tabs.splice(idx, 1);
  if(state.activeId === id){
    state.activeId = state.tabs[Math.max(0, idx - 1)].id;
  }
  render();
}

function activeTab(){
  return state.tabs.find(t => t.id === state.activeId);
}

function escapeHtml(str){
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderKatexSafe(expr, displayMode){
  try{
    return katex.renderToString(expr, { throwOnError:false, displayMode });
  }catch(e){
    return '<span style="color:#fca5a5;">' + escapeHtml(expr) + '</span>';
  }
}

function renderLatexToHtml(src){
  const regex = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$/g;
  let result = '';
  let lastIndex = 0;
  let match;
  while((match = regex.exec(src)) !== null){
    const plain = src.slice(lastIndex, match.index);
    result += escapeHtml(plain).replace(/\n/g, '<br>');
    if(match[1] !== undefined){
      result += renderKatexSafe(match[1], true);
    }else{
      result += renderKatexSafe(match[2], false);
    }
    lastIndex = regex.lastIndex;
  }
  result += escapeHtml(src.slice(lastIndex)).replace(/\n/g, '<br>');
  return result;
}

function downloadFile(filename, content, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyText(text, statusEl){
  navigator.clipboard.writeText(text)
    .then(() => statusEl.textContent = 'copied')
    .catch(() => statusEl.textContent = 'failed');
}

function screenshotPreview(el, statusEl){
  statusEl.textContent = 'capturing...';
  html2canvas(el, { backgroundColor: null }).then(canvas => {
    canvas.toBlob(blob => {
      if(!blob){ statusEl.textContent = 'failed'; return; }
      if(navigator.clipboard && window.ClipboardItem){
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          .then(() => statusEl.textContent = 'copied')
          .catch(() => fallbackDownloadImage(blob, statusEl));
      }else{
        fallbackDownloadImage(blob, statusEl);
      }
    });
  }).catch(() => statusEl.textContent = 'failed');
}

function fallbackDownloadImage(blob, statusEl){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'output.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  statusEl.textContent = 'downloaded';
}

function runHtml(content){
  const win = window.open('about:blank');
  win.document.open();
  win.document.write(content);
  win.document.close();
}

function buildGuide(type){
  const guide = document.getElementById('guide');
  const entries = GUIDES[type];
  if(!entries){ guide.innerHTML = ''; return; }
  let html = '<h3>guide</h3>';
  entries.forEach(([code, desc]) => {
    html += '<div class="entry"><code>' + escapeHtml(code) + '</code><div class="desc">' + escapeHtml(desc) + '</div></div>';
  });
  guide.innerHTML = html;
}

function buildActions(tab, statusEl){
  const actions = document.getElementById('actions');
  actions.innerHTML = '';

  function addBtn(label, fn){
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', fn);
    actions.appendChild(b);
  }

  if(tab.type === 'latex'){
    addBtn('copy', () => copyText(tab.content, statusEl));
    addBtn('screenshot without background', () => {
      screenshotPreview(document.getElementById('preview'), statusEl);
    });
  }else if(tab.type === 'markdown'){
    addBtn('copy', () => copyText(tab.content, statusEl));
    addBtn('download', () => downloadFile(tab.name.replace(/\s+/g,'-') + '.md', tab.content, 'text/markdown'));
  }else if(tab.type === 'html'){
    addBtn('run', () => runHtml(tab.content));
    addBtn('download', () => downloadFile(tab.name.replace(/\s+/g,'-') + '.html', tab.content, 'text/html'));
  }else if(tab.type === 'text'){
    addBtn('download', () => downloadFile(tab.name.replace(/\s+/g,'-') + '.txt', tab.content, 'text/plain'));
  }
}

function renderPreview(tab){
  const preview = document.getElementById('preview');
  if(tab.type === 'latex'){
    preview.innerHTML = renderLatexToHtml(tab.content);
  }else if(tab.type === 'markdown'){
    preview.innerHTML = marked.parse(tab.content);
  }else{
    const pre = document.createElement('pre');
    pre.textContent = tab.content;
    preview.innerHTML = '';
    preview.appendChild(pre);
  }
}

function render(){
  const tabbar = document.getElementById('tabbar');
  tabbar.innerHTML = '';
  state.tabs.forEach(t => {
    const el = document.createElement('div');
    el.className = 'tab' + (t.id === state.activeId ? ' active' : '');
    el.innerHTML = '<span>' + escapeHtml(t.name) + '</span><span class="x">x</span>';
    el.addEventListener('click', (e) => {
      if(e.target.classList.contains('x')){
        closeTab(t.id);
      }else{
        state.activeId = t.id;
        render();
      }
    });
    tabbar.appendChild(el);
  });

  const tab = activeTab();
  if(!tab) return;

  const main = document.getElementById('main');
  if(tab.type === 'latex' || tab.type === 'markdown'){
    main.classList.remove('no-guide');
    buildGuide(tab.type);
  }else{
    main.classList.add('no-guide');
  }

  const editor = document.getElementById('editor');
  editor.value = tab.content;

  const statusEl = document.getElementById('status');
  statusEl.textContent = '';

  buildActions(tab, statusEl);
  renderPreview(tab);
}

document.getElementById('editor').addEventListener('input', (e) => {
  const tab = activeTab();
  if(!tab) return;
  tab.content = e.target.value;
  renderPreview(tab);
});

document.getElementById('addTabBtn').addEventListener('click', () => {
  document.getElementById('typeMenu').classList.toggle('hidden');
});

document.querySelectorAll('#typeMenu button').forEach(btn => {
  btn.addEventListener('click', () => {
    newTab(btn.dataset.type);
    document.getElementById('typeMenu').classList.add('hidden');
  });
});

document.addEventListener('click', (e) => {
  const wrap = document.querySelector('.addtab-wrap');
  if(!wrap.contains(e.target)){
    document.getElementById('typeMenu').classList.add('hidden');
  }
});

newTab('latex');
