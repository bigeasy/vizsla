var cadence = require('cadence')
var delta = require('delta')

function TextParser (options) {
    this.options = options
}

TextParser.prototype.parse = cadence(function (async, body, response) {
    async(function () {
        delta(async()).ee(body).on('data', []).on('end')
    }, function (chunks) {
        // TODO Use charset type parameter.
        return Buffer.concat(chunks).toString('utf8')
    })
})

module.exports = function (options) {
    return new TextParser(options || [ 2 ])
}
