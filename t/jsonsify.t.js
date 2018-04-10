require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')

    var jsonsify = require('../jsonsify')
    var requestify = require('./requestify')

    var delta = require('delta')
    var gateway = jsonsify([ 200 ])

    var Descent = require('../descent')
    var descent

    async(function () {
        descent = new Descent([{
            gateways: [ gateway, requestify('{}\n', {
                statusCode: 200,
                type: {
                    type: 'application',
                    subtype: 'json-stream'
                }
            }) ]
        }])
        descent.descend(async())
    }, function (body, response) {
        delta(async()).ee(body).on('data', []).on('end')
    }, function (data) {
        okay(data, [{}], 'json')
    })
}
