import AnnotationCanvas from './AnnotationCanvas';
import type { Socket } from './types'
import type Screen from '../Screen/Screen'
import type { Store } from '../../common/types'

export enum RemoteControlStatus {
  Disabled = 0,
  Requesting,
  Enabled,
}

export interface State {
	annotating: boolean
	remoteControl: RemoteControlStatus
  currentTab?: string
}

export default class RemoteControl {
	static readonly INITIAL_STATE: Readonly<State> = {
		remoteControl: RemoteControlStatus.Disabled,
		annotating: false,
	}
  onReject: () => void = () => {}

	constructor(
		private store: Store<State>,
		private socket: Socket,
		private screen: Screen,
		private agentInfo: Object,
		private onToggle: (active: boolean) => void,
	){
		socket.on("control_granted", ({ meta, data }) => {
      this.toggleRemoteControl(data === socket.id)
    })
    socket.on("control_rejected", ({ meta, data }) => {
      data === socket.id && this.toggleRemoteControl(false)
      this.onReject()
    })
    socket.on('SESSION_DISCONNECTED', () => {
    	if (this.store.get().remoteControl === RemoteControlStatus.Requesting) {
        this.toggleRemoteControl(false) // else its remaining
      }
    })
    socket.on("disconnect", () => {
      this.toggleRemoteControl(false)
    })
    socket.on("error", () => {
      this.toggleRemoteControl(false)
    })
	}

	private onMouseMove = (e: MouseEvent): void => {
    const data = this.screen.getInternalCoordinates(e)
    this.emitData("move", [ data.x, data.y ])
  }

  private emitData = (event: string, data?: any) => {
    this.socket.emit(event, { meta: { tabId: this.store.get().currentTab }, data })
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    //throttling makes movements less smooth, so it is omitted
    //this.onMouseMove(e)
    this.emitData("scroll", [ e.deltaX, e.deltaY ])
  }

  public setCallbacks = ({ onReject }: { onReject: () => void }) => {
    this.onReject = onReject
  }

  private onMouseClick = (e: MouseEvent): void => {
    if (this.store.get().annotating) { return; } // ignore clicks while annotating

    const data = this.screen.getInternalViewportCoordinates(e)
    // const el = this.screen.getElementFromPoint(e); // requires requestiong node_id from domManager
    const el = this.screen.getElementFromInternalPoint(data)
    if (el instanceof HTMLElement) {
      el.focus()
      el.oninput = e => {
        if (el instanceof HTMLTextAreaElement
          || el instanceof HTMLInputElement
        ) {
          this.socket && this.emitData("input", el.value)
        } else if (el.isContentEditable) {
          this.socket && this.emitData("input", el.innerText)
        }
      }
      // TODO: send "focus" event to assist with the nodeID
      el.onkeydown = e => {
        if (e.key == "Tab") {
          e.preventDefault()
        }
      }
      el.onblur = () => {
        el.oninput = null
        el.onblur = null
      }
    }
    this.emitData("click",  [ data.x, data.y ]);
  }

  private toggleRemoteControl(enable: boolean){
    if (enable) {
      this.screen.overlay.addEventListener("mousemove", this.onMouseMove)
      this.screen.overlay.addEventListener("click", this.onMouseClick)
      this.screen.overlay.addEventListener("wheel", this.onWheel)
      this.store.update({ remoteControl: RemoteControlStatus.Enabled })
    } else {
      this.screen.overlay.removeEventListener("mousemove", this.onMouseMove)
      this.screen.overlay.removeEventListener("click", this.onMouseClick)
      this.screen.overlay.removeEventListener("wheel", this.onWheel)
      this.store.update({ remoteControl: RemoteControlStatus.Disabled })
      this.toggleAnnotation(false)
    }
    this.onToggle(enable)
  }

  requestReleaseRemoteControl = () => {
    const remoteControl = this.store.get().remoteControl
    if (remoteControl === RemoteControlStatus.Requesting) { return }
    if (remoteControl === RemoteControlStatus.Disabled) {
      this.store.update({ remoteControl: RemoteControlStatus.Requesting })
      this.emitData("request_control", JSON.stringify({
          ...this.agentInfo,
          query: document.location.search
        }))
    } else {
      this.releaseRemoteControl()
    }
  }

  releaseRemoteControl = () => {
    this.emitData("release_control",)
    this.toggleRemoteControl(false)
  }

  private annot: AnnotationCanvas | null = null

  toggleAnnotation(enable?: boolean) {
    if (typeof enable !== "boolean") {
      enable = this.store.get().annotating
    }
    if (enable && !this.annot) {
      const annot = this.annot = new AnnotationCanvas()
      annot.mount(this.screen.overlay)
      annot.canvas.addEventListener("mousedown", e => {
        const data = this.screen.getInternalViewportCoordin1ates(e)
        annot.start([ data.x, data.y ])
        this.emitData("startAnnotation", [ data.x, data.y ])
      })
      annot.canvas.addEventListener("mouseleave", () => {
        annot.stop()
        this.emitData("stopAnnotation")
      })
      annot.canvas.addEventListener("mouseup", () => {
        annot.stop()
        this.emitData("stopAnnotation")
      })
      annot.canvas.addEventListener("mousemove", e => {
        if (!annot.isPainting()) { return }

        const data = this.screen.getInternalViewportCoordinates(e)
        annot.move([ data.x, data.y ])
        this.emitData("moveAnnotation", [ data.x, data.y ])
      })
      this.store.update({ annotating: true })
    } else if (!enable && !!this.annot) {
      this.annot.remove()
      this.annot = null
      this.store.update({ annotating: false })
    }
  }

  clean() {
  	this.toggleRemoteControl(false)
  	if (this.annot) {
      this.annot.remove()
      this.annot = null
    }
  }
}