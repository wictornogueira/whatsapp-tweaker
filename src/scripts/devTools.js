const remote = require('electron').remote;
const win = remote.getCurrentWindow();

document.addEventListener ('keydown', (e) => {
  if (e.keyCode === 123) {
    e.preventDefault();
    win.openDevTools();
  }
});
