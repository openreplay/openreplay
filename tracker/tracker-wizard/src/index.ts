import path from 'node:path'
import { styleText } from 'node:util'

import * as p from '@clack/prompts'

import pkg from '../package.json' with { type: 'json' }
import { formatCommand, gitDirty, install, installCommand, runScript, writeFiles } from './apply.js'
import {
  HELP,
  normalizeApiUrl,
  normalizeHost,
  parseFlags,
  validateKey,
  type Flags,
} from './args.js'
import { dashboardUrl, DOCS, NEXT_OBSERVER_MAJOR, STATE_LABELS } from './codegen.js'
import { detect, frameworkName, workspaceApps } from './detect.js'
import { diffLines, hunks } from './diff.js'
import { exists } from './fsutil.js'
import {
  buildPlan,
  installedTracker,
  stateChoices,
  targetTracker,
  type TrackerTarget,
} from './plan.js'
import { latestVersion } from './registry.js'
import {
  DEFAULT_FEATURES,
  type Answers,
  type Feature,
  type Method,
  type Plan,
  type Privacy,
  type Project,
  type StateLib,
} from './types.js'

const useColor = process.stdout.isTTY && !process.env.NO_COLOR
type Color = Parameters<typeof styleText>[0]
const c = (color: Color, text: string) => (useColor ? styleText(color, text) : text)

class Cancelled extends Error {}

function ask<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) throw new Cancelled()
  return value as Exclude<T, symbol>
}

function fail(message: string): never {
  p.cancel(message)
  process.exit(1)
}

async function pickRoot(flags: Flags): Promise<string> {
  const root = path.resolve(flags.cwd)
  if (flags.framework || detect(root).framework !== 'js') return root
  const apps = workspaceApps(root)
  if (!apps.length) return root
  if (flags.yes)
    fail(`This is a monorepo root. Run again with --cwd set to the app: ${apps.join(', ')}`)
  const app = ask(
    await p.select({
      message: 'Which app should OpenReplay record?',
      options: apps.map((a) => ({ value: a, label: a, hint: detect(path.join(root, a)).label })),
    }),
  )
  return path.join(root, app)
}

