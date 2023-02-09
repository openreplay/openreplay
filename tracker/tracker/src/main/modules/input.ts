import type App from '../app/index.js'
import { normSpaces, IN_BROWSER, getLabelAttribute, debounce } from '../utils.js'
import { hasTag } from '../app/guards.js'
import { InputChange, SetInputValue, SetInputChecked } from '../app/messages.gen.js'

const INPUT_TYPES = ['text', 'password', 'email', 'search', 'number', 'range', 'date', 'tel']

// TODO: take into consideration "contenteditable" attribute
type TextEditableElement = HTMLInputElement | HTMLTextAreaElement

function isTextEditable(node: any): node is TextEditableElement {
  if (hasTag(node, 'textarea')) {
    return true
  }
  if (!hasTag(node, 'input')) {
    return false
  }

  return INPUT_TYPES.includes(node.type)
}

function isCheckbox(node: any): node is HTMLInputElement {
  if (!hasTag(node, 'input')) {
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
          if (hasTag(p, 'label')) {
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
          if (hasTag(p, 'label')) {
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
  const inputHesitationMap: Map<number, { hesitation: number; focusEv: number }> = new Map()
  const options: Options = Object.assign(
    {
      obscureInputNumbers: true,
      obscureInputEmails: true,
      defaultInputMode: InputMode.Plain,
      obscureInputDates: false,
    },
    opts,
  )

  function sendInputChange(id: number, node: TextEditableElement): void {
    const label = getInputLabel(node)
    // @ts-ignore maybe if hesitationTime > 150 ?
    const { hesitation } = inputHesitationMap.get(id)
    if (label !== '') {
      app.send(InputChange(id, label, hesitation))
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
  const checkboxValues: Map<number, boolean> = new Map()

  app.attachStopCallback(() => {
    inputValues.clear()
    checkboxValues.clear()
  })

  const debouncedUpdate = debounce((id: number, node: TextEditableElement) => {
    sendInputChange(id, node)
    sendInputValue(id, node)
  }, 125)

  const debouncedTyping = debounce((id: number, node: TextEditableElement) => {
    sendInputValue(id, node)
  }, 60)

  app.nodes.attachNodeCallback(
    app.safe((node: Node): void => {
      const id = app.nodes.getID(node)
      if (id === undefined) {
        return
      }
      // TODO: support multiple select (?): use selectedOptions; Need send target?
      if (hasTag(node, 'select')) {
        sendInputValue(id, node)
        const handler = () => {
          sendInputValue(id, node)
        }
        app.nodes.attachNodeListener(node, 'change', handler)
      }

      if (isTextEditable(node)) {
        inputValues.set(id, node.value)
        inputHesitationMap.set(id, { hesitation: 0, focusEv: 0 })
        sendInputValue(id, node)
        const setFocus = () => {
          inputHesitationMap.set(id, { hesitation: 0, focusEv: +new Date() })
        }
        const inputEvent = (e: InputEvent) => {
          const value = (e.target as HTMLInputElement).value
          if (inputValues.get(id) === '' && value !== '') {
            const inputTime = +new Date()
            const { focusEv } = inputHesitationMap.get(id)!
            // @ts-ignore
            const hesitationTime = inputTime - focusEv
            inputHesitationMap.set(id, { hesitation: hesitationTime, focusEv })
          }
          inputValues.set(id, value)
          debouncedTyping(id, node)
        }
        const changeEvent = (e: InputEvent) => {
          const value = (e.target as HTMLInputElement).value
          if (inputValues.get(id) !== value) {
            inputValues.set(id, value)
            debouncedUpdate(id, node)
          }
          inputHesitationMap.set(id, { hesitation: 0, focusEv: 0 })
        }
        app.nodes.attachNodeListener(node, 'focus', setFocus)
        app.nodes.attachNodeListener(node, 'input', inputEvent)
        app.nodes.attachNodeListener(node, 'change', changeEvent)
        return
      }

      if (isCheckbox(node)) {
        checkboxValues.set(id, node.checked)
        app.send(SetInputChecked(id, node.checked))
        const checkboxChange = (e: InputEvent) => {
          const value = (e.target as HTMLInputElement).checked
          checkboxValues.set(id, value)
          app.send(SetInputChecked(id, value))
        }
        app.nodes.attachNodeListener(node, 'change', checkboxChange)

        return
      }
    }),
  )
}
