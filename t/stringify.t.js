require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')

    var stringify = require('../stringify')
    var requestify = require('./requestify')

    var gateway = stringify({ when: [ 200 ] })

    async(function () {
        gateway.fetch(null, requestify('x', { statusCode: 200, type: { parameters: {} } }), null, async())
    }, function (body, response) {
        okay(body, 'x', 'string parsed')
        gateway.fetch(null, requestify('x', { statusCode: 200, type: { parameters: { charset: 'steve' } } }), null, async())
    }, function (body, response) {
        okay(response.statusCode, 502, 'cannot parse')
    })
}
