var cadence = require('cadence')

function DumpParser () {
}

DumpParser.prototype.parse = cadence(function (async, body) {
    body.resume()
    return [ null ]
})

module.exports = function (options) {
    return new DumpParser()
}
