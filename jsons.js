var util = require('util')
var stream = require('stream')
var cadence = require('cadence')

function JsonStream () {
    stream.Transform.call(this, { objectMode: true })
}
util.inherits(JsonStream, stream.Transform)

JsonStream.prototype._transform = cadence(function (async, chunk, encoding) {
    this.push(JSON.parse(chunk.toString()))
    return []
})

JsonStream.prototype._flush = cadence(function () { console.log('done'); return [] })

module.exports = JsonStream
