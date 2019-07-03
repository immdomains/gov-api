const db = require('../db')
const Model = require('../Model')

module.exports = class SurveyVote extends Model {
  constructor(result) {
    super(module.exports.tableName, result)
  }
}

module.exports.tableName = 'survey_votes'
