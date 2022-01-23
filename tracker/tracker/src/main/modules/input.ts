import { normSpaces, IN_BROWSER, getLabelAttribute, hasOpenreplayAttribute } from "../utils.js";
import App from "../app/index.js";
import { SetInputTarget, SetInputValue, SetInputChecked } from "../../messages/index.js";

// TODO: take into consideration "contenteditable" attribute
type TextEditableElement = HTMLInputElement | HTMLTextAreaElement
function isTextEditable(node: any): node is TextEditableElement {
  if (node instanceof HTMLTextAreaElement) { 
    return true;
  }
  if (!(node instanceof HTMLInputElement)) {
    return false;
  }
  const type = node.type;
  return (
    type === 'text' ||
    type === 'password' ||
    type === 'email' ||
    type === 'search' ||
    type === 'number' ||
    type === 'range'
  );
}

function isCheckable(node: any): node is HTMLInputElement {
  if (!(node instanceof HTMLInputElement)) {
    return false;
  }
  const type = node.type;
  return type === 'checkbox' || type === 'radio';
}

const labelElementFor: (
  node: TextEditableElement,
) => HTMLLabelElement | undefined =
  IN_BROWSER && 'labels' in HTMLInputElement.prototype
    ? (node): HTMLLabelElement | undefined => {
        let p: Node | null = node;
        while ((p = p.parentNode) !== null) {
          if (p.nodeName === 'LABEL') {
            return p as HTMLLabelElement;
          }
        }
        const labels = node.labels;
        if (labels !== null && labels.length === 1) {
          return labels[0];
        }
      }
    : (node): HTMLLabelElement | undefined => {
        let p: Node | null = node;
        while ((p = p.parentNode) !== null) {
          if (p.nodeName === 'LABEL') {
            return p as HTMLLabelElement;
          }
        }
        const id = node.id;
        if (id) {
          const labels = document.querySelectorAll('label[for="' + id + '"]');
          if (labels !== null && labels.length === 1) {
            return labels[0] as HTMLLabelElement;
          }
        }
      };

export function getInputLabel(node: TextEditableElement): string {
  let label = getLabelAttribute(node);
  if (label === null) {
    const labelElement = labelElementFor(node);
    label =
      labelElement === undefined
        ? node.placeholder || node.name
        : labelElement.innerText;
  }
  return normSpaces(label).slice(0, 100);
}

export declare const enum InputMode {
  Plain = 0,
  Obscured = 1,
  Hidden = 2,
}

export interface Options {
  obscureInputNumbers: boolean;
  obscureInputEmails: boolean;
  defaultInputMode: InputMode;
}

export default function (app: App, opts: Partial<Options>): void {
  const options: Options = Object.assign(
    {
      obscureInputNumbers: true,
      obscureInputEmails: true,
      defaultInputMode: InputMode.Plain,
    },
    opts,
  );
  function sendInputTarget(id: number, node: TextEditableElement): void {
    const label = getInputLabel(node);
    if (label !== '') {
      app.send(new SetInputTarget(id, label));
    }
  }
  function sendInputValue(id: number, node: TextEditableElement): void {
    let value = node.value;
    let inputMode: InputMode = options.defaultInputMode;
    if (node.type === 'password' || hasOpenreplayAttribute(node, 'hidden')) {
      inputMode = InputMode.Hidden;
    } else if (
      hasOpenreplayAttribute(node, 'obscured') ||
      (inputMode === InputMode.Plain &&
        ((options.obscureInputNumbers && /\d\d\d\d/.test(value)) ||
          (options.obscureInputEmails &&
            (node.type === 'email' || !!~value.indexOf('@')))))
    ) {
      inputMode = InputMode.Obscured;
    }
    let mask = 0;
    switch (inputMode) {
      case InputMode.Hidden:
        mask = -1;
        value = '';
        break;
      case InputMode.Obscured:
        mask = value.length;
        value = '';
        break;
    }
    app.send(new SetInputValue(id, value, mask));
  }

  const inputValues: Map<number, string> = new Map();
  const checkableValues: Map<number, boolean> = new Map();
  const registeredTargets: Set<number> = new Set();

  app.attachStopCallback(() => {
    inputValues.clear();
    checkableValues.clear();
    registeredTargets.clear();
  });

  app.ticker.attach((): void => {
    inputValues.forEach((value, id) => {
      const node = app.nodes.getNode(id);
      if (!isTextEditable(node)) {
        inputValues.delete(id);
        return;
      }
      if (value !== node.value) {
        inputValues.set(id, node.value);
        if (!registeredTargets.has(id)) {
          registeredTargets.add(id);
          sendInputTarget(id, node);
        }
        sendInputValue(id, node);
      }
    });
    checkableValues.forEach((checked, id) => {
      const node = app.nodes.getNode(id);
      if (!isCheckable(node)) {
        checkableValues.delete(id);
        return;
      }
      if (checked !== node.checked) {
        checkableValues.set(id, node.checked);
        app.send(new SetInputChecked(id, node.checked));
      }
    });
  });
  app.ticker.attach(Set.prototype.clear, 100, false, registeredTargets);

  app.nodes.attachNodeCallback(
    app.safe((node: Node): void => {
      const id = app.nodes.getID(node);
      if (id === undefined) {
        return;
      }
      if (isTextEditable(node)) {
        inputValues.set(id, node.value);
        sendInputValue(id, node);
        return;
      }
      if (isCheckable(node)) {
        checkableValues.set(id, node.checked);
        app.send(new SetInputChecked(id, node.checked));
        return;
      }
    }),
  );
}
