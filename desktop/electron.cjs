const { app, BrowserWindow } = require("electron");
const path = require("path");

function criarJanela() {
  const janela = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    title: "Piso Tablado",
    autoHideMenuBar: true,
    backgroundColor: "#141513",
  });
  janela.loadFile(path.join(__dirname, "..", "dist-desktop", "index.html"));
}

app.whenReady().then(criarJanela);
app.on("window-all-closed", () => app.quit());
