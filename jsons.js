var cadence = require('cadence')
var byline = require('byline')

var util = require('util')
var stream = require('stream')

function JsonStream () {
    stream.Transform.call(this, { objectMode: true })
}
util.inherits(JsonStream, stream.Transform)

JsonStream.prototype._transform = cadence(function (async, chunk, encoding) {
    this.push(JSON.parse(chunk.toString()))
    return []
})

JsonStream.prototype._flush = cadence(function () { return [] })

function StreamingJsonParser (options) {
    this.options = options
}

StreamingJsonParser.prototype.parse = cadence(function (async, body, response) {
    return [ body.pipe(byline()).pipe(new JsonStream()), response ]
})

module.exports = function (options) {
    return new StreamingJsonParser(Array.prototype.slice.call(arguments))
}