async function askAnswers(
  project: Project,
  flags: Flags,
  trackerMajor: Promise<number | undefined>,
): Promise<Answers> {
  const interactive = !flags.yes

  let host: string | undefined
  if (flags.host) {
    host = normalizeHost(flags.host)
  } else if (!flags.cloud && interactive) {
    const where = ask(
      await p.select({
        message: 'Where is your OpenReplay?',
        options: [
          { value: 'cloud', label: 'OpenReplay Cloud', hint: 'app.openreplay.com' },
          { value: 'self', label: 'Self-hosted' },
        ],
      }),
    )
    if (where === 'self') {
      const url = ask(
        await p.text({
          message: 'OpenReplay URL',
          placeholder: 'https://openreplay.example.com',
          validate: (v) => {
            try {
              normalizeHost(v ?? '')
            } catch {
              return 'Enter the address you open the dashboard at'
            }
          },
        }),
      )
      host = normalizeHost(url)
    }
  }

  let projectKey = flags.key
  if (projectKey && validateKey(projectKey)) fail(validateKey(projectKey)!)
  if (!projectKey) {
    if (!interactive) fail('--key is required with --yes')
    projectKey = ask(
      await p.text({
        message: 'Project key',
        placeholder: `from ${dashboardUrl({ host }).replace(/^https?:\/\//, '')} > Preferences > Projects`,
        validate: validateKey,
      }),
    ).trim()
  }

  let method: Method = project.framework === 'html' || flags.script ? 'script' : 'npm'
  if (
    method === 'npm' &&
    interactive &&
    (project.framework === 'js' || project.framework === 'vite')
  ) {
    method = ask(
      await p.select({
        message: 'How should the tracker be added?',
        options: [
          { value: 'npm' as Method, label: 'npm package', hint: 'bundled with your code' },
          {
            value: 'script' as Method,
            label: 'Script tag',
            hint: 'loaded from the OpenReplay CDN',
          },
        ],
      }),
    )
  }

  let htmlFiles: string[] = []
  if (method === 'script') {
    if (flags.html) {
      const missing = flags.html.filter((f) => !exists(project.root, f))
      if (missing.length) fail(`Not found: ${missing.join(', ')}`)
      htmlFiles = flags.html
    } else if (!interactive || project.htmlFiles.length === 0) {
      htmlFiles = project.htmlFiles
    } else {
      htmlFiles = ask(
        await p.multiselect({
          message: 'Add the script to which pages?',
          options: project.htmlFiles.map((f) => ({ value: f, label: f })),
          initialValues: project.htmlFiles,
          required: false,
        }),
      )
    }
  }

  let entry = flags.entry
  if (entry && !exists(project.root, entry)) fail(`Not found: ${entry}`)
  const needsEntry = ['angular', 'react', 'vue', 'vite', 'js'].includes(project.framework)
  if (method === 'npm' && needsEntry && !entry && !project.entry && interactive) {
    const answer = ask(
      await p.text({
        message:
          'Which file starts your app in the browser? (leave empty to add the import yourself)',
        placeholder: 'src/main.ts',
        validate: (v) => (v && !exists(project.root, v) ? 'File not found' : undefined),
      }),
    )
    entry = answer?.trim() || undefined
  }

  const privacy: Privacy =
    flags.privacy ??
    (interactive
      ? ask(
          await p.select({
            message: 'Privacy',
            options: [
              {
                value: 'default' as Privacy,
                label: 'Mask input values and emails',
                hint: 'recommended',
              },
              {
                value: 'strict' as Privacy,
                label: 'Mask everything',
                hint: 'text, inputs, URLs, network; unmask safe areas later',
              },
              {
                value: 'relaxed' as Privacy,
                label: 'Record input values',
                hint: 'passwords, emails and long numbers stay masked',
              },
            ],
          }),
        )
      : 'default')

  // the CDN serves the latest build; with npm, hidden when the project stays below 20
  const major = method === 'script' ? undefined : await trackerMajor
  const offerNextObserver = major === undefined || major >= NEXT_OBSERVER_MAJOR
  const defaults: Feature[] = [
    ...DEFAULT_FEATURES.filter((f) => f !== 'next-observer' || offerNextObserver),
    ...(project.testIds.length ? ['test-ids' as Feature] : []),
  ]
  type FeatureOption = { value: Feature; label: string; hint?: string }
  const featureOptions: (FeatureOption | false)[] = [
    {
      value: 'localhost',
      label: 'Record on localhost while developing',
      hint: 'see your first session right away',
    },
    offerNextObserver && {
      value: 'next-observer',
      label: 'New DOM observer',
      hint: 'tracker 20+: one MutationObserver for page, iframes and shadow roots',
    },
    project.testIds.length > 0 && {
      value: 'test-ids',
      label: `Use ${project.testIds[0]} in click labels`,
      hint: `found ${project.testIds.join(', ')} in your code`,
    },
    { value: 'network', label: 'Capture network request and response bodies' },
    {
      value: 'backend-header',
      label: 'Link backend logs to replays',
      hint: 'adds X-OpenReplay-SessionToken to your API requests',
    },
    { value: 'numbers', label: 'Mask numbers in page text', hint: 'card numbers, phones, IDs' },
    {
      value: 'dnt',
      label: 'Respect Do Not Track',
      hint: 'skip visitors whose browser asks not to be tracked',
    },
    {
      value: 'inline-css',
      label: 'Record stylesheets in the browser',
      hint: 'if replays lose styles: CSS behind VPN or login, or blocked by CORS',
    },
    project.iframes && {
      value: 'iframes',
      label: 'Record cross-origin iframes',
      hint: 'iframes found; same-origin ones are recorded already',
    },
    method === 'npm' && {
      value: 'analytics',
      label: 'Product analytics events',
      hint: 'tracker.track()',
    },
  ]
  const features: Feature[] =
    flags.features ??
    (interactive
      ? ask(
          await p.multiselect({
            message: 'Options',
            options: featureOptions.filter((o): o is FeatureOption => !!o),
            initialValues: defaults,
            required: false,
          }),
        )
      : defaults)
  const testIdAttributes = features.includes('test-ids')
    ? project.testIds.length
      ? project.testIds
      : ['data-testid']
    : []

  let apiUrl = flags.apiUrl
  if (features.includes('backend-header') && apiUrl === undefined && interactive) {
    const answer = ask(
      await p.text({
        message: 'Which API should get the session token header? (empty = this site only)',
        placeholder: 'https://api.example.com',
        validate: (v) => (v?.trim() && !normalizeApiUrl(v) ? 'Enter an http(s) URL' : undefined),
      }),
    )
    apiUrl = answer?.trim() ? normalizeApiUrl(answer) : undefined
  }

  const stateOptions = method === 'npm' ? stateChoices(project) : []
  let assist = flags.assist ?? false
  let state: StateLib[] = []
  if (flags.state === 'all') state = stateOptions
  else if (flags.state) {
    const unsupported = flags.state.filter((s) => !stateOptions.includes(s))
    if (unsupported.length && method === 'npm' && project.framework === 'nuxt')
      fail(`In Nuxt only Pinia (through @pinia/nuxt) is supported, not ${unsupported.join(', ')}`)
    state = flags.state
  }

  if (interactive && flags.assist === undefined && flags.state === undefined) {
    type Plugin = 'assist' | StateLib
    const options: { value: Plugin; label: string; hint?: string; disabled?: boolean }[] = [
      { value: 'assist', label: 'Assist', hint: 'watch live sessions, take control, call users' },
      ...stateOptions.map((s) => ({
        value: s as Plugin,
        label: `${STATE_LABELS[s]} state`,
        hint: `see ${STATE_LABELS[s]} actions and state in replays`,
      })),
    ]
    if (method === 'npm' && !stateOptions.length && project.framework !== 'html') {
      options.push({
        value: 'redux',
        label: 'State',
        hint: 'no Redux, Zustand, MobX, Pinia, Vuex or NgRx store found',
        disabled: true,
      })
    }
    const picked = ask(await p.multiselect({ message: 'Plugins', options, required: false }))
    assist = picked.includes('assist')
    state = picked.filter((x): x is StateLib => x !== 'assist')
  }

  return {
    projectKey,
    host,
    method,
    privacy,
    features,
    assist,
    state,
    htmlFiles,
    entry,
    testIdAttributes,
    apiUrl,
  }
}

