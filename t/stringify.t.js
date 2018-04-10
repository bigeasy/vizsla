require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')

    var stringify = require('../stringify')
    var requestify = require('./requestify')

    var gateway = stringify([ 200 ])

    var Descent = require('../descent')
    var descent

    async(function () {
        descent = new Descent([{
            gateways: [ gateway, requestify('x', {
                statusCode: 200,
                type: { parameters: {} }
            }) ]
        }])
        descent.descend(async())
    }, function (body, response) {
        okay(body, 'x', 'string parsed')
        descent = new Descent([{
            gateways: [ gateway, requestify('x', {
                statusCode: 200,
                type: { parameters: { charset: 'steve' } }
            }) ]
        }])
        descent.descend(async())
    }, function (body, response) {
        okay(response.statusCode, 502, 'cannot parse')
    })
}
