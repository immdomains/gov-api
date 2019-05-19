module.exports = class GiveawayItem {
  constructor(db, data) {
    this.db = db
    this.data = data
  }

  fetchCard() {
    return this.db.fetchCard(this.data.cardId)
  }
}
