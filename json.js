var cadence = require('cadence')
var delta = require('delta')

function JsonParser (options) {
    this.options = options
}

JsonParser.prototype.parse = cadence(function (async, body, response) {
    async(function () {
        delta(async()).ee(body).on('data', []).on('end')
    }, function (chunks) {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    })
})

module.exports = function (options) {
    return new JsonParser(options || [ 2, 'content-type: application/json' ])
}