const express = require('express')
const accessTokenLifeTime = 60 // seconds
const refreshTokenLifeTime = 5 * 60 // seconds
const app = express().use(express.json()).use(express.urlencoded({ extended: true }))

const clients = {
  s6BhdRkqt3: { // io
    client_secret: 'asdfnaspf',
    redirect_uri: 'http://localhost.io:5001/connection/oauth2callback',
    scopes: ['read'],
    basicAuthHeader: 'Basic ' + Buffer.from('s6BhdRkqt3:asdfnaspf').toString('base64')
  },
  nksdgfhbv: { // postman
    client_secret: 'verhsgdf',
    redirect_uri: 'https://oauth.pstmn.io/v1/browser-callback',
    scopes: ['read', 'write'],
    basicAuthHeader: 'Basic ' + Buffer.from('nksdgfhbv:verhsgdf').toString('base64')
  }
}

function generateAuthCode (clientId) {
  clients[clientId].code = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)
  return clients[clientId].code
}

function generateAccessTokenFromRefreshToken (client) {
  client.access_token = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)
  client.access_token_expiration = Date.now() + accessTokenLifeTime * 1000 // 3 seconds
  return {
    access_token: client.access_token,
    expires_in: accessTokenLifeTime
  }
}

function generateAccessTokenFromAuthCode (client) {
  client.access_token = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)
  client.refresh_token = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)
  client.access_token_expiration = Date.now() + accessTokenLifeTime * 1000
  client.refresh_token_expiration = client.access_token_expiration + refreshTokenLifeTime * 1000

  return {
    access_token: client.access_token,
    refresh_token: client.refresh_token,
    expires_in: accessTokenLifeTime,
    token_type: 'bearer'
  }
}

function clientAuthentication (authHeader) {
  return clients[Object.keys(clients).find(clientId => {
    const currentBasicAuthHeader = 'Basic ' + Buffer.from(`${clientId}:${clients[clientId].client_secret}`).toString('base64')
    return (currentBasicAuthHeader === authHeader)
  })]
}

function isValidToken (authHeader) {
  const accessToken = authHeader.slice(7)
  return Object.keys(clients).some(clientId => {
    return clients[clientId].access_token === accessToken && clients[clientId].access_token_expiration > Date.now()
  })
}

app.get('/authorize', (req, res) => {
  console.log('/authorize')
  const { response_type: responseType, client_id: clientId, state, redirect_uri: redirectUri } = req.query || {}

  if (!['code', 'token'].includes(responseType)) {
    return res.status(400).send('Error: The "response_type" must be either "code" or "token".')
  }

  if (!Object.keys(clients).includes(clientId)) {
    return res.status(400).send('Error: The "client_id" is not registered!')
  }

  if (redirectUri !== clients[clientId].redirect_uri) {
    return res.status(400).send('Error: The "redirect_uri" does not match the value registed!')
  }

  if (responseType === 'code' && clientId && redirectUri) {
    const client = clients[clientId]
    if (!client) {
      return res.status(400).send('invalid_client')
    }
    return res.redirect(redirectUri + '?code=' + generateAuthCode(clientId) + '&state=' + state)
  }

  res.status(400).send('Bad Request')
})

app.post('/token', (req, res) => {
  console.log('/token ' + req.body.grant_type)
  const client = clientAuthentication(req.headers.authorization)

  if (!client) {
    return res.status(400).send('Client authentication failed!')
  }

  switch (req.body.grant_type) {
    case 'authorization_code':
      if (req.body?.code !== client.code) {
        return res.status(400).send('Bad authorization code')
      }

      return res.json(generateAccessTokenFromAuthCode(client))

    case 'refresh_token':
      if (!req.body.refresh_token) {
        return res.status(400).send('Expected refresh_token to be non-empty in the request body!')
      }

      if (!client.refresh_token) {
        return res.status(400).send('The auth server has be reset, please re-authorize')
      }

      if (req.body.refresh_token !== client.refresh_token) {
        return res.status(400).send('Invalid refresh token')
      }

      if (client.refresh_token_expiration < Date.now()) {
        return res.status(401).send('The refresh token has expired! Please re-authorize for a new set of access_token and refresh_token')
      }

      return res.json(generateAccessTokenFromRefreshToken(client))

    default:
      res.status(400).send('Expected "grant_type" to equal "authorization_code" or "refresh_token"')
  }
})

app.get('/ping', (req, res) => {
  console.log('/ping')
  if (!isValidToken(req.headers.authorization)) {
    return res.status(401).send('Access token expired/invalid')
  }

  res.json({ message: 'pong', randomShit: Math.floor(Math.random() * 100) })
})

app.get('/dummy', (req, res) => {
  console.log('/dummy')
  if (!isValidToken(req.headers.authorization)) {
    return res.status(401).send('Access token expired/invalid')
  }

  res.json({ message: 'dummy', randomShit: Math.floor(Math.random() * 100) })
})

app.get('/401', (_req, res) => res.status(401).send('Unauthorized'))

app.listen(3000, () => console.log('Server listening on port 3000!'))
