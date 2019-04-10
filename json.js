var cadence = require('cadence')
var delta = require('delta')
var assert = require('assert')
var Interrupt = require('interrupt').createInterrupter('vizsla')

var logger = require('prolific.logger').createLogger('vizsla')

function JsonParser (options) {
    this.options = options
}

JsonParser.prototype.parse = cadence(function (async, body, response) {
    async(function () {
        delta(async()).ee(body).on('data', []).on('end')
    }, function (chunks) {
        try {
            return [ JSON.parse(Buffer.concat(chunks).toString('utf8')) ]
        } catch (e) {
            assert(e instanceof SyntaxError)
            throw new Interrupt('parse', {
                statusCode: 502,
                code: 'EVPARSE'
            })
        }
    })
})

module.exports = function (options) {
    return new JsonParser(Array.prototype.slice.call(arguments))
}
