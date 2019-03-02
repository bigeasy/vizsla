require('proof')(3, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')

    var raiseify = require('../raiseify')
    var requestify = require('./requestify')

    var delta = require('delta')

    var bufferify = require('../bufferify')

    var Descent = require('../descent')
    var descent

    async([function () {
        descent = new Descent([{
            gateways: [ raiseify(), requestify('x', {
                okay: false,
                statusCode: 500,
                statusCodeClass: 5,
                statusMessage: 'Internal Server Error',
                headers: { 'content-type': 'text/plain' }
            }) ]
        }])
        descent.descend(async())
    }, function (error) {
        okay(error.statusCode, 500, 'raiseified and resumed')
    }], [function () {
        descent = new Descent([{
            gateways: [ raiseify(), bufferify(), requestify('x', {
                okay: false,
                statusCode: 500,
                statusCodeClass: 5,
                statusMessage: 'Internal Server Error',
                headers: { 'content-type': 'text/plain' }
            }) ]
        }])
        descent.descend(async())
    }, function (error) {
        okay(error.statusCode, 500, 'raiseified')
    }], function () {
        descent = new Descent([{
            gateways: [ raiseify(), requestify('x', {
                statusCode: 200,
                statusCodeClass: 2
            }) ]
        }])
        descent.descend(async())
    }, function (body) {
        async(function () {
            delta(async()).ee(body).on('data', []).on('end')
        }, function (chunks) {
            okay(Buffer.concat(chunks).toString(), 'x', 'minimal ok body')
        })
    })
}
