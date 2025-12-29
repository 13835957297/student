// preload.js去除webview滚动条
window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    ::-webkit-scrollbar { display: none !important; }
    html, body { -ms-overflow-style: none; scrollbar-width: none; }
    //  ::-webkit-scrollbar { width: 8px; height: 8px; }
    // ::-webkit-scrollbar-thumb { background: #aaa; border-radius: 4px; }
    // ::-webkit-scrollbar-thumb:hover { background: #777; }
  `;
  document.head.appendChild(style);
});