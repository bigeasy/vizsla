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
    client.once('error', listener('request'))
    function listener (direction) {
        return function (error) {
            // What do to about? http://stackoverflow.com/a/16995223/90123
            console.error(direction + ' error', {
                url: request.options.url,
                headers: request.options.headers,
            })
            console.log(error.stack)
        }
    }
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
        response.once('error', listener('response'))
        return [ response, client ]
    })
})

module.exports = Transport
