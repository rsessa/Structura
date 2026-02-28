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
const copyImageBtn = document.getElementById('copy-image');
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

// Copy Diagram as PNG Image to clipboard
async function copyImage() {
    const svgEl = mermaidContainer.querySelector('svg');
    if (!svgEl) return;

    try {
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // Get dimensions from SVG
        const svgSize = svgEl.getBoundingClientRect();
        const padding = 40; // Add some padding
        canvas.width = svgSize.width + padding;
        canvas.height = svgSize.height + padding;

        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = async () => {
            // Fill white background for the PNG
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw SVG onto canvas
            ctx.drawImage(img, padding / 2, padding / 2);

            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);

                    // UI Feedback
                    const originalText = copyImageBtn.textContent;
                    copyImageBtn.textContent = '¡Imagen Copiada!';
                    setTimeout(() => copyImageBtn.textContent = originalText, 2000);
                } catch (clipboardErr) {
                    console.error('Clipboard write failed:', clipboardErr);
                } finally {
                    URL.revokeObjectURL(url);
                }
            }, 'image/png');
        };

        img.src = url;
    } catch (err) {
        console.error('Failed to copy image:', err);
    }
}

copyImageBtn.addEventListener('click', copyImage);

// Export SVG to Enclave
async function exportToEnclave() {
    const svgEl = mermaidContainer.querySelector('svg');
    if (!svgEl) return;

    const originalText = exportEnclaveBtn.innerHTML;
    try {
        const svgData = new XMLSerializer().serializeToString(svgEl);

        // Export 1: Raw SVG for compatibility
        await writeTextFile('C:\\scripts\\DataAnalisis\\inbox_diagram.svg', svgData);

        // Export 2: HTML Image for Enclave (Quill) compatibility
        // Using Base64 to ensure it's treated as an image asset
        const utf8Bytes = new TextEncoder().encode(svgData);
        let binary = '';
        const bytes = new Uint8Array(utf8Bytes);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        const htmlContent = `<img src="data:image/svg+xml;base64,${base64}" />`;
        await writeTextFile('C:\\scripts\\DataAnalisis\\inbox.html', htmlContent);

        // UI Feedback
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
