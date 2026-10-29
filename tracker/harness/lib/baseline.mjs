import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { CACHE, REPO, WORKSPACE, trackerPackage } from './paths.mjs'

const BASELINES = path.join(CACHE, 'baselines')
const git = (...args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim()

// a baseline checkout borrows this checkout's installed dependencies
const LINKS = [
  ['node_modules', path.join(WORKSPACE, 'node_modules')],
  ['tracker/node_modules', path.join(trackerPackage(WORKSPACE), 'node_modules')],
]

/**
 * A detached worktree of `ref`, cached per commit under .cache/baselines.
 * Returns the tracker workspace inside it.
 */
export function prepareBaseline(ref) {
  const sha = git('rev-parse', '--verify', `${ref}^{commit}`)
  const dir = path.join(BASELINES, sha.slice(0, 12))
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(BASELINES, { recursive: true })
    console.log(`checking out ${ref} (${sha.slice(0, 12)}) as a baseline ...`)
    git('worktree', 'add', '--quiet', '--detach', dir, sha)
  }
  const workspace = path.join(dir, path.relative(REPO, WORKSPACE))
  for (const [rel, target] of LINKS) {
    const link = path.join(workspace, rel)
    if (!fs.existsSync(link) && fs.existsSync(target)) fs.symlinkSync(target, link, 'dir')
  }
  return { label: ref, sha, workspace }
}

/** Removes the baseline worktrees; dependency links are unlinked first, never followed. */
export function cleanBaselines() {
  if (!fs.existsSync(BASELINES)) return 0
  let n = 0
  for (const name of fs.readdirSync(BASELINES)) {
    const dir = path.join(BASELINES, name)
    const workspace = path.join(dir, path.relative(REPO, WORKSPACE))
    for (const [rel] of LINKS) {
      const link = path.join(workspace, rel)
      if (fs.lstatSync(link, { throwIfNoEntry: false })?.isSymbolicLink()) fs.unlinkSync(link)
    }
    git('worktree', 'remove', '--force', dir)
    n++
  }
  git('worktree', 'prune')
  return n
}
