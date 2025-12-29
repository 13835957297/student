async function testElectron() {
  const response = await window.electronAPI.ping()
  document.getElementById('result').textContent = response
}

// 可选：监听主进程消息
// window.electronAPI.onUpdate((data) => {
//   console.log('收到更新:', data)
// })


// renderer.js
// const targetUrl = 'https://bowen.cb-ec.cn/'; // 局域网地址
const targetUrl = 'http://bw2.cb-ec.cn/'; // 局域网地址


(async () => {
  try {
    const accessibleUrl = await window.electronAPI.pollAndLoadWebsite(targetUrl);
    
    // 切换 UI：隐藏 loading，显示 webview
    // document.getElementById('loading').style.display = 'none';
    document.getElementById('webview-container').style.display = 'block';
    
    // 加载网址到 webview
    const webview = document.getElementById('myWebview');
    webview.src = accessibleUrl;

    // 监听webview加载完成
    webview.addEventListener('did-finish-load', () => {
      document.getElementById('loading').style.display = 'none';
    })

    // 可选：监听 webview 加载事件
    webview.addEventListener('did-fail-load', (e) => {
      console.error('Webview failed to load:', e.errorDescription);
    });

  } catch (err) {
    // document.getElementById('loading').innerText = `连接失败: ${err.message}`;
    console.error(err);
  }
})();