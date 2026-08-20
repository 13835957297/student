const { app, BrowserWindow, ipcMain, screen, globalShortcut, protocol, dialog } = require('electron')
const { pollUntilAccessible } = require('./utils/pollWebsite');
const { PORT, ip, IpIdEnum, TARGET_URL } =  require('./config.js');
const os = require('os');
const path = require('path')
const net = require('net');
const { exec } = require('child_process');

const http = require('http');
const url = require('url');

// 热重载
if (require('electron-squirrel-startup')) return;
try {
  require('electron-reloader')(module);
} catch (err) {
  console.log('Failed to enable hot reload:', err);
}


ipcMain.handle('get-app-config', (event) => {
  return { TARGET_URL };
});

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
    devTools: false, // 默认 true
    // kiosk: false,       // 👈 暂时关闭 kiosk，我们用 API 控制
    // fullscreen: false,  // 👈 构造函数里不设全屏
    autoHideMenuBar: true,
    backgroundColor: '#001529',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag:true,
    }
  });

  dpWindow.loadFile('index.html');
  // 自动打开 DevTools（开发时）
  // dpWindow.webContents.openDevTools();

  dpWindow.webContents.on('did-finish-load', () => {
    // 注入悬浮关机按钮（所有页面都注入）
    injectShutdownButton();
  });

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
    // 隐藏菜单栏
    dpWindow.setMenuBarVisibility(false);

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


function injectShutdownButton() {
    const iconPath = 'app:///assets/guanji.png';
    const injectScript = `
        // 创建悬浮按钮
        const shutdownBtn = document.createElement('button');
        shutdownBtn.id = 'shutdown-btn';
        shutdownBtn.style.cssText = \`
            position: fixed;
            right: 25px;
            top: 50%;
            transform: translateY(-50%);
            width: 70px;
            height: 70px;
            background: linear-gradient(145deg, #2d2d2d, #1f1f1f);
            border-radius: 50%;
            border: none;
            cursor: pointer;
            z-index: 9999;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 
                0 10px 40px rgba(0, 0, 0, 0.5),
                0 4px 15px rgba(0, 0, 0, 0.35),
                inset 0 2px 3px rgba(255, 255, 255, 0.12),
                inset 0 -2px 3px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            outline: none;
        \`;
        
        // 创建图标元素
        const icon = document.createElement('div');
        icon.style.cssText = \`
            width: 45px;
            height: 45px;
            background-image: url('${iconPath}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            opacity: 0.9;
            transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        \`;
        shutdownBtn.appendChild(icon);
        
        shutdownBtn.onmouseenter = function() {
            this.style.transform = 'translateY(-50%) scale(1.15)';
            this.style.background = 'linear-gradient(145deg, #ff4757, #c0392b)';
            this.style.boxShadow = '0 15px 50px rgba(255, 71, 87, 0.5), 0 8px 25px rgba(255, 71, 87, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.25)';
            icon.style.opacity = '1';
            icon.style.transform = 'scale(1.15)';
        };
        
        shutdownBtn.onmouseleave = function() {
            this.style.transform = 'translateY(-50%) scale(1)';
            this.style.background = 'linear-gradient(145deg, #2d2d2d, #1f1f1f)';
            this.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.5), 0 4px 15px rgba(0, 0, 0, 0.35), inset 0 2px 3px rgba(255, 255, 255, 0.12), inset 0 -2px 3px rgba(0, 0, 0, 0.3)';
            icon.style.opacity = '0.9';
            icon.style.transform = 'scale(1)';
        };
        
        shutdownBtn.onclick = function() {
            window.electronAPI.confirmShutdown();
        };
        
        // 移除已存在的按钮
        const existingBtn = document.getElementById('shutdown-btn');
        if (existingBtn) {
            existingBtn.remove();
        }
        
        document.body.appendChild(shutdownBtn);
    `;
    
    dpWindow.webContents.executeJavaScript(injectScript).catch(err => {
        console.error('注入悬浮按钮失败:', err);
    });
}
// TCP客户端
function connectToServer(ip, port = 8080){
  const client = new net.Socket();

  client.connect(port, ip, () => {
    console.log(`已连接到 ${ip}:${port}`);
    
    // 发送测试消息
    client.write(JSON.stringify({ from: 'startUp', text: 'Hello', timeLog: Date.now() }));
  });

  client.on('data', (data) => {
    console.log('收到响应:', data.toString());
  });

  client.on('error', (err) => {
    console.error('连接失败:', err.message);
  });

  client.on('close', () => {
    console.log('连接已关闭');
  });

  return client;
}

