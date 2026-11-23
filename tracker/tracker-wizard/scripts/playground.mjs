#!/usr/bin/env node
// Demo apps for trying the wizard by hand.
//   node scripts/playground.mjs up [react] [vue]   scaffold (default: both)
//   node scripts/playground.mjs reset [react] [vue] back to the scaffold, wizard changes dropped
//   node scripts/playground.mjs down               delete the playground folder
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(ROOT, 'playground')
// same 7-day supply-chain cooldown as the repo's bunfig, for npx and npm install
const before = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
const env = {
  ...process.env,
  npm_config_before: before,
  npm_config_audit: 'false',
  npm_config_fund: 'false',
}

function run(cmd, args, cwd, shown = [cmd, ...args]) {
  console.log(`\n$ ${shown.join(' ')}`)
  const r = spawnSync(cmd, args, {
    cwd,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (r.status !== 0) throw new Error(`${shown.join(' ')} failed`)
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
}

const git = (cwd, ...args) =>
  run(
    'git',
    [
      '-c',
      'user.name=playground',
      '-c',
      'user.email=playground@localhost',
      '-c',
      'commit.gpgsign=false',
      ...args,
    ],
    cwd,
    ['git', ...args],
  )

const APPS = {
  react: {
    label: 'React + Vite + Redux Toolkit',
    create(dir) {
      run(
        'npx',
        ['-y', 'create-vite@latest', 'react', '--template', 'react-ts', '--no-interactive'],
        DIR,
      )
      run('npm', ['install'], dir)
      run('npm', ['install', '@reduxjs/toolkit', 'react-redux'], dir)
      write(
        path.join(dir, 'src/store.ts'),
        `import { configureStore, createSlice } from '@reduxjs/toolkit'

const counter = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => {
      state.value += 1
    },
  },
})

export const { increment } = counter.actions

export const store = configureStore({
  reducer: { counter: counter.reducer },
})

export type RootState = ReturnType<typeof store.getState>
`,
      )
      write(
        path.join(dir, 'src/Playground.tsx'),
        `import { useDispatch, useSelector } from 'react-redux'
import { increment, type RootState } from './store'

export default function Playground() {
  const value = useSelector((state: RootState) => state.counter.value)
  const dispatch = useDispatch()
  return (
    <section style={{ display: 'grid', gap: 12, justifyItems: 'center', padding: 24 }}>
      <button onClick={() => dispatch(increment())}>Redux count is {value}</button>
      <input placeholder="Type here (input values are masked by default)" style={{ width: 320 }} />
      <p>jane.doe@example.com · card 4242 4242 4242 4242</p>
    </section>
  )
}
`,
      )
      write(
        path.join(dir, 'src/main.tsx'),
        `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import App from './App.tsx'
import Playground from './Playground.tsx'
import { store } from './store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <Playground />
      <App />
    </Provider>
  </StrictMode>,
)
`,
      )
    },
  },
  vue: {
    label: 'Vue + Vite + Pinia',
    create(dir) {
      run('npx', ['-y', 'create-vue@latest', 'vue', '--ts', '--pinia'], DIR)
      run('npm', ['install'], dir)
      write(
        path.join(dir, 'src/stores/counter.ts'),
        `import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)
  function increment() {
    count.value++
  }
  return { count, doubleCount, increment }
})
`,
      )
      write(
        path.join(dir, 'src/App.vue'),
        `<script setup lang="ts">
import { useCounterStore } from './stores/counter'

const counter = useCounterStore()
</script>

<template>
  <main style="display: grid; gap: 12px; justify-items: center; padding: 24px">
    <h1>Vue playground</h1>
    <button @click="counter.increment()">Pinia count is {{ counter.count }} (x2 = {{ counter.doubleCount }})</button>
    <input placeholder="Type here (input values are masked by default)" style="width: 320px" />
    <p>jane.doe@example.com · card 4242 4242 4242 4242</p>
  </main>
</template>
`,
      )
    },
  },
}

function pick(names) {
  const unknown = names.filter((n) => !APPS[n])
  if (unknown.length)
    throw new Error(`Unknown app: ${unknown.join(', ')}. Use: ${Object.keys(APPS).join(', ')}`)
  return names.length ? names : Object.keys(APPS)
}

function up(names) {
  fs.mkdirSync(DIR, { recursive: true })
  for (const name of pick(names)) {
    const dir = path.join(DIR, name)
    if (fs.existsSync(dir)) {
      console.log(`\n${name}: already there (reset or down first)`)
      continue
    }
    console.log(`\n== ${name}: ${APPS[name].label}`)
    try {
      APPS[name].create(dir)
    } catch (e) {
      fs.rmSync(dir, { recursive: true, force: true })
      throw e
    }
    // own repo, so `git diff` shows exactly what the wizard changed
    git(dir, 'init', '-q')
    git(dir, 'add', '-A')
    git(dir, 'commit', '-qm', 'playground scaffold')
  }
  const rel = path.relative(process.cwd(), DIR) || '.'
  console.log(`
Ready. In each app (${rel}/<app>):

  bun ../../src/index.ts       run the wizard from source (no build needed)
  node ../../dist/index.js     or the built CLI (bun run build first)
  npm run dev                  start the app, open it, check the session
  git diff                     what the wizard changed

bun run playground:reset       back to the scaffold
bun run playground:down        delete the apps`)
}

function reset(names) {
  for (const name of pick(names)) {
    const dir = path.join(DIR, name)
    if (!fs.existsSync(path.join(dir, '.git'))) continue
    console.log(`\n== ${name}`)
    run('git', ['reset', '-q', '--hard'], dir)
    run('git', ['clean', '-fdq'], dir) // keeps node_modules (ignored)
    run('npm', ['prune'], dir) // drops packages the wizard installed
  }
}

function down() {
  if (path.basename(DIR) !== 'playground' || !DIR.startsWith(ROOT))
    throw new Error(`refusing to delete ${DIR}`)
  fs.rmSync(DIR, { recursive: true, force: true })
  console.log(`Removed ${DIR}`)
}

const [command = 'up', ...names] = process.argv.slice(2)
try {
  if (command === 'up') up(names)
  else if (command === 'reset') reset(names)
  else if (command === 'down') down()
  else throw new Error(`Unknown command "${command}". Use up, reset or down.`)
} catch (e) {
  console.error(`\n${e.message}`)
  process.exit(1)
}
