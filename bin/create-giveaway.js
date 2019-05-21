const prompt = require('prompt-promise')
const db = require('../lib/db')
const request = require('request-promise')
const $ = require('cheerio')
const s3 = require('../lib/s3')


async function run() {

  const drawingAtMonth = await prompt('Month (MM): ')
  const drawingAtDay = await prompt('Day (DD): ')
  const goldfishUrl = await prompt('Goldfish Url: ')

  const goldfishUrlPath = goldfishUrl.split('https://www.mtggoldfish.com').join('').split('#')[0]

  let card = await db.fetchCardByGoldfishUrlPath(goldfishUrlPath)

  if (card === null) {

    const goldfishHtml =  await request(goldfishUrl)

    const titleNodes = $('.price-card-name-header-name', goldfishHtml)
    const title = titleNodes.contents().first().text().trim()

    await db.createCard(
      title,
      goldfishUrlPath
    )

    card = await db.fetchCardByGoldfishUrlPath(goldfishUrlPath)

    const imageNodes = $('.price-card-image-image', goldfishHtml)
    const goldfishImageUrl = imageNodes[0].attribs.src
    const goldfishImage = await request({
      url: goldfishImageUrl,
      encoding: null
    })

    console.log(`cards/${card.data.id}.jpeg`)

    await s3.upload({
      Bucket: 'giveaway-stats-api',
      Key: `cards/${card.data.id}.jpeg`,
      Body: goldfishImage,
      ContentType: 'image/jpeg'
    }).promise()

  }

  db.createGiveaway(card.data.id, 2019, drawingAtMonth, drawingAtDay, 16)

  await db.end()
  prompt.end()
}

run()
