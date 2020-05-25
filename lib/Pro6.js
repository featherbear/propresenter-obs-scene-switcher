const WebSocket = require('ws')
const EventEmitter = require('events')

class Pro6Client extends EventEmitter {
  constructor () {
    super()
    this.socket = null
    this._currentFile = null
    this.fileMap = {}
  }

  get currentFile () {
    return this._currentFile
  }

  requestPlaylists () {
    this.send({ action: 'playlistRequest' })
  }

  send (data) {
    this.socket.send(JSON.stringify(data))
  }

  __onMessageHandler (data) {
    data = JSON.parse(data)

    // TODO: Look at Category

    switch (data.action) {
      
      /* Fetch playlist data (Pro6) */
      case 'playlistRequestAll':
        var newMap = {}
        data.playlistAll.forEach(playlist => {
          playlist.playlist.forEach(item => {
            newMap[item.playlistItemLocation] = item.playlistItemName
          })
        })
        this.fileMap = newMap
        return

      // /* Fetch playlist data (Pro7) */
      // case 'playlistRequest':
      //   var newMap = {};
      //   data.playlistAll.forEach(playlistGroup => {
      //     playlistGroup.playlist.forEach(playlist => {
      //       playlist.playlist.forEach(item => {
      //         newMap[item.playlistItemLocation] = item.playlistItemName
      //       })
      //     })
      //   })
      //   this.fileMap = newMap;
      //   console.log(this.fileMap);
      //   return

      /* Slide changes (PUSH) */
      case 'presentationTriggerIndex':
        let resolvedName = data.presentationPath.endsWith('.pro6')
          ? data.presentationPath
          : this.fileMap[data.presentationPath]
        if (resolvedName && this._currentFile != resolvedName) {
          this._currentFile = resolvedName
          this.emit('fileChange', this._currentFile)
        }
        return

      /* Polls (PULL) */
      case 'presentationSlideIndex':
        if (data.slideIndex == -1) {
          this.send({
            action: 'presentationCurrent',
            presentationSlideQuality: 25
          })
        }
        return

      /* Images, Media, Music */
      case 'presentationCurrent':
        if (this._currentFile != data.presentation.presentationName) {
          this._currentFile = data.presentation.presentationName
          this.emit('fileChange', this._currentFile)
        }
        return

      default:
        console.log(data)
        return
    }
  }

  async connect (data) {
    let { address, password } = data || {}
    if (!address) address = 'localhost:50001'
    if (!password) password = 'control'

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(`ws://${address}/remote`)
      this.socket.on('open', () => {
        this.socket.once('message', data => {
          data = JSON.parse(data)
          if (data.error) {
            console.log(data.error)
            return reject(data)
          }

          this.socket.on('message', this.__onMessageHandler.bind(this))

          setInterval(this.requestPlaylists.bind(this), 60 * 1000)
          this.requestPlaylists()

          setInterval(() => {
            this.send({ action: 'presentationSlideIndex' })
          }, 1000)

          return resolve(data)
        })

        this.send({
          action: 'authenticate',
          protocol: '600',
          password: password
        })
      })
    })
  }
}

module.exports = Pro6Client
