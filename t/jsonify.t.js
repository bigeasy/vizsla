require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')

    var requestify = require('./requestify')
    var jsonify = require('../jsonify')

    var gateway = jsonify({ when: [ 200 ] })

    async(function () {
        gateway.fetch(null, requestify('{}', {
            statusCode: 200,
            type: { type: 'application', subtype: 'json', parameters: {} }
        }), null, async())
    }, function (body, response) {
        okay(body, {}, 'json parsed')
        gateway.fetch(null, requestify('}', {
            statusCode: 200,
            type: { type: 'application', subtype: 'json', parameters: {} }
        }), null, async())
    }, function (body, response) {
        okay(response.statusCode, 502, 'bad parse')
    })
}
