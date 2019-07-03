module.exports = function getNow() {
  return Math.round((new Date).getTime() / 1000)
}
