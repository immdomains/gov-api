const db = require('../db')
const Model = require('../Model')
const surveyAnswers = require('../params/surveyAnswers')
const SurveyVote = require('./SurveyVote')

module.exports = class User extends Model {
  constructor(result) {
    super(module.exports.tableName, result)
  }

  async fetchApiPojo() {
    const apiPojo = Object.assign({}, this.result)
    delete apiPojo.secret
    return apiPojo
  }

  async fetchSurveyVotes() {
    return db.selectSome(SurveyVote, 'WHERE userId = ?', [ this.result.id ])
  }

  async fetchMeApiPojo() {
    const meApiPojo = Object.assign({}, await this.fetchApiPojo())
    const surveyVotes = await this.fetchSurveyVotes()
    meApiPojo.surveyVotes = surveyVotes.map((surveyVote) => {
      return surveyVote.result
    })
    return meApiPojo
  }

  async setSurveyVote(surveyId, answerId) {
    const answer = surveyAnswers.find((answer) => {
      return answer.id === answerId
    })
    if (!answer) {
      throw new Error(`Invalid answerId ${answerId}`)
    }
    const surveyVote = await db.selectOne(SurveyVote, 'WHERE userId = ? AND surveyId = ?', [
      this.result.id,
      surveyId
    ])
    if (surveyVote === null) {
      await db.insert(SurveyVote, {
        userId: this.result.id,
        surveyId,
        answerId
      })
    } else {
      await db.update(surveyVote, { answerId })
    }
  }

}

module.exports.tableName = 'users'
