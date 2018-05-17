var cadence = require('cadence')
var delta = require('delta')

function StreamParser (options) {
    this.options = options
}

StreamParser.prototype.parse = function (body, response, callback) {
    callback(null, body)
}

module.exports = function (options) {
    return new StreamParser(Array.prototype.slice.call(arguments))
}
