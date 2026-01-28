const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 可以暴露更多 API
  ping: () => ipcRenderer.invoke('ping'),
  pollAndLoadWebsite: (url) => ipcRenderer.invoke('poll-and-load-website', url),
  closeImgwin: () => ipcRenderer.invoke('close-imgwin'),
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


// 监听图片投屏按钮
window.addEventListener('click', (e) => {

  // alert(this.getAttribute('data-link'))
  const target = e.target; let dataStr = '';
  // 检查该元素是否有 data-link 属性
  if (target.hasAttribute('data-link')) {
    dataStr= target.getAttribute('data-link');
  }
  // 获取按钮传来的数据
  // dataStr = "?img_id=a,video_id=b,text_id=TEXT";
  console.log('data-link:', dataStr);
  const obj = {};
  if (dataStr) {
      // 去掉开头的 ?
      const cleanStr = dataStr.startsWith('?') ? dataStr.slice(1) : dataStr;
      // 按逗号分割，再按等号分割每一对
      cleanStr.split(',').forEach(pair => {
        const [key, value] = pair.split('=');
        obj[key] = value;
      });

      console.log(obj);
  }

  const imgTag = document.querySelector('#'+obj.img_id);
  const viedeoTag = document.querySelector('#'+obj.video_id);
  const textTag = document.querySelector('#'+obj.text_id);
  let content = imgTag?imgTag.src:viedeoTag ?viedeoTag.src:textTag?textTag.textContent:'';
  
  let type = imgTag?'image':viedeoTag?'video':textTag?'text':'';

  if (e.target.matches('#showContent')) {
    // ipcRenderer.send('special-button-clicked', {
    //   tagName: e.target.tagName,
    //   id: e.target.id,
    //   classList: Array.from(e.target.classList)
    // });
    // ipcRenderer.send('webview-send-image', imgTag.src);
    ipcRenderer.send('webview-send-genFile', {from: 'showGenFile', type:type, content: content, timeLog: Date.now()});
  }
});
window.addEventListener('click', (e) => {
  if (e.target.matches('#hideContent')) {
    ipcRenderer.invoke('close-imgwin')
  }
});