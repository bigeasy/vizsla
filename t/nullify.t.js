require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')

    var nullify = require('../nullify')
    var requestify = require('./requestify')

    var delta = require('delta')

    var Descent = require('../descent')

    async(function () {
        new Descent([{
            gateways: [ nullify(), requestify('x', {
                statusCodeClass: 4
            }) ]
        }]).descend(async())
    }, function (body) {
        okay(body, null, 'nullified')
        new Descent([{
            gateways: [ nullify(), requestify('x', {
                statusCodeClass: 2
            }) ]
        }]).descend(async())
    }, function (body) {
        async(function () {
            delta(async()).ee(body).on('data', []).on('end')
        }, function (chunks) {
            okay(Buffer.concat(chunks).toString(), 'x', 'minimal ok body')
        })
    })
}
