var cadence = require('cadence')
var delta = require('delta')

function Transport () {
}

Transport.prototype.send = cadence(function (async, request) {
    var http
    if (request.url.protocol == 'https:') {
        http = require('https')
    } else {
        http = require('http')
    }
    var client = http.request(request.options)
    async(function () {
        delta(async()).ee(client).on('response')
        if (request.payload) {
            client.write(request.payload)
        }
        if (request.timeout) {
            client.setTimeout(request.timeout, function () {
                client.abort()
            })
        }
        client.end()
    }, function (response) {
        client.once('error', function (stack) {
            // What do to about? http://stackoverflow.com/a/16995223/90123
            console.error('request swallowed error', {
                url: request.url,
                headers: request.headers,
                stack: error.stack
            })
        })
        return [ response ]
    })
})

module.exports = Transport
