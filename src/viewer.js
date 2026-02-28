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

// Helper to generate PNG from current SVG state
async function generatePngBlob() {
    const svgEl = mermaidContainer.querySelector('svg');
    if (!svgEl) throw new Error('No SVG found');

    // Clone to avoid modifying the live diagram
    const clonedSvg = svgEl.cloneNode(true);

    // Get dimensions and viewBox info
    const vBox = svgEl.viewBox.baseVal;
    // Mermaid SVGs usually have a viewBox. Use it as reference for internal coordinates.
    const internalW = vBox.width || 800;
    const internalH = vBox.height || 600;
    const vBoxX = vBox.x || 0;
    const vBoxY = vBox.y || 0;

    // Ensure cloned SVG has explicit intrinsic dimensions for the Image loader
    clonedSvg.setAttribute('width', internalW);
    clonedSvg.setAttribute('height', internalH);

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // The user wants "la resolución de la ventana actual" (the viewport)
    const vWidth = viewerMain.clientWidth;
    const vHeight = viewerMain.clientHeight;

    // High quality multiplier
    const dpi = window.devicePixelRatio || 2;
    canvas.width = vWidth * dpi;
    canvas.height = vHeight * dpi;
    ctx.scale(dpi, dpi);

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
        img.onload = () => {
            // Background fill
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, vWidth, vHeight);

            ctx.save();
            // 1. Position at viewer center
            ctx.translate(vWidth / 2, vHeight / 2);
            // 2. Apply current user Pan
            ctx.translate(translateX, translateY);
            // 3. Apply current user Scale
            ctx.scale(scale, scale);

            // 4. Draw SVG centered
            // We draw the image such that its internal center (calculated from viewBox) 
            // aligns with our current (0,0) point.
            // We must subtract vBoxX/vBoxY because the image starts rendering at (vBoxX, vBoxY) internally.
            const drawX = -internalW / 2 - vBoxX;
            const drawY = -internalH / 2 - vBoxY;

            ctx.drawImage(img, drawX, drawY, internalW, internalH);
            ctx.restore();

            canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob failed'));
            }, 'image/png');
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        };
        img.src = url;
    });
}

// Copy Diagram as PNG Image to clipboard
async function copyImage() {
    try {
        const blob = await generatePngBlob();
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);

        const originalText = copyImageBtn.textContent;
        copyImageBtn.textContent = '¡Imagen Copiada!';
        setTimeout(() => copyImageBtn.textContent = originalText, 2000);
    } catch (err) {
        console.error('Failed to copy image:', err);
    }
}

copyImageBtn.addEventListener('click', copyImage);

// Export to Enclave (Generating inbox.html with PNG Base64)
async function exportToEnclave() {
    const svgEl = mermaidContainer.querySelector('svg');
    if (!svgEl) return;

    const originalText = exportEnclaveBtn.innerHTML;
    try {
        // Raw SVG for raw format compatibility
        const svgData = new XMLSerializer().serializeToString(svgEl);
        await writeTextFile('C:\\scripts\\DataAnalisis\\inbox_diagram.svg', svgData);

        // REAL IMAGE for Enclave (Quill) compatibility
        const blob = await generatePngBlob();

        // Convert Blob to Base64 for HTML embedding
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
        const dataUrl = await base64Promise;

        const htmlContent = `<img src="${dataUrl}" />`;
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
