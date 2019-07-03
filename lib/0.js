const colors = require('colors')
const dotenv = require('dotenv')

dotenv.config()

process.on('unhandledRejection', (error) => {
  console.log(error)
  process.exit()
});


Array.prototype.asyncForEach = async function asyncForEach(callback) {
  for (let index = 0; index < this.length; index++) {
    await callback(this[index], index);
  }
}


Array.prototype.asyncMap = async function asyncMap(callback) {
  const results = []
  await this.asyncForEach(async (...args) => {
    const result = await callback(...args)
    results.push(result)
  })
  return results
}
