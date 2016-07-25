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
})

module.exports = Transport
