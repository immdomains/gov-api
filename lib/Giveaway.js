module.exports = class Giveaway {
  constructor(db, data) {
    this.db = db
    this.data = data
  }

  fetchCard() {
    return this.db.fetchCard(this.data.cardId)
  }

  fetchWinningTicket() {
    if (this.data.winningTicketId === null) {
      return null
    }
    return this.db.fetchTicket(this.data.winningTicketId)
  }

  async fetchWinningUser() {
    const winningTicket = await this.fetchWinningTicket()
    if (winningTicket === null) {
      return null
    }
    return this.db.fetchUser(winningTicket.data.userId)
  }
}
