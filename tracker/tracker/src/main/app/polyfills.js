;(function (global) {
  let channels = []

  function BroadcastChannel(channel) {
    let $this = this
    channel = String(channel)

    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    let id = '$BroadcastChannel$' + channel + '$'

    channels[id] = channels[id] || []
    channels[id].push(this)

    this._name = channel
    this._id = id
    this._closed = false
    // eslint-disable-next-line no-undef
    this._mc = new MessageChannel()
    this._mc.port1.start()
    this._mc.port2.start()

    global.addEventListener('storage', function (e) {
      if (e.storageArea !== global.localStorage) return
      if (e.newValue == null || e.newValue === '') return
      if (e.key.substring(0, id.length) !== id) return
      let data = JSON.parse(e.newValue)
      $this._mc.port2.postMessage(data)
    })
  }

  BroadcastChannel.prototype = {
    // BroadcastChannel API
    get name() {
      return this._name
    },
    postMessage: function (message) {
      let $this = this
      if (this._closed) {
        let e = new Error()
        e.name = 'InvalidStateError'
        throw e
      }
      let value = JSON.stringify(message)

      // Broadcast to other contexts via storage events...
      let key = this._id + String(Date.now()) + '$' + String(Math.random())
      global.localStorage.setItem(key, value)
      // eslint-disable-next-line no-undef
      setTimeout(function () {
        global.localStorage.removeItem(key)
      }, 500)

      // Broadcast to current context via ports
      channels[this._id].forEach(function (bc) {
        if (bc === $this) return
        bc._mc.port2.postMessage(JSON.parse(value))
      })
    },
    close: function () {
      if (this._closed) return
      this._closed = true
      this._mc.port1.close()
      this._mc.port2.close()

      let index = channels[this._id].indexOf(this)
      channels[this._id].splice(index, 1)
    },

    // EventTarget API
    get onmessage() {
      return this._mc.port1.onmessage
    },
    set onmessage(value) {
      this._mc.port1.onmessage = value
    },
    addEventListener: function (/*type, listener , useCapture*/) {
      return this._mc.port1.addEventListener.apply(this._mc.port1, arguments)
    },
    removeEventListener: function (/*type, listener , useCapture*/) {
      return this._mc.port1.removeEventListener.apply(this._mc.port1, arguments)
    },
    dispatchEvent: function (/*event*/) {
      return this._mc.port1.dispatchEvent.apply(this._mc.port1, arguments)
    },
  }

  global.BroadcastChannel = global.BroadcastChannel || BroadcastChannel
  // eslint-disable-next-line no-undef
})(self)
