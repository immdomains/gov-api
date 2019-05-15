const getTime = require('./getTime')
const request = require('request-promise')

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
      console.log(subreddit, child.data.created, child.data.score)
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
    const connection = await this.db.fetchConnection()
    await connection.query('UPDATE users SET score0 = ?, score0UpdatedAt = ? WHERE id = ?', [
      score0,
      getTime(),
      this.data.id
    ])
  }

  async setAddressHexUnprefixed(addressHexUnprefixed) {
    const connection = await this.db.fetchConnection()
    await connection.query('UPDATE users SET addressHexUnprefixed = ? WHERE id = ?', [
      addressHexUnprefixed,
      this.data.id
    ])
  }
}
