var stream = require('stream')
var cadence = require('cadence')

module.exports = function (value, response) {
    var through = new stream.PassThrough
    return {
        fetch: cadence(function (async) {
            if (value == null) {
                return [ value, response ]
            }
            var through = new stream.PassThrough
            setImmediate(function () {
                if (value instanceof Error) {
                    through.emit('error', new Error('stream'))
                } else {
                    through.end(value)
                }
            })
            return [ through, response ]
        })
    }
}
