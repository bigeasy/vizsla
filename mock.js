var cadence = require('cadence')
var stream = require('stream')
var util = require('util')
var delta = require('delta')
var events = require('events')
var Interlocutor = require('interlocutor')

function Transport (middleware) {
    this._interlocutor = new Interlocutor(middleware)
}

Transport.prototype.send = cadence(function (async, request) {
    var client = this._interlocutor.request(request.options)
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
        if (request.timeout) {
            client.setTimeout(request.timeout, function () {
                client.abort()
            })
        }
        request.input.pipe(client)
    }, function (response) {
        response.once('error', listener('response'))
        return [ response, client ]
    })
})

module.exports = Transport