function describePlan(plan: Plan, project: Project, flags: Flags): string {
  const lines: string[] = []
  for (const f of plan.files) {
    lines.push(f.before === null ? `${c('green', '+')} ${f.path}` : `${c('yellow', '~')} ${f.path}`)
  }
  if (plan.packages.length) {
    const cmd = formatCommand(installCommand(project.pm, plan.packages))
    lines.push(`${c('cyan', '$')} ${cmd}${flags.skipInstall ? c('dim', ' (skipped)') : ''}`)
  }
  return lines.join('\n')
}

function printDiffs(plan: Plan, full: boolean) {
  for (const f of plan.files) {
    const body: string[] = []
    if (f.before === null) {
      const lines = f.after.trimEnd().split('\n')
      const shown = full ? lines : lines.slice(0, 40)
      body.push(...shown.map((l) => c('green', `+ ${l}`)))
      if (shown.length < lines.length)
        body.push(c('dim', `  … ${lines.length - shown.length} more lines`))
    } else {
      for (const l of hunks(diffLines(f.before, f.after))) {
        if (!l) body.push(c('dim', '  …'))
        else if (l.kind === '+') body.push(c('green', `+ ${l.text}`))
        else if (l.kind === '-') body.push(c('red', `- ${l.text}`))
        else body.push(c('dim', `  ${l.text}`))
      }
    }
    p.note(body.join('\n'), f.path)
  }
}

