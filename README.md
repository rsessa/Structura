# Structura

**Structura** es una aplicación de escritorio moderna, nativa y autocontenida diseñada para escribir, previsualizar y exportar diagramas de [Mermaid.js](https://mermaid.js.org/) en tiempo real sin requerir una conexión a Internet.

Construida con **Tauri v2**, **Vite**, y **Vanilla JS**, usa HTML, CSS y JavaScript crudo para mantener la máxima ligereza y eficiencia energética, todo empaquetado bajo un backend nativo de Rust ultrarrápido.

![Structura Icon](src-tauri/icons/128x128.png)

## 🚀 Características Principales

- **Arquitectura de Dos Ventanas**: Separa tu área de trabajo usando monitores duales de forma nativa.
  - **Ventana 1 (Editor)**: Un editor de texto oscuro enfocado en el código.
  - **Ventana 2 (Visor)**: Un lienzo expansivo que reacciona instantáneamente a cada pulsación de tu teclado.
- **Offline por Diseño**: Toda la biblioteca de visualización de Mermaid está insertada en la aplicación. No se bloquean recursos por CORS ni hay tiempos de respuesta de servidores CDN.
- **Sistema de Pestañas**: Permite trabajar en múltiples diagramas en paralelo, sincronizando su visualización en vivo entre ambas ventanas.
- **Smart Editor**: 
  - Manejo real e inteligente de Indentaciones (`Tab` funciona como se espera).
  - Incluye un motor de **Autoformateado** con un solo clic que estructura tu código Mermaid adecuadamente.
  - Soporta el estándar base `sequenceDiagram` y todo el conjunto oficial de Mermaid.
- **Exportación Rápida**: Copia el código fuente o exporta el gráfico final renderizado como `SVG` directamente a tu portapapeles.

---

## 🛠️ Entorno de Desarrollo

Structura es muy fácil de modificar y compilar. 

**Requisitos previos:**
1. [Node.js](https://nodejs.org/en) (v20 o superior).
2. Entorno [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites) con Rust/Cargo instalado (vía `rustup`).

### Instalación de dependencias
```bash
npm install
```

### Modo de desarrollo
Inicia un servidor web estático conectado en vivo al empaquetador de ventanas nativo de Tauri. Presenciarás todos los cambios al instante en formato app:
```bash
npm run tauri dev
```

---

## 📦 Compilación y Empaquetado

Puedes generar la aplicación de escritorio tú mismo para entregarla. 

### 1. Instalador Estándar de Windows (.exe MSI/NSIS)
Produce el instalador oficial que añade Structura a los programas de Windows (Menú Inicio, Desinstalación clásica, etc.):
```bash
npm run tauri build
```
El instalador se guarda en `src-tauri/target/release/bundle/nsis/`.

### 2. Versión Standalone / Portable (.exe Directo)
Si solo quieres pasarle la aplicación a un compañero o usarla desde un pendrive **sin requerir ninguna instalación previa en Windows**, simplemente ubica el compilado subyacente que genera Rust.

Tras ejecutar el proceso de Build de arriba, siempre se encuentra en:
```
src-tauri/target/release/app.exe
```
**(Solo cambia de nombre ese archivo a `Structura-Portable.exe` y listo).*
