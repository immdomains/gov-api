const restify = require('restify')
const restifyPromise = require('restify-await-promise')
const corsMiddleware = require('restify-cors-middleware')
const restifyCookies = require('restify-cookies')
const request = require('request-promise')
const db = require('./lib/db')
const User = require('./lib/User')
const oauth2 = require('./lib/oauth2')
const dotenv = require('dotenv')

dotenv.config()

const server = restify.createServer({
  name: 'reddit-api',
  version: '1.0.0'
})

restifyPromise.install(server)

const domains = ['localhost', 'guildcrypt-site-qa.herokuapp.com', 'guildcrypt.com']

const cors = corsMiddleware({
  origins: ['*'],
  allowHeaders: ['Authorization'],
})

server.pre(cors.preflight)
server.use(cors.actual)
server.use(restifyCookies.parse)
server.use(restify.plugins.acceptParser(server.acceptable))
server.use(restify.plugins.queryParser())
server.use(restify.plugins.bodyParser())

server.get('/me/', async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.send(null)
  }

  const user = await db.fetchUserByCookie(req.headers.authorization)

  if (!user) {
    return res.send(null)
  }

  const userData = user.data

  const tickets = await user.fetchTickets()

  userData.tickets = tickets.map((ticket) => {
    ticket.data
  })

  const inviteToUsersResults = await db.query('SELECT * FROM users WHERE id IN (SELECT toUserId FROM invites WHERE fromUserId = ?)', [
    user.data.id
  ])

  userData.invites = inviteToUsersResults.map((toUser) => {
    return {
      toUser: {
        redditUsername: toUser.redditUsername
      }
    }
  })

  return res.send(userData)

})

server.post('/me/email', async (req, res, next) => {
  const user = await db.fetchUserByCookie(req.headers.authorization)

  if (!user) {
    throw new Error('Invalid user')
  }

  let isNewEmail = user.data.email === null

  await user.updateEmail(req.body.email)

  if (isNewEmail) {
    await user.createTicket('email')
  }

  return res.send(null)

})


server.get('/invites/:inviteCode', async (req, res, next) => {
  const user = await db.fetchUserByInviteCode(parseInt(req.params.inviteCode))

  if (!user) {
    return res.send(null)
  }

  return res.send({
    inviteCode: user.data.inviteCode,
    redditUsername: user.data.redditUsername
  })

})


server.post('/me/addressHexUnprefixed', async (req, res, next) => {
  const user = await db.fetchUserByCookie(req.headers.authorization)

  if (!user) {
    throw new Error(`No user with cookie ${req.body.cookie}`)
  }

  user.setAddressHexUnprefixed(req.body.addressHexUnprefixed)
})


server.get('/auth/', async (req, res, next) => {
  const callbackUrl = decodeURIComponent(req.query.callbackUrl)

  res.setCookie('callbackUrl', callbackUrl)
  res.setCookie('inviteCode', req.query.inviteCode)

  const scope = ['identity']

  const isSubscribe = req.query.subscribe === 'yes'

  if (isSubscribe) {
    scope.push('subscribe')
    res.setCookie('subscribe', 'yes')
  } else {
    res.setCookie('subscribe', 'no')
  }

  const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: `${process.env.API_URL}/auth/callback`,
    scope: scope,
    state: 'random-unique-string'
  });

  res.redirect(authorizationUri, next);
})

server.get('/auth/callback', async (req, res, next) => {
  const code = req.query.code
  const options = {
    code,
    state: 'random-unique-string',
    redirect_uri: `${process.env.API_URL}/auth/callback`
  };

  const authorizationCodeResult = await oauth2.authorizationCode.getToken(options)
  const accessTokenResult = oauth2.accessToken.create(authorizationCodeResult)
  const accessToken = accessTokenResult.token.access_token

  const meResult = await request({
    method: 'GET',
    uri: 'https://oauth.reddit.com/api/v1/me',
    json: true,
    headers: {
      'User-Agent': 'GuildCrypt/0.1 by GuildCrypt',
      'authorization': `bearer ${accessToken}`
    }
  })

  let user = await db.fetchUserByRedditId(meResult.id)

  if (user === null) {
    await db.createUser(meResult.id, meResult.name, meResult.created_utc)
    user = await db.fetchUserByRedditId(meResult.id)
    await user.createTicket('signup')



    if (req.cookies.inviteCode) {
      await user.markInvite(req.cookies.inviteCode)
    }
  }

  if (req.cookies.subscribe === 'yes') {
    await request({
      method: 'POST',
      uri: 'https://oauth.reddit.com/api/subscribe',
      form: {
        action: 'sub',
        sr_name: 'GuildCrypt'
      },
      json: true,
      headers: {
        'User-Agent': 'GuildCrypt/0.1 by GuildCrypt',
        'authorization': `bearer ${accessToken}`
      }
    })
    if (user.data.isRedditSubscribed !== 1) {
      await db.query('UPDATE users SET isRedditSubscribed = 1 WHERE id = ?', [
        user.data.id
      ])
      await user.createTicket('reddit-subscribe')
    }
  }

  return res.redirect(`${req.cookies.callbackUrl}#/reddit-linked/${user.data.cookie}`, next)

})

server.listen(process.env.PORT || 5000, function () {
  console.log('%s listening at %s', server.name, server.url);
})


//
// dotenv.config()
//
// const db = new Db(
//   process.env.DB_HOST,
//   process.env.DB_NAME,
//   process.env.DB_USER,
//   process.env.DB_PASS
// )
//
// async function doIt() {
//   const user = await db.fetchOrCreateUserByEmail('afernandes@guildcrypt.com')
//
//   const checkout = await user.createCheckout(
//     'a07c5aeca9e7e7663caaafab790264c2fc5c6516',
//     50,
//     12,
//     1
//   )
//
//   await checkout.sendEmail()
//
//   await db.end()
// }

// doIt()
