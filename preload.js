const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 可以暴露更多 API
  ping: () => ipcRenderer.invoke('ping'),
  pollAndLoadWebsite: (url) => ipcRenderer.invoke('poll-and-load-website', url),
})

// // preload.js去除webview滚动条
// window.addEventListener('DOMContentLoaded', () => {
//   const style = document.createElement('style');
//   style.textContent = `
//     ::-webkit-scrollbar { display: none !important; }
//     html, body { -ms-overflow-style: none; scrollbar-width: none; }
//     //  ::-webkit-scrollbar { width: 8px; height: 8px; }
//     // ::-webkit-scrollbar-thumb { background: #aaa; border-radius: 4px; }
//     // ::-webkit-scrollbar-thumb:hover { background: #777; }
//   `;
//   document.head.appendChild(style);
// });

// preload.js
const { webFrame } = require('electron');

webFrame.insertCSS(`
  ::-webkit-scrollbar { display: none !important; }
  html, body {
    -ms-overflow-style: none !important;
    scrollbar-width: none !important;
  }
  *, *::before, *::after {
    -ms-overflow-style: none !important;
    scrollbar-width: none !important;
  }
  *::-webkit-scrollbar {
    display: none !important;
  }
`);