function nextSteps(plan: Plan, project: Project, answers: Answers, installed: boolean): void {
  const steps: string[] = []
  if (plan.packages.length && !installed) {
    steps.push(`Install the packages: ${formatCommand(installCommand(project.pm, plan.packages))}`)
  }
  const script = project.scripts.dev ? 'dev' : project.scripts.start ? 'start' : undefined
  const run = script ? `Run ${c('cyan', runScript(project.pm, script))} and open` : 'Open'
  steps.push(`${run} your app in the browser, then click around for a bit.`)
  steps.push(
    `Watch the session in ${c('cyan', dashboardUrl(answers))} > Sessions (it shows up within a minute).`,
  )
  if (answers.method === 'npm') {
    steps.push(
      `Identify users after login:\n   import { tracker } from '@openreplay/tracker'\n   tracker.setUserID(user.email)`,
    )
  } else {
    steps.push('Identify users after login: window.OpenReplay.setUserID(user.email)')
  }
  if (!answers.features.includes('localhost')) {
    steps.push(
      'Recording needs HTTPS: test on a deployed (https) build, or rerun with "Record on localhost".',
    )
  }
  p.note(steps.map((s, i) => `${i + 1}. ${s}`).join('\n'), 'Next steps')

  plan.manual.forEach((m) => {
    const head = m.file ? `${c('dim', `in ${m.file}`)}\n\n` : ''
    p.note(`${head}${m.code ?? ''}`.trimEnd(), `To do: ${m.title}`)
  })
  for (const n of plan.notes) p.log.info(n)
}

