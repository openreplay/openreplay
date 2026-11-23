import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import type { PackageManager, Plan } from './types.js'

export function installCommand(pm: PackageManager, packages: string[]): [string, string[]] {
  return [pm, [pm === 'npm' ? 'install' : 'add', ...packages]]
}

export const formatCommand = ([cmd, args]: [string, string[]]) => [cmd, ...args].join(' ')

export function runScript(pm: PackageManager, script: string): string {
  return pm === 'npm' || pm === 'bun' ? `${pm} run ${script}` : `${pm} ${script}`
}

export function install(
  root: string,
  pm: PackageManager,
  packages: string[],
): Promise<{ ok: boolean; output: string }> {
  const [cmd, args] = installCommand(pm, packages)
  return new Promise((resolve) => {
    let output = ''
    const child = spawn(cmd, args, {
      cwd: root,
      shell: process.platform === 'win32',
      env: { ...process.env, FORCE_COLOR: '0' },
    })
    child.stdout.on('data', (d) => (output += d))
    child.stderr.on('data', (d) => (output += d))
    child.on('error', (e) => resolve({ ok: false, output: `${output}${e.message}` }))
    child.on('close', (code) => resolve({ ok: code === 0, output }))
  })
}

export function writeFiles(root: string, plan: Plan): void {
  for (const f of plan.files) {
    const target = path.join(root, f.path)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, f.after)
  }
}

/** Uncommitted changes in the project's git checkout (null outside git). */
export function gitDirty(root: string): Promise<string[] | null> {
  return new Promise((resolve) => {
    let out = ''
    const child = spawn('git', ['status', '--porcelain', '--', '.'], { cwd: root })
    child.stdout.on('data', (d) => (out += d))
    child.on('error', () => resolve(null))
    child.on('close', (code) => resolve(code === 0 ? out.split('\n').filter(Boolean) : null))
  })
}
