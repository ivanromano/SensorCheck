import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const mobileDir = path.join(rootDir, 'mobile')
const mobileWwwDir = path.join(mobileDir, 'www')

function run(command, args, cwd = rootDir) {
  const result =
    process.platform === 'win32'
      ? spawnSync(resolveWindowsShell(), ['/d', '/s', '/c', buildWindowsCommand(command, args)], {
          cwd,
          stdio: 'inherit'
        })
      : spawnSync(command, args, {
          cwd,
          stdio: 'inherit'
        })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function resolveWindowsShell() {
  return process.env.comspec || 'cmd.exe'
}

function escapeWindowsArg(value) {
  const text = String(value)

  if (!/[\s"]/u.test(text)) {
    return text
  }

  return `"${text.replace(/"/g, '\\"')}"`
}

function buildWindowsCommand(command, args) {
  return [command, ...args.map(escapeWindowsArg)].join(' ')
}

function resolveGeneratedDir() {
  const candidates = [path.join(rootDir, '.output', 'public'), path.join(rootDir, 'dist')]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      console.log(`Usando salida generada: ${path.relative(rootDir, candidate)}`)
      return candidate
    }
  }

  console.error(`No se encontro la salida generada. Se buscaron estas carpetas: ${candidates.join(', ')}`)
  process.exit(1)
}

function syncGeneratedFiles() {
  const generatedDir = resolveGeneratedDir()
  rmSync(mobileWwwDir, { recursive: true, force: true })
  mkdirSync(mobileWwwDir, { recursive: true })
  cpSync(generatedDir, mobileWwwDir, { recursive: true, force: true })
  patchCordovaHtmlFiles()
}

function patchCordovaHtmlFiles() {
  const htmlFiles = ['index.html', '200.html', '404.html']
  const cordovaScriptTag = '<script src="./cordova.js"></script>'
  const runtimeScriptTag = '<script defer src="./sensorcheck-runtime.js"></script>'

  for (const fileName of htmlFiles) {
    const filePath = path.join(mobileWwwDir, fileName)

    if (!existsSync(filePath)) {
      continue
    }

    const content = readFileSync(filePath, 'utf8')
    const relativePatched = content.replace(/\b(href|src|data-src)="\/(?!\/)/gu, '$1="./')
    const patched = relativePatched.includes(cordovaScriptTag)
      ? relativePatched
      : relativePatched.replace(runtimeScriptTag, `${cordovaScriptTag}${runtimeScriptTag}`)

    writeFileSync(filePath, patched)
  }
}

function resolveCordovaCommand() {
  const localCordova = path.join(
    mobileDir,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'cordova.cmd' : 'cordova'
  )

  if (existsSync(localCordova)) {
    return localCordova
  }

  return process.platform === 'win32' ? 'cordova.cmd' : 'cordova'
}

run('pnpm', ['exec', 'nuxi', 'generate'])
syncGeneratedFiles()
run(resolveCordovaCommand(), ['build', 'android'], mobileDir)