async function run(): Promise<void> {
  let flags: Flags
  try {
    flags = parseFlags(process.argv.slice(2))
  } catch (e) {
    console.error(`${(e as Error).message}\n\n${HELP}`)
    process.exit(1)
  }
  if (flags.help) {
    console.log(HELP)
    return
  }
  if (flags.version) {
    console.log(pkg.version)
    return
  }
  if (!flags.yes && !process.stdin.isTTY) {
    console.error('No interactive terminal. Run with --yes --key=<project key> (see --help).')
    process.exit(1)
  }

  p.intro(c('inverse', ' OpenReplay setup '))
  const root = await pickRoot(flags)
  const project = detect(root, flags.framework)

  if (project.framework === 'html') {
    p.log.info(
      project.hasPackageJson
        ? 'Using the script tag (static HTML).'
        : 'No package.json here: setting up the script tag for a static site.',
    )
  } else {
    const extra = [project.ts ? 'TypeScript' : 'JavaScript', project.pm].join(' · ')
    p.log.info(
      `Found ${c('bold', project.label)} · ${extra}\n${c('dim', 'Not right? Rerun with --framework=<name>')}`,
    )
  }
  if (project.framework === 'js' && !project.entry) {
    p.log.warn(
      `No React, Vue, Angular, Next.js or Nuxt found in package.json. Using the generic ${frameworkName('js')} setup.`,
    )
  }

  if (project.existing.length) {
    const where =
      project.existing.slice(0, 3).join(', ') + (project.existing.length > 3 ? ', …' : '')
    if (flags.yes && !flags.force)
      fail(`OpenReplay is already set up (${where}). Pass --force to run anyway.`)
    if (!flags.yes) {
      const go = ask(
        await p.confirm({
          message: `OpenReplay already appears in ${where}. Continue anyway?`,
          initialValue: false,
        }),
      )
      if (!go) throw new Cancelled()
    }
  }

  if (!flags.yes && !flags.dryRun) {
    const dirty = await gitDirty(root)
    if (dirty?.length) {
      const go = ask(
        await p.confirm({
          message: `You have ${dirty.length} uncommitted change${dirty.length > 1 ? 's' : ''}. Continue? (committing first makes the wizard's edits easy to review)`,
          initialValue: true,
        }),
      )
      if (!go) throw new Cancelled()
    }
  }

  const latest =
    project.framework === 'html' || flags.script
      ? Promise.resolve(undefined)
      : latestVersion('@openreplay/tracker')
  const target = latest.then((v) => targetTracker(project, v))
  const answers = await askAnswers(
    project,
    flags,
    target.then((t) => t.major),
  )
  const expected = await target
  let plan = buildPlan(project, answers, expected)

  if (!plan.files.length && !plan.packages.length) {
    p.log.success('Nothing to change.')
    nextSteps(plan, project, answers, true)
    p.outro(`Docs: ${DOCS}`)
    return
  }

  p.note(describePlan(plan, project, flags), 'Changes')
  if (flags.dryRun) {
    printDiffs(plan, true)
    nextSteps(plan, project, answers, false)
    p.outro('Dry run: nothing was written.')
    return
  }
  if (!flags.yes) {
    const view = ask(
      await p.select({
        message: 'Apply these changes?',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'diff', label: 'Show the code first' },
          { value: 'no', label: 'No, exit' },
        ],
      }),
    )
    if (view === 'no') throw new Cancelled()
    if (view === 'diff') {
      printDiffs(plan, false)
      const go = ask(await p.confirm({ message: 'Apply?', initialValue: true }))
      if (!go) throw new Cancelled()
    }
  }

  let installed = false
  if (plan.packages.length && !flags.skipInstall) {
    const cmd = formatCommand(installCommand(project.pm, plan.packages))
    // spinner frames would flood a log when output isn't a terminal (CI, agents)
    const spin = process.stdout.isTTY ? p.spinner() : null
    if (spin) spin.start(`Running ${cmd}`)
    else p.log.step(`Running ${cmd}`)
    const result = await install(project.root, project.pm, plan.packages)
    const done = `Installed ${plan.packages.map((n) => n.replace(/@latest$/, '')).join(', ')}`
    if (result.ok) {
      installed = true
      if (spin) spin.stop(done)
      else p.log.success(done)
    } else {
      if (spin) spin.error(`${cmd} failed`)
      else p.log.error(`${cmd} failed`)
      p.log.message(result.output.trim().split('\n').slice(-15).join('\n'))
    }
  }

  // the package manager may resolve another version than the registry's latest (cooldowns, mirrors)
  const actual = installed ? installedTracker(project.root) : undefined
  const observer = (t?: TrackerTarget) => (t?.major ?? 0) >= NEXT_OBSERVER_MAJOR
  const changed =
    actual &&
    (observer(actual) !== observer(expected) ||
      actual.docs !== expected.docs ||
      actual.partialNetwork !== expected.partialNetwork)
  if (actual && changed) {
    plan = buildPlan(project, answers, actual)
    if (answers.features.includes('next-observer') && observer(actual) !== observer(expected))
      p.log.info(
        `Installed tracker ${actual.major}: nextObserver ${observer(actual) ? 'enabled' : 'left out (needs 20+)'}.`,
      )
  }

  writeFiles(project.root, plan)
  p.log.success(
    plan.files.map((f) => `${f.before === null ? 'Created' : 'Updated'} ${f.path}`).join('\n') ||
      'No file changes',
  )
  nextSteps(plan, project, answers, installed)
  p.outro(`Docs: ${DOCS}`)
}

run().catch((e) => {
  if (e instanceof Cancelled) {
    p.cancel('Setup cancelled. Nothing was changed.')
    process.exit(0)
  }
  p.log.error(e instanceof Error ? (e.stack ?? e.message) : String(e))
  process.exit(1)
})
