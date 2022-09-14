import type App from '../app/index.js'
import { normSpaces, IN_BROWSER, getLabelAttribute } from '../utils.js'
import { hasTag } from '../app/guards.js'
import { SetInputTarget, SetInputValue, SetInputChecked } from '../app/messages.gen.js'

const INPUT_TYPES = ['text', 'password', 'email', 'search', 'number', 'range', 'date']

// TODO: take into consideration "contenteditable" attribute
type TextEditableElement = HTMLInputElement | HTMLTextAreaElement
function isTextEditable(node: any): node is TextEditableElement {
  if (hasTag(node, 'TEXTAREA')) {
    return true
  }
  if (!hasTag(node, 'INPUT')) {
    return false
  }

  return INPUT_TYPES.includes(node.type)
}

function isCheckable(node: any): node is HTMLInputElement {
  if (!hasTag(node, 'INPUT')) {
    return false
  }
  const type = node.type
  return type === 'checkbox' || type === 'radio'
}

const labelElementFor: (element: TextEditableElement) => HTMLLabelElement | undefined =
  IN_BROWSER && 'labels' in HTMLInputElement.prototype
    ? (node) => {
        let p: Node | null = node
        while ((p = p.parentNode) !== null) {
          if (hasTag(p, 'LABEL')) {
            return p
          }
        }
        const labels = node.labels
        if (labels !== null && labels.length === 1) {
          return labels[0]
        }
      }
    : (node) => {
        let p: Node | null = node
        while ((p = p.parentNode) !== null) {
          if (hasTag(p, 'LABEL')) {
            return p
          }
        }
        const id = node.id
        if (id) {
          const labels = node.ownerDocument.querySelectorAll('label[for="' + id + '"]')
          if (labels !== null && labels.length === 1) {
            return labels[0] as HTMLLabelElement
          }
        }
      }

export function getInputLabel(node: TextEditableElement): string {
  let label = getLabelAttribute(node)
  if (label === null) {
    const labelElement = labelElementFor(node)
    label =
      (labelElement && labelElement.innerText) ||
      node.placeholder ||
      node.name ||
      node.id ||
      node.className ||
      node.type
  }
  return normSpaces(label).slice(0, 100)
}

export declare const enum InputMode {
  Plain = 0,
  Obscured = 1,
  Hidden = 2,
}

export interface Options {
  obscureInputNumbers: boolean
  obscureInputEmails: boolean
  defaultInputMode: InputMode
  obscureInputDates: boolean
}

export default function (app: App, opts: Partial<Options>): void {
  const options: Options = Object.assign(
    {
      obscureInputNumbers: true,
      obscureInputEmails: true,
      defaultInputMode: InputMode.Plain,
      obscureInputDates: false,
    },
    opts,
  )
  function sendInputTarget(id: number, node: TextEditableElement): void {
    const label = getInputLabel(node)
    if (label !== '') {
      app.send(SetInputTarget(id, label))
    }
  }
  function sendInputValue(id: number, node: TextEditableElement | HTMLSelectElement): void {
    let value = node.value
    let inputMode: InputMode = options.defaultInputMode

    if (node.type === 'password' || app.sanitizer.isHidden(id)) {
      inputMode = InputMode.Hidden
    } else if (
      app.sanitizer.isObscured(id) ||
      (inputMode === InputMode.Plain &&
        ((options.obscureInputNumbers && node.type !== 'date' && /\d\d\d\d/.test(value)) ||
          (options.obscureInputDates && node.type === 'date') ||
          (options.obscureInputEmails && (node.type === 'email' || !!~value.indexOf('@')))))
    ) {
      inputMode = InputMode.Obscured
    }
    let mask = 0
    switch (inputMode) {
      case InputMode.Hidden:
        mask = -1
        value = ''
        break
      case InputMode.Obscured:
        mask = value.length
        value = ''
        break
    }

    app.send(SetInputValue(id, value, mask))
  }

  const inputValues: Map<number, string> = new Map()
  const checkableValues: Map<number, boolean> = new Map()
  const registeredTargets: Set<number> = new Set()

  app.attachStopCallback(() => {
    inputValues.clear()
    checkableValues.clear()
    registeredTargets.clear()
  })

  app.ticker.attach((): void => {
    inputValues.forEach((value, id) => {
      const node = app.nodes.getNode(id)
      if (!node) return
      if (!isTextEditable(node)) {
        inputValues.delete(id)
        return
      }
      if (value !== node.value) {
        inputValues.set(id, node.value)
        if (!registeredTargets.has(id)) {
          registeredTargets.add(id)
          sendInputTarget(id, node)
        }
        sendInputValue(id, node)
      }
    })
    checkableValues.forEach((checked, id) => {
      const node = app.nodes.getNode(id)
      if (!node) return
      if (!isCheckable(node)) {
        checkableValues.delete(id)
        return
      }
      if (checked !== node.checked) {
        checkableValues.set(id, node.checked)
        app.send(SetInputChecked(id, node.checked))
      }
    })
  })
  app.ticker.attach(Set.prototype.clear, 100, false, registeredTargets)

  app.nodes.attachNodeCallback(
    app.safe((node: Node): void => {
      const id = app.nodes.getID(node)
      if (id === undefined) {
        return
      }
      // TODO: support multiple select (?): use selectedOptions; Need send target?
      if (hasTag(node, 'SELECT')) {
        sendInputValue(id, node)
        app.attachEventListener(node, 'change', () => {
          sendInputValue(id, node)
        })
      }
      if (isTextEditable(node)) {
        inputValues.set(id, node.value)
        sendInputValue(id, node)
        return
      }
      if (isCheckable(node)) {
        checkableValues.set(id, node.checked)
        app.send(SetInputChecked(id, node.checked))
        return
      }
    }),
  )
}
