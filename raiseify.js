var cadence = require('cadence')
var interrupt = require('interrupt').createInterrupter('vizsla')

function Nullify () {
}

Nullify.prototype.descend = cadence(function (async, descent) {
    async(function () {
        descent.descend(async())
    }, function (body, response) {
        // TODO Some way to always dump the stream.
        // TODO How about returning the request that caused this mess in the
        // response so you can add it to the raised error.
        if (!response.okay) {
            throw interrupt('error', {
                statusCode: response.statusCode,
                statusMessage: response.statusMessage,
                headers: response.headers
            })
        } else {
            return [ body ]
        }
    })
})

module.exports = function () {
    return new Nullify
}
