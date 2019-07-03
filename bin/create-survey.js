const prompt = require('prompt-promise')
const Survey = require('../lib/models/Survey')
const db = require('../lib/db')
const getNow = require('../lib/utils/getNow')

async function run() {
  const questionMd = await prompt('Question (markdown)? ')
  await db.insert(Survey, {
    createdAt: getNow(),
    questionMd
  })
}

run()