function restartTeacher() {
    const teacherIP = '192.168.31.125';
    const port = '9527';

    // 第一步：先 ping 确认教师端在线
    const pingURL = `http://${teacherIP}:${port}/ping`;
    
    const pingRequest = http.get(pingURL, (resp) => {
        let data = '';
        
        // 接收数据
        resp.on('data', (chunk) => {
            data += chunk;
        });
        
        // 数据接收完成
        resp.on('end', () => {
            try {
                const result = JSON.parse(data);
                
                if (result.role !== 'teacher') {
                    console.log('目标不是教师端');
                    return;
                }
                
                // 第二步：发送重启指令
                const restartURL = `http://${teacherIP}:${port}/restart`;
                const restartRequest = http.get(restartURL, (restartResp) => {
                    let restartData = '';
                    
                    restartResp.on('data', (chunk) => {
                        restartData += chunk;
                    });
                    
                    restartResp.on('end', () => {
                        console.log('已向教师端发送重启指令');
                    });
                });
                
                restartRequest.on('error', (err) => {
                    console.log('发送重启指令失败:', err.message);
                });
                
                restartRequest.setTimeout(3000, () => {
                    restartRequest.destroy();
                    console.log('发送重启指令超时');
                });
                
            } catch (error) {
                console.log('解析响应失败:', error.message);
            }
        });
    });
    
    pingRequest.on('error', (err) => {
        console.log('教师端不在线:', err.message);
    });
    
    pingRequest.setTimeout(3000, () => {
        pingRequest.destroy();
        console.log('Ping 请求超时');
    });
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('app', (request, callback) => {
        const url = request.url.replace('app:///', '');
        const filePath = path.join(__dirname, url);
        callback({ path: filePath });
    });
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
  // 启动客户端连接
  // connectToServer(ip, PORT);
  restartTeacher();

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

  // 注册全局快捷键：Ctrl+Q (Windows/Linux) 或 Cmd+Q (macOS)
  const ret = globalShortcut.register('CommandOrControl+Q', () => {
    app.quit();
  });

  if (!ret) {
    console.log('注册快捷键失败');
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

// 学生端投屏图片、文件
ipcMain.on('webview-send-genFile', async (event, data) => {
  console.log('📸 Zhunbeitouping:', data);

  try {
    // 下载图片到本地临时文件
    // const buffer = await downloadImage(imgSrc);
    // const tempPath = path.join(app.getPath('temp'), '投屏图片.jpg');
    // fs.writeFileSync(tempPath, buffer);

    // 通过 TCP 发送给学生机
    sendFileToTeacher({...data, machineId: IpIdEnum[getLocalIPv4()]});
  } catch (err) {
    console.error('TOU ping shi bai:', err);
  }
});

// function downloadImage(url) {
//   return new Promise((resolve, reject) => {
//     const client = url.startsWith('https') ? https : http;
//     client.get(url, (res) => {
//       const chunks = [];
//       res.on('data', chunk => chunks.push(chunk));
//       res.on('end', () => resolve(Buffer.concat(chunks)));
//     }).on('error', reject);
//   });
// }

function sendFileToTeacher(data) {
  const socket = new net.Socket();
  socket.connect(PORT, ip, () => {
    // const buffer = fs.readFileSync(imagePath);
    console.log('kaishilianjie')
    socket.write(JSON.stringify(data));
    // socket.write(buffer);
    // socket.end();
    console.log('📤 tupianyifasong');
  });

  socket.on('error', (err) => {
    console.error('❌ wufalianjie:', err.message);
  });
}

// 获取本机ip地址
function getLocalIPv4() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}


// 关闭教师端图片展示
ipcMain.handle('close-imgwin', async (event) => {
  try {
    // 通过 TCP 发送给学生机
    closeImgwin();
  } catch (err) {
    console.error('TOU ping shi bai:', err);
  }
});

// IPC 监听关机确认请求
ipcMain.on('confirm-shutdown', () => {
    confirmShutdown();
});

async function confirmShutdown() {
    const options = {
        type: 'warning',
        title: '确认关机',
        message: '确定要关闭计算机吗？',
        detail: '此操作将立即关闭计算机，请确保已保存所有工作。',
        buttons: ['取消', '确认关机'],
        defaultId: 0,
        cancelId: 0
    };

    const response = await dialog.showMessageBox(dpWindow, options);
    
    if (response.response === 1) {
        // 用户点击确认关机
        console.log('用户确认关机');
        
        // 根据操作系统执行关机指令
        if (process.platform === 'win32') {
            // Windows 关机命令
            exec('shutdown /s /t 0', (error) => {
                if (error) {
                    console.error('关机命令执行失败:', error);
                }
            });
        } else if (process.platform === 'linux') {
            // Linux 关机命令
            exec('sudo shutdown -h now', (error) => {
                if (error) {
                    console.error('关机命令执行失败:', error);
                }
            });
        } else if (process.platform === 'darwin') {
            // macOS 关机命令
            exec('shutdown -h now', (error) => {
                if (error) {
                    console.error('关机命令执行失败:', error);
                }
            });
        }
    } else {
        console.log('用户取消关机');
    }
}

function closeImgwin() {
  const socket = new net.Socket();
  socket.connect(PORT, ip, () => {
    // const buffer = fs.readFileSync(imagePath);
    console.log('guanbitupian: kaishilianjie')
    socket.write(JSON.stringify({ from: 'hidePic', text: "hidePic", timeLog: Date.now() }));
    // socket.write(buffer);
    // socket.end();
  });

  socket.on('error', (err) => {
    console.error('❌ wufalianjie:', err.message);
  });
}