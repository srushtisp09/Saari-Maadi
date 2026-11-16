import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const skippedDirectories = new Set(['coverage', 'node_modules', 'uploads'])

function collectJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      return skippedDirectories.has(entry.name) ? [] : collectJavaScriptFiles(entryPath)
    }
    return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : []
  })
}

for (const file of collectJavaScriptFiles(serverDirectory)) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' })
}
console.info('Server production syntax check passed.')
