require('proof')(4, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')

    var bufferify = require('../bufferify')
    var requestify = require('./requestify')

    var gateway = bufferify({ when: [ 200 ] })

    var Descent = require('../descent')
    var descent

    async(function () {
        descent = new Descent([{
            gateways: [ gateway, requestify(new Error('stream'), { statusCode: 200 }) ]
        }])
        descent.descend(async())
    }, function (body, response) {
        okay(response, {
            statusCode: 502,
            statusMessage: 'Bad Gateway',
            headers: { 'content-type': 'application/json' },
            rawHeaders: [ 'content-type', 'application/json' ],
            trailers: null,
            type: {
                type: 'application',
                subtype: 'json',
                suffix: null,
                parameters: {}
            }
        }, 'error')
        okay(JSON.parse(body.read().toString()), 'Bad Gateway', 'body')
        descent = new Descent([{
            gateways: [ gateway, requestify(null, { statusCode: 404 }) ]
        }])
        descent.descend(async())
    }, function (body, response) {
        okay(body, null, 'response')
        okay(response, {
            statusCode: 404
        }, 'ignored response')
    })
}
