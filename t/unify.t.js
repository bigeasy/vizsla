require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var Descent = require('../descent')
    var requestify = require('./requestify')
    var unify = require('../unify')
    var delta = require('delta')
    async(function () {
        var descent = new Descent([{
            gateways: [ unify(), requestify('x', { okay: false }) ]
        }])
        descent.descend(async())
    }, function () {
        okay(arguments.length, 1, 'length')
        delta(async()).ee(arguments[0]).on('data', []).on('end')
    }, function (data) {
        okay(data.toString(), 'x', 'data')
    })
}
