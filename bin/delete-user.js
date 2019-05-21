const prompt = require('prompt-promise')
const db = require('../lib/db')


async function run() {

  const redditUsername = await prompt('Reddit Username: ')

  let user = await db.fetchUserByRedditUsername(redditUsername)

  await db.query('UPDATE giveaways SET winningTicketId = NULL WHERE winningTicketId IN (SELECT id FROM tickets WHERE userId = ?)', [user.data.id])
  await db.query('DELETE FROM tickets WHERE userId = ?', [user.data.id])
  await db.query('DELETE FROM tickets WHERE inviteId = (SELECT id FROM invites WHERE fromUserId = ? OR toUserId = ?)', [user.data.id, user.data.id]);
  await db.query('DELETE FROM invites WHERE fromUserId = ? OR toUserId = ?', [user.data.id, user.data.id]);
  await db.query('DELETE FROM users WHERE id = ?', [user.data.id])


  await db.end()
  prompt.end()
}

run()
