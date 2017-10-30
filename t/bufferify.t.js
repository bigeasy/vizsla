require('proof')(3, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')
    var stream = require('stream')
    var bufferify = require('../bufferify')
    var plugin = bufferify({ when: [ 200 ] })
    async(function () {
        plugin.fetch(null, {
            url: 'http://127.0.0.1:8888/url',
            gateways: [{
                fetch: cadence(function (async) {
                    var through = new stream.PassThrough
                    setImmediate(function () {
                        through.emit('error', new Error('stream'))
                    })
                    return [ through, { statusCode: 200, headers: {} } ]
                })
            }]
        }, null, async())
    }, function (body, response) {
        okay(response, {
            statusCode: 502,
            statusMessage: 'Bad Gateway',
            headers: { 'content-type': 'application/json' },
            rawHeaders: [ 'content-type', 'application/json' ],
            trailers: null
        }, 'error')
        plugin.fetch(null, {
            url: 'http://127.0.0.1:8888/url',
            gateways: [{
                fetch: cadence(function (async) {
                    return [ null, { statusCode: 404 } ]
                })
            }]
        }, null, async())
    }, function (body, response) {
        okay(body, null, 'ignored')
        okay(response, {
            statusCode: 404
        }, 'ignored response')
    })
}
