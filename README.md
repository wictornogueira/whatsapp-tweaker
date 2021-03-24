# Wappermelon

### A module that allows you to programmatically tweak your WhatsApp desktop client.

## Installation

```bash
npm i whatsapp-tweaker
```

Note: only works on Windows and WSL2.

## Usage

1. Find the latest available version

```js
  const { WhatsAppTweaker } = require('whatsapp-tweaker')
  
  const tweaker = new WhatsAppTweaker()

  tweaker.useDefaultBaseDir()
  console.log(tweaker.versions)
```

2. Set the latest version and patch your client

```js
  const path = require('path')
  const { WhatsAppTweaker } = require('whatsapp-tweaker')

  const tweaker = new WhatsAppTweaker()

  tweaker.useDefaultBaseDir()
  tweaker.setVersion('app-2.2108.8')

  tweaker.enableNodeIntegration()
  tweaker.enableDevTools()

  tweaker.injectCSS(path.join(__dirname, 'fabulous.css'))
  tweaker.injectJS(path.join(__dirname, 'hello_world.js'))

  if (tweaker.hasBackup) { tweaker.restore() }
  else { tweaker.backup() }

  tweaker.apply()
```

## Disclaimer

**USE AT YOUR OWN RISK.**
