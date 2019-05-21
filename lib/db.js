const mysql = require('promise-mysql')
const getTime = require('./getTime')
const User = require('./User')
const dotenv = require('dotenv')
const params = require('./params')
const Giveaway = require('./Giveaway')
const Card = require('./Card')
const Ticket = require('./Ticket')

function getRandInt() {
  return Math.round(Math.random() * 1e10)
}

dotenv.config()

 class Db {
  constructor(host, name, user, pass) {
    this.host = host
    this.name = name
    this.user = user
    this.pass = pass

    this.fetchConnection()
  }

  async fetchConnection() {
    if (this.connectionPromise) {
      return this.connectionPromise
    }
    this.connectionPromise = mysql.createConnection({
      host: this.host,
      database: this.name,
      user: this.user,
      password: this.pass
    })

    const connection = await this.connectionPromise
    connection.query('SET SESSION auto_increment_increment=1')

    return this.connectionPromise
  }

  async query(...args) {
    const connection = await this.fetchConnection()
    return connection.query(...args)
  }

  async createUser(redditId, redditUsername, redditCreatedAt) {
    await this.query('INSERT INTO users (createdAt, redditId, redditUsername, redditCreatedAt, cookie, inviteCode) VALUES (?, ?, ?, ?, ?, ?)', [
      getTime(),
      redditId,
      redditUsername,
      redditCreatedAt,
      getRandInt(),
      getRandInt()
    ])
  }

  async createGiveaway(cardId, drawingAtYear, drawingAtMonth, drawingAtDay, drawingAtHour) {
    await this.query('INSERT INTO giveaways (createdAt, cardId, drawingAtYear, drawingAtMonth, drawingAtDay, drawingAtHour) VALUES (?, ?, ?, ?, ?, ?)', [
      getTime(),
      cardId,
      drawingAtYear, drawingAtMonth, drawingAtDay, drawingAtHour
    ])
  }

  async fetchGiveaways() {
    const results = await this.query('SELECT * FROM giveaways ORDER BY drawingAtYear ASC, drawingAtMonth ASC, drawingAtDay ASC, drawingAtHour ASC')
    return results.map((result) => {
      return new Giveaway(this, result)
    })
  }

  async fetchCards() {
    const results = await this.query('SELECT * FROM cards')
    return results.map((result) => {
      return new Card(this, result)
    })
  }

  async createCard(title, goldfishUrlPath) {
    await this.query('INSERT INTO cards (createdAt, title, goldfishUrlPath) VALUES (?, ?, ?)', [
      getTime(),
      title,
      goldfishUrlPath
    ])
  }

  async fetchCard(id) {
    const results = await this.query('SELECT * FROM cards WHERE id = ?', [
      id
    ])
    if (results.length === 0) {
      return null
    }
    return new Card(this, results[0])
  }

  async fetchTicket(id) {
    const results = await this.query('SELECT * FROM tickets WHERE id = ?', [
      id
    ])
    if (results.length === 0) {
      return null
    }
    return new Ticket(this, results[0])
  }


  async fetchCardByGoldfishUrlPath(goldfishUrlPath) {
    const results = await this.query('SELECT * FROM cards WHERE goldfishUrlPath = ?', [
      goldfishUrlPath
    ])
    if (results.length === 0) {
      return null
    }
    return new Giveaway(this, results[0])
  }



  async fetchUserByRedditId(redditId) {
    const results = await this.query('SELECT * FROM users WHERE redditId = ?', [
      redditId
    ])
    if (results.length === 0) {
      return null
    }
    return new User(this, results[0])
  }

  async fetchUser(id) {
    const results = await this.query('SELECT * FROM users WHERE id = ?', [
      id
    ])
    if (results.length === 0) {
      return null
    }
    return new User(this, results[0])
  }


  async fetchUserByCookie(cookie) {
    const results = await this.query('SELECT * FROM users WHERE cookie = ?', [
      cookie
    ])
    if (results.length === 0) {
      return null
    }
    return new User(this, results[0])
  }

  async fetchUserByRedditUsername(redditUsername) {
    const results = await this.query('SELECT * FROM users WHERE redditUsername = ?', [
      redditUsername
    ])
    if (results.length === 0) {
      return null
    }
    return new User(this, results[0])
  }


  async fetchUserByInviteCode(inviteCode) {
    const results = await this.query('SELECT * FROM users WHERE inviteCode = ?', [
      inviteCode
    ])
    if (results.length === 0) {
      return null
    }
    return new User(this, results[0])
  }

  async fetchRecentUsers(limit = 100) {
    const results = await this.query('SELECT * FROM users ORDER BY id DESC LIMIT ?', [
      limit
    ])
    return results.map((result) => {
      return new User(this, result)
    })
  }

  async fetchScore0ApprovalsCount() {
    const results = await this.query('SELECT COUNT(id) FROM users WHERE score0 >= ?', [
      params.score0.threshold
    ])
    return results[0]['COUNT(id)']
  }

  async end() {
    const connection = await this.fetchConnection()
    connection.end()
    this.connectionPromise = null
  }
}

module.exports =  new Db(
  process.env.DB_HOST,
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS
)
