import App from '../app/index.js'
import { ConnectionInformation } from '../app/messages.gen.js'

export default function (app: App): void {
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection

  console.log(connection)
  if (connection === undefined) {
    return
  }

  const sendConnectionInformation = (): void => {
    app.send(
      ConnectionInformation(Math.round(connection.downlink * 1000), connection.effectiveType || 'unknown'),
    )
  }
  app.attachStartCallback(() => {
    sendConnectionInformation()
    connection.addEventListener('change', sendConnectionInformation)
  })
  app.attachStopCallback(() => {
    connection.removeEventListener('change', sendConnectionInformation)
  })
}
