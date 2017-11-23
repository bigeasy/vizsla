require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')

    var requestify = require('./requestify')
    var jsonify = require('../jsonify')

    var Descent = require('../descent')
    var descent

     var gateway = jsonify({ when: [ 200 ] })

    async(function () {
        descent = new Descent([{
            gateways: [ gateway, requestify('{}', {
                statusCode: 200,
                type: { type: 'application', subtype: 'json', parameters: {} }
            }).gateways.shift() ]
        }])
        descent.descend(async())
    }, function (body, response) {
        okay(body, {}, 'json parsed')
        descent = new Descent([{
            gateways: [ gateway, requestify('}', {
                statusCode: 200,
                type: { type: 'application', subtype: 'json', parameters: {} }
            }).gateways.shift() ]
        }])
        descent.descend(async())
    }, function (body, response) {
        okay(response.statusCode, 502, 'bad parse')
    })
}
