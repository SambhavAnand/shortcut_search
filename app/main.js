const { app, BrowserWindow, globalShortcut, Menu, Tray, ipcMain, screen } = require('electron')
const path = require('path')

const { verify } = require('./scripts/lib')
const { menubar } = require('menubar')
const { ShortcutsStore  } = require('./scripts/util')

const iconPath = app.isPackaged ? path.join(process.resourcesPath, "resources/IconTemplate.png") : "./assets/IconTemplate.png";

//write function with min/max limits so that the size of the window is always resonable
//Local Shortcut store
const store = new ShortcutsStore()



let win; 
function toggleWindow() {
    if (win.isVisible()) {
        win.hide()
    }
    else {
        win.setVisibleOnAllWorkspaces(true);
        win.show();
        win.setVisibleOnAllWorkspaces(false);
    }
}


app.on("ready", () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    win = new BrowserWindow({ 
        width: 550, 
        height: 380,
        frame:false, 
        resizable: false,
        transparent: true,
        webPreferences:{
            nodeIntegration: true
        },
        show: false
    });
    
    win.loadURL(`file://${__dirname}/index.html`)
    
    win.on('ready-to-show', () => {
        store.getShortcuts()
        .then(data => win.webContents.send('updateData', data))
        .catch(error => console.log(error))
    })

    const ret = globalShortcut.register('Ctrl+k', () => {
        toggleWindow()
        if (!ret) {
            console.log('registration failed')
          }  
    });

    //DEV TOOLS TOGGLE SHORT CUT - Remove for shipping 
    const ret2 = globalShortcut.register('Ctrl+x', () => {
        win.webContents.toggleDevTools()
        win.setResizable(true);
        if (!ret2) {
            console.log('registration for dev tools failed')
          }  
    });
    
    const tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Show/Hide Search Bar",
            click: () => {
                toggleWindow()
            }
        },
        {
            label: "Quit", click: ()=> {
                app.quit()
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('click', () => console.log("clicked"))
    const mb = menubar({
        tray,
    });
    

});

store.on('newDataAvailable', (newData) => {
    //New Data is available
    if(win)
        win.webContents.send('updateData', newData)
})

app.on('browser-window-focus', () => {
    win.webContents.send("initialize", null);
    verify.getAppName()
    .then(async appName => { 
        win.webContents.send("appShortcuts", appName)
    })
    .catch(error => win.webContents.send("error", error))
});

//Required to hide the search bar when a click outside the bar is made
app.on('browser-window-blur', () => {
    win.hide()
});

app.on("will-quit", () => {
    globalShortcut.unregisterAll();
});