const dotenv = require('dotenv')
const aws = require('aws-sdk')

dotenv.config()


aws.config.update({
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET,
    region: 'us-east-1'
})

module.exports = new aws.S3()
