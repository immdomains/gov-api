module.exports = function getTime() {
  return Math.round((new Date).getTime() / 1000)
}
