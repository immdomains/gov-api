const db = require('../lib/db')
const asyncForEach = require('../lib/asyncForEach')
const delay = require('delay')

async function run() {
  const cards = await db.fetchCards()
  await asyncForEach(cards, async (card) => {
    console.log(card.data.title)
    await card.uploadScryfallImage()
    await delay(500)
  })
}

run()
