var cadence = require('cadence')

function DumpParser (options) {
    this.options = options
}

DumpParser.prototype.parse = cadence(function (async, body) {
    body.resume()
    return [ null ]
})

module.exports = function (options) {
    return new DumpParser(Array.prototype.slice.call(arguments))
}
