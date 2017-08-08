var cadence = require('cadence')
var delta = require('delta')
var extractOptions = require('./options')

module.exports = cadence(function (async, http, request, cancel) {
    var options = extractOptions(request)
    var client = http.request(options)
    client.once('error', listener('request'))
    function listener (direction) {
        return function (error) {
            // What do to about? http://stackoverflow.com/a/16995223/90123
            console.error(direction + ' error', {
                url: request.url,
                headers: request.headers,
            })
            console.log(error.stack)
        }
    }
    async(function () {
        var wait = delta(async()).ee(client).on('response')
        cancel.wait(function () {
            request.input.unpipe()
            client.abort()
            var error = new Error('socket hang up')
            error.code = 'ECONNRESET'
            wait.cancel([ error ])
        })
        if (request.timeout) {
            client.setTimeout(request.timeout, function () { cancel.unlatch() })
        }
        // TODO Fetch and Reqest can have the same `PassThrough`.
        request.input.pipe(client)
    }, function (response) {
        response.once('error', listener('response'))
        return [ response, client ]
    })
})
