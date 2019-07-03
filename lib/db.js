const mysql = require('promise-mysql')

require('./0')

class Db {
  constructor() {

    this.fetchConnection()
  }

  async fetchConnection() {
    if (this.connectionPromise) {
      return this.connectionPromise
    }
    this.connectionPromise = mysql.createConnection({
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      supportBigNumbers: true,
      bigNumberStrings: true
    })

    const connection = await this.connectionPromise
    connection.query('SET SESSION auto_increment_increment=1')

    return this.connectionPromise
  }

  async query(...args) {
    const connection = await this.fetchConnection()
    return connection.query(...args).then((result) => {
      return result
    }).catch((error) => {
      console.log(error.sqlMessage.red)
      console.log(error.sql.magenta)
      throw error
    })
  }

  async end() {
    const connection = await this.fetchConnection()
    connection.end()
    this.connectionPromise = null
  }

  async selectAll(Model) {
    const results = await this.query(`SELECT * FROM ${Model.tableName}`)
    return results.map((result) => {
      return new Model(result)
    })
  }

  async selectSome(Model, clause, params = []) {
    const results = await this.query(`SELECT * FROM ${Model.tableName} ${clause}`, params)
    return results.map((result) => {
      return new Model(result)
    })
  }

  async selectOne(Model, clause, params = []) {
    const results = await this.query(`SELECT * FROM ${Model.tableName} ${clause} LIMIT 1`, params)

    if (results.length === 0) {
      return null
    }

    return results.map((result) => {
      return new Model(result)
    })[0]
  }

  async insert(Model, mapping) {
    const fields = Object.keys(mapping)
    const values = fields.map((field) => {
      return mapping[field]
    })
    const qs = values.map(() => {
      return '?'
    })
    return this.query(`INSERT INTO ${Model.tableName}(${fields.join(',')}) VALUES(${qs.join(',')})`,
      values
    )
  }

  async update(model, mapping) {
    const fields = Object.keys(mapping)
    const values = fields.map((field) => {
      return mapping[field]
    })
    const qs = fields.map((field) => {
      return `${field} = ?`
    })
    return this.query(`UPDATE ${model.tableName} SET ${qs.join(',')} WHERE id = ?`,
      [
        ...values,
        model.result.id
      ]
    )

  }

}

module.exports =  new Db(
  process.env.DB_HOST,
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS
)
