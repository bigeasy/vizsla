require('proof')(4, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')

    var bufferify = require('../bufferify')
    var requestify = require('./requestify')

    var gateway = bufferify([ 200 ])

    var Descent = require('../descent')
    var descent

    async(function () {
        descent = new Descent([{
            gateways: [ gateway, requestify(new Error('stream'), { statusCode: 200 }) ]
        }])
        descent.descend(async())
    }, function (body, response) {
        okay(response, {
            stage: 'parse',
            via: { statusCode: 200 },
            statusCode: 502,
            statusMessage: 'Bad Gateway',
            headers: { 'content-type': 'vizsla/null' },
            rawHeaders: [ 'content-type', 'vizsla/null' ],
            trailers: null,
            type: {
                type: 'vizsla',
                subtype: 'null',
                suffix: null,
                parameters: {}
            }
        }, 'error')
        okay(body, null, 'body')
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
