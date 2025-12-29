const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron')
const { pollUntilAccessible } = require('./utils/pollWebsite');
const path = require('path')

// 热重载
if (require('electron-squirrel-startup')) return;
try {
  require('electron-reloader')(module);
} catch (err) {
  console.log('Failed to enable hot reload:', err);
}

ipcMain.handle('ping', async (event) => {
  return 'pong!'  // 可以返回任意数据
})

// 创建主窗口
// let win = null;
// function createWindow () {
//   win = new BrowserWindow({
//     width: 1000,
//     height: 700,
//     title: '博文教育',
//     myWindowId: 1,
//     kiosk: true,           // 强制全屏
//     alwaysOnTop: true,     // 强制置顶
//     frame: false,          // 可选：隐藏边框和按钮
//     resizable: false,      // 禁止调整大小
//     fullscreenable: true, // 防止用户退出全屏
//     devTools: false, // 禁用 DevTools
//     webPreferences: {
//       preload: path.join(__dirname, 'preload.js'),
//       webviewTag:true,
//       contextIsolation: true,
//       nodeIntegration: false
//     }
//   })

//   win.loadFile('index.html')
//   // 开发时打开开发者工具
//   // win.webContents.openDevTools()

//   // // 额外保险：移除菜单栏
//   // win.setMenu(null);

//   // 监听并阻止 DevTools 打开（即使通过其他方式尝试）
//   win.webContents.on('devtools-opened', () => {
//     win.webContents.closeDevTools();
//   });
// }

// 创建dp窗口
let dpWindow = null;
function createDpWindow() {
  const displays = screen.getAllDisplays();

  // 假设：HDMI 维护屏是主显示器（通常 bounds.x=0, y=0）
  const primaryDisplay = displays.find(d => d.bounds.x === 0 && d.bounds.y === 0);
  const dpDisplay = displays.find(d => d.id == primaryDisplay?.id);

  if (!dpDisplay) {
    dpDisplay = displays[1];
    console.error('❌ 未检测到 DP 显示器（请确保已连接且系统识别）');
    // 退而求其次：使用第一个非主屏，或直接用第二个显示器
    // if (displays.length >= 2) {
    //   // dpDisplay = displays[1];
    //   dpDisplay = displays[0];
    // } else {
    //   dpDisplay = displays[0]; // 单屏 fallback
    // }
  }

  const { x, y, width, height } = dpDisplay.bounds;

  dpWindow = new BrowserWindow({
    width: 800, // 临时值
    height: 600, // 临时值
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    // kiosk: false,       // 👈 暂时关闭 kiosk，我们用 API 控制
    // fullscreen: false,  // 👈 构造函数里不设全屏
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag:true,
    }
  });

  dpWindow.loadFile('index.html');
  dpWindow.once('ready-to-show', () => {
     // 1. 获取真实的屏幕尺寸（包含任务栏区域）
    // 注意：这里使用 workArea 可能不够，我们需要用 bounds 并手动扩大
    const targetX = x - 5;
    const targetY = y -5 ;
    const targetWidth = width + 10;
    const targetHeight = height + 10; // ⬅️ 关键：高度增加，确保盖住底部任务栏

    // 2. 强制拉伸窗口覆盖任务栏
    dpWindow.setBounds({
      x: targetX,
      y: targetY,
      width: targetWidth,
      height: targetHeight
    });
    // 3. 强制置顶（防止被系统弹窗压住）
    dpWindow.setAlwaysOnTop(true, 'screen-saver'); // 'screen-saver' 级别最高
    dpWindow.show()
    dpWindow.on('blur', () => {
    setTimeout(() => {
      if (dpWindow && !dpWindow.isDestroyed()) {
        dpWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }, 500);
  });
  });
}


app.whenReady().then(() => {
  // createWindow()

  // const success = globalShortcut.register('Ctrl+Alt+F', () => {
  //   if (win && !win.isDestroyed()) {
  //     win.show();
  //     // 2. 设置为顶层
  //     win.setAlwaysOnTop(true, 'screen-saver', 1); // 使用高 Z-order
  //     // 3. 先取消置顶再重新置顶（绕过某些系统限制的技巧）
  //     setTimeout(() => {
  //       win.setAlwaysOnTop(false);
  //       win.setAlwaysOnTop(true, 'screen-saver', 1);
  //     }, 50);
  //     win.focus(); // ⭐️ 核心：强制聚焦
  //     console.log('✅ 焦点已切换到 DP 业务屏');
  //   }
  // });

  // app.on('activate', () => {
  //   if (BrowserWindow.getAllWindows().length === 0) createWindow()
  // })

  // 创建dp窗口
  createDpWindow();
    // 🔑 全局快捷键：切回 DP 屏（维护结束时用）
  const success = globalShortcut.register('Ctrl+Alt+F', () => {
    if (dpWindow && !dpWindow.isDestroyed()) {
      dpWindow.show();
      dpWindow.focus(); // ⭐️ 核心：强制聚焦
      console.log('✅ 焦点已切换到 DP 业务屏');
    }
  });

  if (!success) {
    console.warn('⚠️ 快捷键注册失败（可能被其他程序占用）');
  }

})

// 消除快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// 处理轮询请求
ipcMain.handle('poll-and-load-website', async (event, targetUrl) => {
  const success = await pollUntilAccessible(targetUrl, 3000, 20); // 每3秒一次，最多20次（共约1分钟）
  if (success) {
    return targetUrl;
  } else {
    throw new Error('Website not accessible within retry limit');
  }
});