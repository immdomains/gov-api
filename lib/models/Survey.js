const db = require('../db')
const Model = require('../Model')
const getNow = require('../utils/getNow')
const surveyAnswers = require('../params/surveyAnswers')

module.exports = class Survey extends Model {
  constructor(result) {
    super(module.exports.tableName, result)
  }

  async fetchApiPojo() {
    const apiPojo = Object.assign({}, this.result)
    apiPojo.answerSummaries = await surveyAnswers.asyncMap(async (surveyAnswerParam) => {
      const answerSummary = Object.assign({}, surveyAnswerParam)
      const countResults = await db.query('SELECT count(id) FROM survey_votes WHERE surveyId = ? AND answerId = ?', [
        this.result.id,
        surveyAnswerParam.id
      ])
      answerSummary.count = countResults[0]['count(id)']
      return answerSummary
    })
    return apiPojo
  }
}

module.exports.tableName = 'surveys'
