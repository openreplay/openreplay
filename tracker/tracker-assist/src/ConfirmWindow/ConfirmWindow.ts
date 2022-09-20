/* eslint-disable @typescript-eslint/no-empty-function */
import type { Properties, } from 'csstype'

export type ButtonOptions =
  | HTMLButtonElement
  | string
  | {
      innerHTML: string;
      style?: Properties;
    };

// TODO: common strategy for InputOptions/defaultOptions merging
export interface ConfirmWindowOptions {
  text: string;
  style?: Properties;
  confirmBtn: ButtonOptions;
  declineBtn: ButtonOptions;
}


function makeButton(options: ButtonOptions, defaultStyle?: Properties): HTMLButtonElement {
  if (options instanceof HTMLButtonElement) {
    return options
  }
  const btn = document.createElement('button')
  Object.assign(btn.style, {
    padding: '10px 14px',
    fontSize: '14px',
    borderRadius: '3px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    textTransform: 'uppercase',
    marginRight: '10px',
  }, defaultStyle)
  if (typeof options === 'string') {
    btn.innerHTML = options
  } else {
    btn.innerHTML = options.innerHTML
    Object.assign(btn.style, options.style)
  }
  return btn
}

export default class ConfirmWindow {
  private readonly wrapper: HTMLDivElement;

  constructor(options: ConfirmWindowOptions) {
    const wrapper = document.createElement('div')
    const popup = document.createElement('div')
    const p = document.createElement('p')
    p.innerText = options.text
    const buttons = document.createElement('div')
    const confirmBtn = makeButton(options.confirmBtn, {
      background: 'rgba(0, 167, 47, 1)',
      color: 'white',
    })
    const declineBtn = makeButton(options.declineBtn, {
      background: '#FFE9E9',
      color: '#CC0000',
    })
    buttons.appendChild(confirmBtn)
    buttons.appendChild(declineBtn)
    popup.appendChild(p)
    popup.appendChild(buttons)


    Object.assign(buttons.style, {
      marginTop: '10px',
      display: 'flex',
      alignItems: 'center',
      // justifyContent: "space-evenly",
      backgroundColor: 'white',
      padding: '10px',
      boxShadow: '0px 0px 3.99778px 1.99889px rgba(0, 0, 0, 0.1)',
      borderRadius: '6px',
    })

    Object.assign(
      popup.style,
      {
        font: '14px \'Roboto\', sans-serif',
        position: 'relative',
        pointerEvents: 'auto',
        margin: '4em auto',
        width: '90%',
        maxWidth: 'fit-content',
        padding: '20px',
        background: '#F3F3F3',
        //opacity: ".75",
        color: 'black',
        borderRadius: '3px',
        boxShadow: '0px 0px 3.99778px 1.99889px rgba(0, 0, 0, 0.1)',
      },
      options.style
    )

    Object.assign(wrapper.style, {
      position: 'fixed',
      left: 0,
      top: 0,
      height: '100%',
      width: '100%',
      pointerEvents: 'none',
      zIndex: 2147483647 - 1,
    })

    wrapper.appendChild(popup)

    wrapper.setAttribute('data-openreplay-hidden', '')

    this.wrapper = wrapper

    confirmBtn.onclick = () => {
      this.resolve(true)
    }
    declineBtn.onclick = () => {
      this.resolve(false)
    }
  }

  private resolve: (result: boolean) => void = () => {};
  private reject: (reason: string) => void = () => {};

  mount(): Promise<boolean> {
    document.body.appendChild(this.wrapper)

    return new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }

  private _remove() {
    if (!this.wrapper.parentElement) {
      return
    }
    this.wrapper.parentElement.removeChild(this.wrapper)
  }
  remove() {
    this._remove()
    this.reject('no answer')
  }
}
