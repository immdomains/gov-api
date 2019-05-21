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
    giveaways: [],
    tickets: []
  }

  const giveaways = await db.fetchGiveaways()

  await asyncForEach(giveaways, async (giveaway) => {
    const drawingAtYear = giveaway.data.drawingAtYear
    const drawingAtMonth = giveaway.data.drawingAtMonth
    const drawingAtDay = giveaway.data.drawingAtDay
    const drawingAtHour = giveaway.data.drawingAtHour
    const drawingAt = (new Date(`${drawingAtYear}-${drawingAtMonth}-${drawingAtDay} ${drawingAtHour}:00:00 UTC-4`)) / 1000

    if (giveaway.data.winningTicketId <= null && drawingAt < stats.updatedAt) {
      const winningTicketResults = await db.query('SELECT id FROM tickets ORDER BY RAND()')

      giveaway.data.winningTicketId = winningTicketResults[0].id
      await db.query('UPDATE giveaways SET winningTicketId = ? WHERE id = ?', [
        giveaway.data.winningTicketId,
        giveaway.data.id
      ])
    }

    const card = await giveaway.fetchCard()

    const giveawayData = {
     drawingAt,
     card: {
       id: card.data.id,
       title: card.data.title
     }
    }

    const winningUser = await giveaway.fetchWinningUser()

    if (winningUser) {
      giveawayData.winningUser = {
        redditUsername: winningUser.data.redditUsername
      }
    }

    stats.giveaways.push(giveawayData)
  })

  const ticketResults = await db.query('SELECT * FROM tickets ORDER BY createdAt DESC LIMIT 100')

  await asyncForEach(ticketResults, async (ticketResult) => {
    const user = await db.fetchUser(ticketResult.userId)

    const ticket = {
      id: ticketResult.id,
      createdAt: ticketResult.createdAt,
      reasonCode: ticketResult.reasonCode,
      user: {
        redditUsername: user.data.redditUsername
      }
    }

    if (ticketResult.inviteId !== null) {
      const inviteResults = await db.query('SELECT * FROM invites WHERE id = ?', ticketResult.inviteId)
      const inviteResult = inviteResults[0]
      const fromUser = await db.fetchUser(inviteResult.fromUserId)
      const toUser = await db.fetchUser(inviteResult.toUserId)
      ticket.invite = {
        fromUser: {
          redditUsername: fromUser.data.redditUsername
        },
        toUser: {
          redditUsername: toUser.data.redditUsername
        }
      }
    }

    stats.tickets.push(ticket)
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

loopUploadStats().catch((err) => {
  process.exit(1)
})
