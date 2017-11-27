var cadence = require('cadence')

function Nullify () {
}

Nullify.prototype.descend = cadence(function (async, descent) {
    async(function () {
        descent.descend(async())
    }, function (body, response) {
        // TODO Some way to always dump the stream.
        if (!response.okay) {
            return [ null ]
        } else {
            return [ body ]
        }
    })
})

module.exports = function () {
    return new Nullify
}
