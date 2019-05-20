const request = require('request-promise')
const s3 = require('../lib/s3')

module.exports = class Card {
  constructor(db, data) {
    this.db = db
    this.data = data
  }
  async fetchScryfallData() {
    if (this.scryfallData) {
      return this.scryfallData
    }
    const scryfallResults = await request(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(this.data.title)}`, {
      json: true
    })
    this.scryfallData = scryfallResults.data[0]
    return this.scryfallData
  }
  async uploadScryfallImage() {
    const scryfallData = await this.fetchScryfallData()
    const image = await request({
      url: scryfallData.image_uris.large,
      encoding: null
    })

    await s3.upload({
      Bucket: 'giveaway-stats-api',
      Key: `cards/${this.data.id}.jpeg`,
      Body: image,
      ContentType: 'image/jpeg'
    }).promise()

  }
}
