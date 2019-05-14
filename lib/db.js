const mysql = require('promise-mysql')
const getTime = require('./getTime')
const User = require('./User')
const dotenv = require('dotenv')

dotenv.config()

 class Db {
  constructor(host, name, user, pass) {
    this.host = host
    this.name = name
    this.user = user
    this.pass = pass
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

    return this.connectionPromise
  }

  async createUser(redditId, redditUsername, redditCreatedAt) {
    const connection = await this.fetchConnection()
    await connection.query('INSERT INTO users (createdAt, redditId, redditUsername, redditCreatedAt, cookie) VALUES (?, ?, ?, ?, ?)', [
      getTime(),
      redditId,
      redditUsername,
      Math.round(Math.random() * 1e10),
      redditCreatedAt
    ])
  }

  async fetchUserByRedditId(redditId) {
    const connection = await this.fetchConnection()
    const results = await connection.query('SELECT * FROM users WHERE redditId = ?', [
      redditId
    ])
    if (results.length === 0) {
      return null
    }
    return new User(this, results[0])
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
