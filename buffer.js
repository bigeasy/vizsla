var cadence = require('cadence')
var delta = require('delta')

function BufferParser (options) {
    this.options = options
}

BufferParser.prototype.parse = cadence(function (async, body, response) {
    async(function () {
        delta(async()).ee(body).on('data', []).on('end')
    }, function (chunks) {
        return Buffer.concat(chunks)
    })
})

module.exports = function (options) {
    return new BufferParser(Array.prototype.slice.call(arguments))
}
