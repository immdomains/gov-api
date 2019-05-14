const db = require('../lib/db')
const User = require('../lib/User')

async function updateScore0() {
  const connection = await db.fetchConnection()
  const results = await connection.query('SELECT * FROM users ORDER BY score0UpdatedAt DESC LIMIT 1')
  const user = new User(db, results[0])
  await user.updateScore0()
  db.end()
}

updateScore0()
