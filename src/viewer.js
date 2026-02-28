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
const resetViewBtn = document.getElementById('reset-view');
const copyImageBtn = document.getElementById('copy-image');
const exportEnclaveBtn = document.getElementById('export-enclave');
const viewerMain = document.querySelector('.viewer-main');
const mermaidContainer = document.getElementById('mermaid-container');
const errorAlert = document.getElementById('error-alert');

// Zoom & Pan State
let scale = 1;
let translateX = 0;
let translateY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;

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
    }
}

function updateTransform() {
    mermaidContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

function resetView() {
    const svgEl = mermaidContainer.querySelector('svg');
    if (!svgEl) {
        scale = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
        return;
    }

    // Get original dimensions
    const originalWidth = svgEl.viewBox.baseVal.width || svgEl.width.baseVal.value || 800;
    const originalHeight = svgEl.viewBox.baseVal.height || svgEl.height.baseVal.value || 600;

    const containerWidth = viewerMain.clientWidth;
    const containerHeight = viewerMain.clientHeight;

    // Calculate scale to fit with margin
    const padding = 40;
    const scaleX = (containerWidth - padding) / originalWidth;
    const scaleY = (containerHeight - padding) / originalHeight;

    scale = Math.min(scaleX, scaleY, 1.5); // Max scale 1.5
    translateX = 0;
    translateY = 0;
    updateTransform();
}

resetViewBtn.addEventListener('click', resetView);

// Mouse Interaction for Zoom & Pan
viewerMain.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    if (e.deltaY < 0) {
        scale += zoomSpeed;
    } else {
        scale = Math.max(0.1, scale - zoomSpeed);
    }
    updateTransform();
}, { passive: false });

viewerMain.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left click
        isPanning = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
});

window.addEventListener('mouseup', () => {
    isPanning = false;
});

// COPY SVG REMOVED BY USER REQUEST
// copyDiagramBtn.addEventListener('click', copySVG);

// Copy Diagram as PNG Image to clipboard with Window Resolution
async function copyImage() {
    const svgEl = mermaidContainer.querySelector('svg');
    if (!svgEl) return;

    try {
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // Resolution: Match current viewer container size as requested
        const width = viewerMain.clientWidth;
        const height = viewerMain.clientHeight;

        // Use a multiplier for higher quality
        const dpi = window.devicePixelRatio || 1;
        canvas.width = width * dpi;
        canvas.height = height * dpi;
        ctx.scale(dpi, dpi);

        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = async () => {
            // Fill white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            // Calculate scale to fit current zoom or just best fit?
            // "La imagen exportada debe tener la resolucion de la ventana actual"
            // We'll draw the container's visual state

            const containerRect = viewerMain.getBoundingClientRect();
            const svgRect = svgEl.getBoundingClientRect();

            // Draw relative to center
            const dx = (width / 2) + (translateX / scale);
            const dy = (height / 2) + (translateY / scale);

            // Actually, simpler: draw exactly what's visible
            // We apply the current CSS transform to the context
            ctx.save();
            ctx.translate(width / 2 + translateX, height / 2 + translateY);
            ctx.scale(scale, scale);

            // We need to offset the SVG back since it's centered in the container
            // Mermaid SVGs often have their own internal scaling.
            // Let's just draw the SVG at its original size and let our transforms do the rest.
            const originalWidth = svgEl.viewBox.baseVal.width || svgEl.width.baseVal.value;
            const originalHeight = svgEl.viewBox.baseVal.height || svgEl.height.baseVal.value;

            ctx.drawImage(img, -originalWidth / 2, -originalHeight / 2);
            ctx.restore();

            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);

                    const originalText = copyImageBtn.textContent;
                    copyImageBtn.textContent = '¡Imagen Copiada!';
                    setTimeout(() => copyImageBtn.textContent = originalText, 2000);
                } catch (err) {
                    console.error('Clipboard failed:', err);
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
