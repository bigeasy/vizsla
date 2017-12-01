require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')

    var nullify = require('../nullify')
    var requestify = require('./requestify')

    var delta = require('delta')

    var Descent = require('../descent')
    var descent

    async(function () {
        descent = new Descent([{
            gateways: [ nullify(), requestify('x', {
                okay: false
            }) ]
        }])
        descent.descend(async())
    }, function (body) {
        okay(body, null, 'nullified')
        descent = new Descent([{
            gateways: [ nullify(), requestify('x', {
                okay: true
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
