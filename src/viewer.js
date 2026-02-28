import { listen } from '@tauri-apps/api/event';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { getCurrentWindow } from '@tauri-apps/api/window';
import mermaid from 'mermaid';

// Initialize Mermaid
mermaid.initialize({ startOnLoad: false, theme: 'default' });

// App State
let tabs = [
    { id: 1, name: 'Diagrama 1' }
];
let tabContents = {
    1: 'sequenceDiagram\n\tAlice->>John: Hola\n\tJohn-->>Alice: ¡Bien!'
};
let activeTabId = 1;

// DOM Elements
const tabsContainer = document.getElementById('tabs');
const copyDiagramBtn = document.getElementById('copy-diagram');
const exportEnclaveBtn = document.getElementById('export-enclave');
const mermaidContainer = document.getElementById('mermaid-container');
const errorAlert = document.getElementById('error-alert');

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
    activeTabId = id;
    renderTabs();
    renderDiagram();
}

async function renderDiagram() {
    const code = tabContents[activeTabId];
    if (!code || code.trim() === '') {
        mermaidContainer.innerHTML = '';
        errorAlert.textContent = '';
        return;
    }

    try {
        const id = `mermaid-svg-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        mermaidContainer.innerHTML = svg;
        errorAlert.textContent = '';
    } catch (error) {
        console.error('Mermaid Parsing Error:', error);
        errorAlert.textContent = 'Syntax Error';
        // Let the previous SVG remain to avoid flashing on every typo
    }
}

// Copy SVG to clipboard
async function copySVG() {
    const svgEl = mermaidContainer.querySelector('svg');
    if (!svgEl) return;

    try {
        const svgData = new XMLSerializer().serializeToString(svgEl);
        await navigator.clipboard.writeText(svgData);

        // UI Feedback
        const originalText = copyDiagramBtn.textContent;
        copyDiagramBtn.textContent = '¡Copiado!';
        setTimeout(() => copyDiagramBtn.textContent = originalText, 2000);
    } catch (err) {
        console.error('Failed to copy SVG:', err);
    }
}

copyDiagramBtn.addEventListener('click', copySVG);

// Export SVG to Enclave
async function exportToEnclave() {
    const svgEl = mermaidContainer.querySelector('svg');
    if (!svgEl) return;

    try {
        const svgData = new XMLSerializer().serializeToString(svgEl);
        await writeTextFile('C:\\scripts\\DataAnalisis\\inbox_diagram.svg', svgData);

        // UI Feedback
        const originalText = exportEnclaveBtn.innerHTML;
        exportEnclaveBtn.textContent = 'Diagrama enviado a Enclave';
        setTimeout(async () => {
            await getCurrentWindow().close();
        }, 2000);
    } catch (err) {
        console.error('Failed to export to Enclave:', err);
        errorAlert.textContent = 'Error exportando';
        setTimeout(() => exportEnclaveBtn.innerHTML = originalText, 2000);
    }
}

exportEnclaveBtn.addEventListener('click', exportToEnclave);

// IPC Listeners
listen('update-diagram', (event) => {
    const { tabId, codigo } = event.payload;

    // Implicitly add tab if it doesn't exist
    if (!tabs.find(t => t.id === tabId)) {
        tabs.push({ id: tabId, name: `Diagrama ${tabId}` });
        renderTabs();
    }

    tabContents[tabId] = codigo;

    // Render if it is the currently active tab in Viewer
    if (tabId === activeTabId) {
        renderDiagram();
    }
});

listen('tab-added', (event) => {
    const tab = event.payload;
    if (!tabs.find(t => t.id === tab.id)) {
        tabs.push({ id: tab.id, name: tab.name });
        tabContents[tab.id] = tab.content;
        renderTabs();
    }
});

// Init
renderTabs();
renderDiagram();
