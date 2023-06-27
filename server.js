const express = require('express')
const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const clients = {
  s6BhdRkqt3: { // client_id
    client_secret: 'asdfnaspf',
    redirect_uri: 'http://localhost.io:5001/connection/oauth2callback',
    scope: 'read',
    basicAuthHeader: Buffer.from('s6BhdRkqt3:asdfnaspf').toString('base64')
  }
}

function generateAuthCode (client_id) {
  // generates random alphanumeric string
  clients[client_id].code = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)
  return clients[client_id].code
}

app.get('/authorize', (req, res) => {
  /// authorize?response_type=code&client_id=s6BhdRkqt3&state=xyz& redirect_uri=https % 3A % 2F % 2Fclient % 2Eexample % 2Ecom % 2Fc
  const { response_type, client_id, state, redirect_uri } = req.query || {}
  if (response_type === 'code' && client_id && redirect_uri) {
    const client = clients[client_id]
    if (!client) {
      return res.status(400).send('invalid_client')
    }
    // if client[]
    return res.redirect(redirect_uri + '?code=' + generateAuthCode(client_id) + '&state=' + state)
  }
  res.status(400).send('Bad Request')
})

app.post('/token', (req, res) => {
  if (req.body?.code !== clients[req.body.client_id].code) return res.status(400).send('Bad authorization code')
  delete req.body.code
  res.json({
    data: {
      access_token: '2YotnFZFEjr1zCsicMWpAA'
    },
    access_token: '2YotnFZFEjr1zCsicMWpAA',
    token_type: 'example',
    expires_in: 3600,
    refresh_token: 'tGzv3JOkF0XG5Qx2TlKWIA',
    example_parameter: 'example_value'
  })
})

app.get('/ping', (req, res) => {
  if (req.headers.authorization !== 'Bearer 2YotnFZFEjr1zCsicMWpAA') {
    return res.status(401).send('Unauthorized')
  }
  res.json({ message: 'pong' })
})

app.listen(3000, () => console.log('Server listening on port 3000!'))
