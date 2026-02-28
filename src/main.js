import { emit } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-shell';

// App State
let tabs = [
  { id: 1, name: 'Diagrama 1', content: 'sequenceDiagram\n\tAlice->>John: Hola\n\tJohn-->>Alice: ¡Bien!' }
];
let activeTabId = 1;
let tabCounter = 1;

// DOM Elements
const tabsContainer = document.getElementById('tabs');
const addTabBtn = document.getElementById('add-tab');
const copyCodeBtn = document.getElementById('copy-code');
const formatCodeBtn = document.getElementById('format-code');
const openDocsBtn = document.getElementById('open-docs');
const editorTextarea = document.getElementById('editor-textarea');

// Functions
function renderTabs() {
  tabsContainer.innerHTML = '';
  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = `tab ${tab.id === activeTabId ? 'active' : ''}`;
    btn.dataset.tabId = tab.id.toString();
    btn.textContent = tab.name;
    btn.onclick = () => switchTab(tab.id);
    tabsContainer.appendChild(btn);
  });
}

function switchTab(id) {
  // Save current tab content directly via the input event but just in case:
  const activeTab = tabs.find(t => t.id === activeTabId);
  if (activeTab) {
    activeTab.content = editorTextarea.value;
  }
  activeTabId = id;
  const newTab = tabs.find(t => t.id === id);
  if (newTab) {
    editorTextarea.value = newTab.content;
    renderTabs();
    emitUpdate(activeTabId, newTab.content);
  }
}

function addTab() {
  tabCounter++;
  const newTab = {
    id: tabCounter,
    name: `Diagrama ${tabCounter}`,
    content: 'sequenceDiagram\n\tInit->>Action: Start'
  };
  tabs.push(newTab);
  switchTab(newTab.id);
  // Also emit event to tell viewer to spawn tab
  emit('tab-added', newTab);
}

function copyCode() {
  navigator.clipboard.writeText(editorTextarea.value)
    .then(() => {
      const originalText = copyCodeBtn.textContent;
      copyCodeBtn.textContent = '¡Copiado!';
      setTimeout(() => copyCodeBtn.textContent = originalText, 2000);
    })
    .catch(err => console.error('Failed to copy: ', err));
}

function emitUpdate(tabId, code) {
  emit('update-diagram', { tabId, codigo: code }).catch(console.error);
}

// Event Listeners
editorTextarea.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editorTextarea.selectionStart;
    const end = editorTextarea.selectionEnd;
    editorTextarea.value = editorTextarea.value.substring(0, start) + '\t' + editorTextarea.value.substring(end);
    editorTextarea.selectionStart = editorTextarea.selectionEnd = start + 1;
    editorTextarea.dispatchEvent(new Event('input'));
  }
});

editorTextarea.addEventListener('input', (e) => {
  const code = e.target.value;
  const activeTab = tabs.find(t => t.id === activeTabId);
  if (activeTab) {
    activeTab.content = code;
  }
  emitUpdate(activeTabId, code);
});

function formatMermaidCode(code) {
  const lines = code.split('\n');
  let formatted = [];
  let indentLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line === '') {
      formatted.push('');
      continue;
    }

    if (line.startsWith('}') || line.startsWith('end')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const topLevelKeywords = ['sequenceDiagram', 'graph', 'classDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'gitGraph', 'C4Context', 'mindmap', 'timeline', 'quadrantChart'];
    let isTopLevel = topLevelKeywords.some(type => line.startsWith(type));

    if (isTopLevel) {
      indentLevel = 0;
    }

    formatted.push('\t'.repeat(indentLevel) + line);

    if (isTopLevel) {
      indentLevel++;
    }

    if (line.endsWith('{') || line.startsWith('alt ') || line.startsWith('opt ') || line.startsWith('loop ') || line.startsWith('rect ') || line.startsWith('par ')) {
      indentLevel++;
    }
  }
  return formatted.join('\n');
}

formatCodeBtn.addEventListener('click', () => {
  editorTextarea.value = formatMermaidCode(editorTextarea.value);
  editorTextarea.dispatchEvent(new Event('input'));
  const originalText = formatCodeBtn.textContent;
  formatCodeBtn.textContent = '¡Formateado!';
  setTimeout(() => formatCodeBtn.textContent = originalText, 2000);
});

addTabBtn.addEventListener('click', addTab);
copyCodeBtn.addEventListener('click', copyCode);

openDocsBtn.addEventListener('click', async () => {
  try {
    await open('https://mermaid.js.org/intro/');
  } catch (err) {
    console.error('Failed to open documentation:', err);
  }
});

// Init
editorTextarea.value = tabs[0].content;
renderTabs();
// Emit initial state
setTimeout(() => emitUpdate(activeTabId, tabs[0].content), 500);
