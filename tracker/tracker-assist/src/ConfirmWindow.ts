import type { Properties } from 'csstype';

import { declineCall, acceptCall, cross, remoteControl } from './icons.js'

type ButtonOptions =  HTMLButtonElement | string | {
  innerHTML: string,
  style?: Properties,
}


// TODO: common strategy for InputOptions/defaultOptions merging
interface ConfirmWindowOptions {
  text: string,
  style?: Properties,
  confirmBtn: ButtonOptions,
  declineBtn: ButtonOptions,
}

export type Options = string | Partial<ConfirmWindowOptions>

function confirmDefault(
  opts: Options,
  confirmBtn: ButtonOptions,
  declineBtn: ButtonOptions,
  text: string,
): ConfirmWindowOptions {
  const isStr = typeof opts === "string"
  return Object.assign({
    text: isStr ? opts : text,
    confirmBtn,
    declineBtn,
  }, isStr ? undefined : opts)
}

export const callConfirmDefault = (opts: Options) => 
  confirmDefault(opts, acceptCall, declineCall, "You have an incoming call. Do you want to answer?")
export const controlConfirmDefault = (opts: Options) => 
  confirmDefault(opts, remoteControl, cross, "Allow remote control?")

function makeButton(options: ButtonOptions): HTMLButtonElement {
  if (options instanceof HTMLButtonElement) {
    return options
  }
  const btn = document.createElement('button')
  Object.assign(btn.style, {
    background: "transparent",
    padding: 0,
    margin: 0,
    border: 0,
    cursor: "pointer",
    borderRadius: "50%",
    width: "22px",
    height: "22px",
    color: "white", // TODO: nice text button in case when only text is passed
  })
  if (typeof options === "string") {
    btn.innerHTML = options
  } else {
    btn.innerHTML = options.innerHTML
    Object.assign(btn.style, options.style) 
  }
  return btn
}

export default class ConfirmWindow {
  private wrapper: HTMLDivElement;

  constructor(options: ConfirmWindowOptions) {
    const wrapper = document.createElement('div');
    const popup = document.createElement('div');
    const p = document.createElement('p');
    p.innerText = options.text;
    const buttons = document.createElement('div');
    const confirmBtn = makeButton(options.confirmBtn);
    const declineBtn = makeButton(options.declineBtn);
    buttons.appendChild(confirmBtn);
    buttons.appendChild(declineBtn);
    popup.appendChild(p);
    popup.appendChild(buttons);

    Object.assign(buttons.style, {
      marginTop: "10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-evenly",
    });

    Object.assign(popup.style, {
      position: "relative",
      pointerEvents: "auto",
      margin: "4em auto",
      width: "90%",
      maxWidth: "400px",
      padding: "25px 30px",
      background: "black",
      opacity: ".75",
      color: "white",
      textAlign: "center",
      borderRadius: ".25em .25em .4em .4em",
      boxShadow: "0 0 20px rgb(0 0 0 / 20%)", 
    }, options.style);

    Object.assign(wrapper.style, {
      position: "fixed",
      left: 0,
      top: 0,
      height: "100%",
      width: "100%",
      pointerEvents: "none",
      zIndex: 2147483647 - 1,
    })

    wrapper.appendChild(popup);
    this.wrapper = wrapper;

    confirmBtn.onclick = () => {
      this._remove();
      this.resolve(true);
    }
    declineBtn.onclick = () => {
      this._remove();
      this.resolve(false);
    }
  }

  private resolve: (result: boolean) => void = ()=>{};
  private reject: ()=>void = ()=>{};

  mount(): Promise<boolean> {
    document.body.appendChild(this.wrapper);
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  private _remove() {
    if (!this.wrapper.parentElement) { return; }
    document.body.removeChild(this.wrapper);
  }
  remove() {
    this._remove();
    this.reject();
  }
}
