const OBSWebSocket = require('obs-websocket-js')
const Pro6Client = require('./lib/Pro6')

let Pro6_connection = { address: '192.168.1.5:50001' }
let OBS_connection = { address: '192.168.1.6:4444' }

async function OBS_connect (data) {
  while (true) {
    try {
      let obs = new OBSWebSocket()
      await obs.connect(data)
      return obs
    } catch {}
  }
}

let pro6 = new Pro6Client()
pro6.connect(Pro6_connection).then(resp => {
  console.log('Connected to PP6')
  pro6.on('fileChange', f => console.log(`Current file: ${f}`))
})

OBS_connect(OBS_connection).then(obs => {
  console.log('Connected to OBS')
  pro6.on('fileChange', f => {
    obs.send('SetCurrentScene', {
      'scene-name': f.toLowerCase().indexOf('song') > -1 ? 'Music' : 'Camera'
    })
  })
})
