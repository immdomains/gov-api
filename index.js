require('./lib/0')

const restify = require('restify')
const restifyPromise = require('restify-await-promise')
const corsMiddleware = require('restify-cors-middleware')
const restifyCookies = require('restify-cookies')
const request = require('request-promise')
const db = require('./lib/db')
const oauth2 = require('./lib/oauth2')
const getNow = require('./lib/utils/getNow')

const Survey = require('./lib/models/Survey')
const User = require('./lib/models/User')


const server = restify.createServer({
  name: 'imm-gov-api',
  version: '1.0.0'
})

restifyPromise.install(server)

const domains = ['localhost', 'imm.domains']

const cors = corsMiddleware({
  origins: ['*'],
  allowHeaders: ['x-user-id', 'x-user-secret'],
})

server.pre(cors.preflight)
server.use(cors.actual)
server.use(restifyCookies.parse)
server.use(restify.plugins.acceptParser(server.acceptable))
server.use(restify.plugins.queryParser())
server.use(restify.plugins.bodyParser())

server.get('/surveys/', async (req, res, next) => {

  const surveys = await db.selectSome(Survey, 'ORDER BY id DESC')

  return res.send(await surveys.asyncMap((survey, index) => {
    return survey.fetchApiPojo()
  }))

})


server.get('/me/', async (req, res, next) => {
  const userId = req.headers['x-user-id']
  const userCookie = req.headers['x-user-secret']

  if (!userId || !userCookie) {
    return res.send(null)
  }

  const user = await db.selectOne(User, 'WHERE id = ? AND secret = ?', [
    userId,
    userCookie
  ])

  if (!user) {
    return null
  }

  return res.send(await user.fetchMeApiPojo())

})

server.post('/me/vote/', async (req, res, next) => {
  const userId = req.headers['x-user-id']
  const userCookie = req.headers['x-user-secret']

  const user = await db.selectOne(User, 'WHERE id = ? AND secret = ?', [
    userId,
    userCookie
  ])

  if (!user) {
    throw new Error('Invalid Authorization')
  }

  await user.setSurveyVote(parseInt(req.body.surveyId), parseInt(req.body.answerId))

  return res.send(await user.fetchApiPojo())

})

//
// server.post('/me/email', async (req, res, next) => {
//   const user = await db.fetchUserByCookie(req.headers.authorization)
//
//   if (!user) {
//     throw new Error('Invalid user')
//   }
//
//   let isNewEmail = user.data.email === null
//
//   await user.updateEmail(req.body.email)
//
//   if (isNewEmail) {
//     await user.createTicket('email')
//   }
//
//   return res.send(null)
//
// })
//
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

  let user = await db.selectOne(User, 'WHERE redditId = ?', [
    meResult.id
  ])

  if (user === null) {
    await db.insert(User, {
      createdAt: getNow(),
      redditId: meResult.id,
      redditUsername: meResult.name,
      redditCreatedAt: meResult.created_utc,
      secret: Math.floor(Math.random() * 1e6)
    })
    user = await db.selectOne(User, 'WHERE redditId = ?', [
      meResult.id
    ])
  }

  if (req.cookies.subscribe === 'yes') {
    await request({
      method: 'POST',
      uri: 'https://oauth.reddit.com/api/subscribe',
      form: {
        action: 'sub',
        sr_name: 'ImmDomains'
      },
      json: true,
      headers: {
        'User-Agent': 'ImmDomains',
        'authorization': `bearer ${accessToken}`
      }
    })
  }

  return res.redirect(`${req.cookies.callbackUrl}#!/auth/${user.result.id}/${user.result.secret}`, next)

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
