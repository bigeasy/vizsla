require('proof')(3, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')

    var bufferify = require('../bufferify')
    var requestify = require('./requestify')

    var gateway = bufferify({ when: [ 200 ] })

    var Descent = require('../descent')
    var descent

    async(function () {
        descent = new Descent([{
            gateways: [ gateway, requestify(new Error('stream'), { statusCode: 200 }).gateways.shift() ]
        }])
        descent.descend(async())
    }, function (body, response) {
        okay(response, {
            statusCode: 502,
            statusMessage: 'Bad Gateway',
            headers: { 'content-type': 'application/json' },
            rawHeaders: [ 'content-type', 'application/json' ],
            trailers: null
        }, 'error')
        descent = new Descent([{
            gateways: [ gateway, requestify(null, { statusCode: 404 }).gateways.shift() ]
        }])
        descent.descend(async())
    }, function (body, response) {
        okay(body, null, 'ignored')
        okay(response, {
            statusCode: 404
        }, 'ignored response')
    })
}
