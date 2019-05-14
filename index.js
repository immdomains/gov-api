const restify = require('restify')
const restifyPromise = require('restify-await-promise')
const corsMiddleware = require('restify-cors-middleware')
const request = require('request-promise')
const db = require('./lib/db')
const User = require('./lib/User')
const oauth2 = require('./lib/oauth2')
const dotenv = require('dotenv')
const restifyCookies = require('restify-cookies')

dotenv.config()

const server = restify.createServer({
  name: 'reddit-api',
  version: '1.0.0'
})

restifyPromise.install(server)

const cors = corsMiddleware({
  'origins': ['*']
})

server.pre(cors.preflight)
server.use(cors.actual)
server.use(restify.plugins.acceptParser(server.acceptable))
server.use(restify.plugins.queryParser())
server.use(restify.plugins.bodyParser())
server.use(restifyCookies)

server.get('/auth/', async (req, res, next) => {
  const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: `${process.env.API_URL}/auth/callback`,
    scope: ['identity', 'subscribe'],
    state: 'random-unique-string'
  });

  res.redirect(authorizationUri, next);
})

server.get('/auth/', async (req, res, next) => {
  const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: `${process.env.API_URL}/auth/callback`,
    scope: ['identity', 'subscribe'],
    state: 'random-unique-string'
  });

  res.redirect(authorizationUri, next);
})

server.get('/auth/callback', async (req, res, next) => {
  const code = req.query.code;
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
      'Authorization': `bearer ${accessToken}`
    }
  })

  let user = await db.fetchUserByRedditId(meResult.id)

  if (user === null) {
    await db.createUser(meResult.id, meResult.name, meResult.created_utc)
    user = db.fetchUserByRedditId(meResult.id)
  }

  res.setCookie('user.cookie', user.cookie)

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
      'Authorization': `bearer ${accessToken}`
    }
  })

  return res.redirect(process.env.REDDIT_CALLBACK_URL, next)

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
