import App from '../app/index.js'
import { ConnectionInformation } from '../app/messages.gen.js'

export default function (app: App): void {
  const connection:
    | {
        downlink: number
        type?: string
        addEventListener: (type: 'change', cb: () => void) => void
      }
    | undefined =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection
  if (connection === undefined) {
    return
  }

  const sendConnectionInformation = (): void =>
    app.send(
      ConnectionInformation(Math.round(connection.downlink * 1000), connection.type || 'unknown'),
    )
  sendConnectionInformation()
  connection.addEventListener('change', sendConnectionInformation)
}
