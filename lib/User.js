const getTime = require('./getTime')
const request = require('request-promise')
const Ticket = require('./Ticket')

module.exports = class User {
  constructor(db, data) {
    this.db = db
    this.data = data
  }

  async calculateScore0(after = null) {

    const subreddits = [
      'magictcg',
      'mtgfinance',
      'ethereum',
      'ethtrader',
      'makerdao',
      'cryptocurrency',
      'makerdao',
      '0xproject'
    ]

    const afterQuery = after === null ? '' : `&after=${after}`
    const data = await request({
      method: 'GET',
      json: true,
      uri: `https://www.reddit.com/user/${this.data.redditUsername}/.json?sort=new&limit=100${afterQuery}`
    })
    const score = data.data.children.reduce((score, child) => {
      const subreddit = child.data.subreddit.toLowerCase()
      if (subreddits.indexOf(subreddit) === -1) {
        return score
      }
      return score + child.data.score
    }, 0)

    let afterScore = typeof data.data.after !== 'string' ? 0 : await this.calculateScore0(data.data.after)

    return score + afterScore
  }

  async updateScore0() {
    const score0 = await this.calculateScore0(null)
    await this.db.query('UPDATE users SET score0 = ?, score0UpdatedAt = ? WHERE id = ?', [
      score0,
      getTime(),
      this.data.id
    ])
  }

  async setAddressHexUnprefixed(addressHexUnprefixed) {
    await this.db.query('UPDATE users SET addressHexUnprefixed = ? WHERE id = ?', [
      addressHexUnprefixed,
      this.data.id
    ])
  }

  async updateEmail(email) {
    return this.db.query('UPDATE users SET email = ? WHERE id = ?', [
      email,
      this.data.id
    ])
  }

  async createTicket(reasonCode, inviteId = null) {
    await this.db.query('INSERT INTO tickets (createdAt, userId, reasonCode, inviteId) VALUES (?, ?, ?, ?)', [
      getTime(),
      this.data.id,
      reasonCode,
      inviteId
    ])
  }

  async fetchTickets() {
    const ticketResults = await this.db.query('SELECT * FROM tickets WHERE userId = ?', [
      this.data.id
    ])
    return ticketResults.map((ticketResult) => {
      return new Ticket(this.db, ticketResult)
    })
  }

  async markInvite(inviteCode) {
    const fromUser = await this.db.fetchUserByInviteCode(inviteCode)
    const inviteResult = await this.db.query('INSERT INTO invites (createdAt, fromUserId, toUserId) VALUES(?, ?, ?)', [
      getTime(),
      fromUser.data.id,
      this.data.id,
    ])
    await fromUser.createTicket('invited', inviteResult.insertId)
    await this.createTicket('invited-by', inviteResult.insertId)
  }
}
