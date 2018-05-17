var cadence = require('cadence')
var byline = require('byline')
var JsonStream = require('../jsons')

function StreamingJsonParser (options) {
    this.options = options
}

StreamingJsonParser.prototype.parse = cadence(function (async, body, response) {
    return [ body.pipe(byline()).pipe(new JsonStream()), response ]
})

module.exports = function (options) {
    return new StreamingJsonParser(options || [ 2, 'content-type: application/json-stream' ])
}
