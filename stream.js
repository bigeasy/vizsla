var cadence = require('cadence')
var delta = require('delta')

function StreamParser (options) {
    this.options = options
}

StreamParser.prototype.parse = function (body, response, callback) {
    console.log('did call', typeof body.resume)
    callback(null, body)
}

module.exports = function (options) {
    return new StreamParser(options || [ 2 ])
}
