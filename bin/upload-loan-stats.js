const getTime = require('../lib/getTime')
const params = require('../lib/params')
const db = require('../lib/db')
const s3 = require('../lib/s3')const delay = require('delay')

let lastUploadedStatsKey
let lastUploadedStatsUpdatedAt = 0

async function fetchStats() {
  const stats = {
    updatedAt: getTime(),
    params
  }

  stats.score0ApprovalsCount = await db.fetchScore0ApprovalsCount()

  const recentUsers = await db.fetchRecentUsers(100)
  stats.users = recentUsers.map((user) => {
    return {
      createdAt: user.data.createdAt,
      redditUsername: user.data.redditUsername,
      isEthereumLinked: user.data.addressHexUnprefixed !== null,
      score0Info: {
        isCalculated: user.data.score0UpdatedAt !== null,
        isApproved: user.data.score0 && user.data.score0 > params.score0.threshold
      }
    }
  })

  return stats
}

async function uploadStats(stats) {

  lastUploadedStatsKey = getStatsKey(stats)
  lastUploadedStatsUpdatedAt = stats.updatedAt

  const statsJson = JSON.stringify(stats, null, 2)

  await s3.upload({
    Bucket: 'cryptoloan-stats-api',
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
    && (getTime() - lastUploadedStatsUpdatedAt) < 10
  ) {
    await delay(1000)
    return loopUploadStats()
  }

  await uploadStats(stats)

  await delay(1000)
  return loopUploadStats()
}

loopUploadStats()
