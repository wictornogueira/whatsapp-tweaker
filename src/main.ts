import fs from 'fs'
import os from 'os'
import path from 'path'
import asar from 'asar'

if (process.platform !== 'win32' && !os.release().includes('WSL')) {
  throw new Error('Platform not supported.')
}

export interface InjectOptions {
  injectAsScript?: boolean
  injectAsStyleSheet?: boolean
}

export interface InjectedFile {
  filePath: string
  options: InjectOptions
}

export class WhatsAppTweaker {
  static defaultDir: string = path.join(process.platform === 'win32' ? '~' : `/mnt/c/Users/${os.userInfo().username}`, 'AppData/Local/WhatsApp')

  baseDir?: string
  version?: string

  nodeIntegration: boolean = false
  devTools: boolean = false
  files: InjectedFile[] = []

  get resourcesDir (): string {
    return (this.baseDir && this.version) ? path.join(this.baseDir, this.version, 'resources') : ''
  }

  get hasBackup (): boolean {
    return this.resourcesDir ? fs.existsSync(path.join(this.resourcesDir, 'app.asar.backup')) : false
  }

  get versions (): string[] {
    return this.baseDir ? fs.readdirSync(this.baseDir).filter(dir => dir.startsWith('app-')) : []
  }

  enableDevTools (): void {
    this.devTools = true
  }

  enableNodeIntegration (): void {
    this.nodeIntegration = true
  }

  injectCSS (filePath: string): void {
    this.injectFile(filePath, { injectAsStyleSheet: true })
  }

  injectJS (filePath: string): void {
    this.injectFile(filePath, { injectAsScript: true })
  }

  injectFile (filePath: string, options: InjectOptions = { injectAsScript: false, injectAsStyleSheet: false }): void {
    filePath = path.resolve(filePath)

    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filePath} not found.`)
    }

    this.files.push({ filePath, options })
  }

  setBaseDir (dir: string): void {
    if (!fs.existsSync(dir) || !fs.existsSync(path.join(dir, 'WhatsApp.exe'))) {
      throw new Error(`Directory ${dir} is not a valid WhatsApp directory.`)
    }

    this.baseDir = dir
  }

  useDefaultBaseDir (): void {
    this.setBaseDir(WhatsAppTweaker.defaultDir)
  }

  setVersion (version: string): void {
    if (!version.startsWith('app-')) {
      version = 'app-' + version
    }

    if (!this.versions.includes(version)) {
      throw new Error(`Version ${version} not found.`)
    }

    this.version = version
  }

  selectVersion (version: string): void {
    return this.setVersion(version)
  }

  useVersion (version: string): void {
    return this.setVersion(version)
  }

  backup (): void {
    if (!this.resourcesDir) {
      throw new Error('Resources directory not set.')
    }

    fs.copyFileSync(path.join(this.resourcesDir, 'app.asar'), path.join(this.resourcesDir, 'app.asar.backup'))
  }

  restore (): void {
    fs.copyFileSync(path.join(this.resourcesDir, 'app.asar.backup'), path.join(this.resourcesDir, 'app.asar'))
  }

  __extract (): void {
    asar.extractAll(path.join(this.resourcesDir, 'app.asar'), path.join(this.resourcesDir, 'temp'))
  }

  __tweak (): void {
    if (!this.nodeIntegration) { return }

    const mainJS = fs.readFileSync(path.join(this.resourcesDir, 'temp', 'main.js'), { encoding: 'utf-8' })
      .replace(/nodeIntegration:?(true|false|!0|!1|1|0),spellcheck:!0/, `nodeIntegration:true,spellcheck:!0${this.devTools ? ',devTools:true' : ''}`)

    if (this.devTools) {
      this.injectJS(path.join(__dirname, 'scripts', 'devTools.js'))
    }

    fs.writeFileSync(path.join(this.resourcesDir, 'temp', 'main.js'), mainJS)
  }

  __inject (): void {
    if (!this.files.length) { return }

    fs.mkdirSync(path.join(this.resourcesDir, 'temp', 'injected', 'css'), { recursive: true })
    fs.mkdirSync(path.join(this.resourcesDir, 'temp', 'injected', 'js'), { recursive: true })
    fs.mkdirSync(path.join(this.resourcesDir, 'temp', 'injected', 'other'), { recursive: true })

    let indexHTML = fs.readFileSync(path.join(this.resourcesDir, 'temp', 'index.html'), { encoding: 'utf-8' })

    for (const { filePath, options } of this.files) {
      const basename = path.basename(filePath)

      switch (true) {
        case options.injectAsStyleSheet:
          fs.copyFileSync(filePath, path.join(this.resourcesDir, 'temp', 'injected', 'css', basename))
          indexHTML = indexHTML.replace('</head>', `<link rel="stylesheet" href="injected/css/${basename}">\n</head>`)
          break
        case options.injectAsScript:
          fs.copyFileSync(filePath, path.join(this.resourcesDir, 'temp', 'injected', 'js', basename))
          indexHTML = indexHTML.replace('</head>', `<script src="injected/js/${basename}" defer></script>\n</head>`)
          break
        default:
          fs.copyFileSync(filePath, path.join(this.resourcesDir, 'temp', 'injected', 'other', basename))
          break
      }
    }

    fs.writeFileSync(path.join(this.resourcesDir, 'temp', 'index.html'), indexHTML)
  }

  __pack (): Promise<void> {
    return asar.createPackage(path.join(this.resourcesDir, 'temp'), path.join(this.resourcesDir, 'app.asar'))
  }

  __clear (): void {
    // @ts-ignore
    fs.rmdirSync(path.join(this.resourcesDir, 'temp'), { force: true, recursive: true }) 
  }

  async apply (): Promise<void> {
    this.__extract()
    this.__tweak()
    this.__inject()
    await this.__pack()
    this.__clear()
  }

  toString (): string {
    return JSON.stringify(this, null, 2)
  }
}
