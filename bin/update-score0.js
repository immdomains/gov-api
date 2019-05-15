const db = require('../lib/db')
const User = require('../lib/User')
const delay = require('delay')

async function updateScore0() {
  const connection = await db.fetchConnection()
  const results = await connection.query(
    'SELECT * FROM users WHERE score0UpdatedAt IS NULL ORDER BY id ASC LIMIT 1'
  )
  if (results.length === 0) {
    return
  }
  const user = new User(db, results[0])
  await user.updateScore0()
  db.end()
}

async function loopUpdateScore0() {
  await updateScore0()
  await delay(1000)
  return loopUpdateScore0()
}

loopUpdateScore0()
