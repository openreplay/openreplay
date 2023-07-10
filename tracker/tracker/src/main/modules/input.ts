import type App from '../app/index.js'
import { normSpaces, IN_BROWSER, getLabelAttribute, now } from '../utils.js'
import { hasTag } from '../app/guards.js'
import { InputChange, SetInputValue, SetInputChecked } from '../app/messages.gen.js'

const INPUT_TYPES = [
  'text',
  'password',
  'email',
  'search',
  'number',
  'range',
  'date',
  'tel',
  'time',
]

// TODO: take into consideration "contenteditable" attribute
type TextFieldElement = HTMLInputElement | HTMLTextAreaElement

function isTextFieldElement(node: Node): node is TextFieldElement {
  if (hasTag(node, 'textarea')) {
    return true
  }
  if (!hasTag(node, 'input')) {
    return false
  }

  return INPUT_TYPES.includes(node.type)
}

function isCheckbox(node: Node): node is HTMLInputElement & { type: 'checkbox' | 'radio' } {
  if (!hasTag(node, 'input')) {
    return false
  }
  const type = node.type
  return type === 'checkbox' || type === 'radio'
}

const labelElementFor: (element: TextFieldElement) => HTMLLabelElement | undefined =
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

export function getInputLabel(node: TextFieldElement): string {
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

export const InputMode = {
  Plain: 0,
  Obscured: 1,
  Hidden: 2,
} as const

export type InputModeT = (typeof InputMode)[keyof typeof InputMode]

export interface Options {
  obscureInputNumbers: boolean
  obscureInputEmails: boolean
  defaultInputMode: InputModeT
  obscureInputDates: boolean
}

export default function (app: App, opts: Partial<Options>): void {
  const options: Options = Object.assign(
    {
      obscureInputNumbers: true,
      obscureInputEmails: true,
      defaultInputMode: InputMode.Obscured,
      obscureInputDates: false,
    },
    opts,
  )

  function getInputValue(id: number, node: TextFieldElement | HTMLSelectElement) {
    let value = node.value
    let inputMode: InputModeT = options.defaultInputMode

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

    return { value, mask }
  }
  function sendInputValue(id: number, node: TextFieldElement | HTMLSelectElement): void {
    const { value, mask } = getInputValue(id, node)

    app.send(SetInputValue(id, value, mask))
  }

  const inputValues: Map<number, string> = new Map()
  const checkboxValues: Map<number, boolean> = new Map()

  app.attachStopCallback(() => {
    inputValues.clear()
    checkboxValues.clear()
  })

  function trackInputValue(id: number, node: TextFieldElement) {
    if (inputValues.get(id) === node.value) {
      return
    }
    inputValues.set(id, node.value)
    sendInputValue(id, node)
  }

  function trackCheckboxValue(id: number, value: boolean) {
    if (checkboxValues.get(id) === value) {
      return
    }
    checkboxValues.set(id, value)
    app.send(SetInputChecked(id, value))
  }

  // The only way (to our knowledge) to track all kinds of input changes, including those made by JS
  app.ticker.attach(() => {
    inputValues.forEach((value, id) => {
      const node = app.nodes.getNode(id) as HTMLInputElement
      if (!node) return inputValues.delete(id)
      trackInputValue(id, node)
    })
    checkboxValues.forEach((checked, id) => {
      const node = app.nodes.getNode(id) as HTMLInputElement
      if (!node) return checkboxValues.delete(id)
      trackCheckboxValue(id, node.checked)
    })
  }, 3)

  function sendInputChange(
    id: number,
    node: TextFieldElement,
    hesitationTime: number,
    inputTime: number,
  ) {
    const { value, mask } = getInputValue(id, node)
    const label = getInputLabel(node)

    app.send(InputChange(id, value, mask !== 0, label, hesitationTime, inputTime))
  }

  app.nodes.attachNodeCallback(
    app.safe((node: Node): void => {
      const id = app.nodes.getID(node)
      if (id === undefined) {
        return
      }

      // TODO: support multiple select (?): use selectedOptions;
      if (hasTag(node, 'select')) {
        sendInputValue(id, node)
        app.nodes.attachNodeListener(node, 'change', () => sendInputValue(id, node))
      }

      if (isTextFieldElement(node)) {
        trackInputValue(id, node)
        let nodeFocusTime = 0
        let nodeHesitationTime = 0
        let inputTime = 0

        const onFocus = () => {
          nodeFocusTime = now()
        }

        const onInput = () => {
          if (nodeHesitationTime === 0 && nodeFocusTime !== 0) {
            nodeHesitationTime = now() - nodeFocusTime
          }
        }

        const onChange = () => {
          if (nodeFocusTime !== 0) {
            inputTime = now() - nodeFocusTime
          }
          sendInputChange(id, node, nodeHesitationTime, inputTime)
          nodeHesitationTime = 0
          inputTime = 0
          nodeFocusTime = 0
        }
        app.nodes.attachNodeListener(node, 'focus', onFocus)
        app.nodes.attachNodeListener(node, 'input', onInput)
        app.nodes.attachNodeListener(node, 'change', onChange)
        return
      }

      if (isCheckbox(node)) {
        trackCheckboxValue(id, node.checked)
        app.nodes.attachNodeListener(node, 'change', () => trackCheckboxValue(id, node.checked))
        return
      }
    }),
  )
}
