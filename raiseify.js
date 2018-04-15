var cadence = require('cadence')
var interrupt = require('interrupt').createInterrupter('vizsla')
var Selector = require('./select')
var coalesce = require('extant')
var stream = require('stream')

function Raiseify (when) {
    this._select = Selector(coalesce(when, [ -2 ]))
}

Raiseify.prototype.descend = cadence(function (async, descent) {
    async(function () {
        descent.descend(async())
    }, function (body, response) {
        if (this._select.call(null, response)) {
            if (body instanceof stream.Readable) {
                body.resume()
            }
            throw interrupt('error', response)
        }
    })
})

module.exports = function () {
    return new Raiseify
}
