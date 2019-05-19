const getTime = require('../lib/getTime')
const db = require('../lib/db')
const delay = require('delay')
const s3 = require('../lib/s3')
const asyncForEach = require('../lib/asyncForEach')

let lastUploadedStatsKey
let lastUploadedStatsUpdatedAt = 0

async function fetchStats() {
  console.log('fetch giveaway stats')
  const stats = {
    updatedAt: getTime(),
    giveaways: []
  }

  const giveaways = await db.fetchGiveaways()

  await asyncForEach(giveaways, async (giveaway) => {
    const drawingAtYear = giveaway.data.drawingAtYear
    const drawingAtMonth = giveaway.data.drawingAtMonth
    const drawingAtDay = giveaway.data.drawingAtDay
    const drawingAtHour = giveaway.data.drawingAtHour
    const drawingAt = (new Date(`${drawingAtYear}-${drawingAtMonth}-${drawingAtDay} ${drawingAtHour}:00:00 UTC-4`)) / 1000

    const card = await giveaway.fetchCard()

    stats.giveaways.push({
     drawingAt,
     card: {
       id: card.data.id,
       title: card.data.title
     }
    })
  })

  return stats
}

async function uploadStats(stats) {

  console.log('upload giveaway stats')

  lastUploadedStatsKey = getStatsKey(stats)
  lastUploadedStatsUpdatedAt = stats.updatedAt

  const statsJson = JSON.stringify(stats, null, 2)

  console.log(statsJson)

  await s3.upload({
    Bucket: 'giveaway-stats-api',
    ContentType: "application/json",
    Key: 'stats.json',
    Body: statsJson
  }).promise()

  db.end()
}

function getStatsKey(stats) {
  const statsClone = JSON.parse(JSON.stringify(stats))
  delete statsClone.updatedAt
  return JSON.stringify(statsClone)
}

async function loopUploadStats() {
  const stats = await fetchStats()

  const statsKey = getStatsKey(stats)

  if (
    statsKey === lastUploadedStatsKey
    && (getTime() - lastUploadedStatsUpdatedAt) < 60
  ) {
    await delay(1000)
    return loopUploadStats()
  }

  await uploadStats(stats)

  await delay(1000)
  return loopUploadStats()
}

loopUploadStats()
