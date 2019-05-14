const simpleOAuth2 = require('simple-oauth2')
const dotenv = require('dotenv')

dotenv.config()

module.exports = simpleOAuth2.create({
  client: {
    id: process.env.REDDIT_ID,
    secret: process.env.REDDIT_SECRET
  },
  auth: {
    authorizeHost: 'https://www.reddit.com',
    authorizePath: '/api/v1/authorize',
    tokenHost: 'https://www.reddit.com',
    tokenPath: '/api/v1/access_token'
  }
})
