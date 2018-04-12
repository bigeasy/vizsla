var cadence = require('cadence')
var errorify = require('./errorify')
var delta = require('delta')
var util = require('util')
var Parser = require('./parser')
var coalesce = require('extant')

function Bufferify (when) {
    Parser.call(this, coalesce(when, []))
}
util.inherits(Bufferify, Parser)

Bufferify.prototype._parse = cadence(function (async, body, response) {
    async([function () {
        delta(async()).ee(body).on('data', []).on('end')
    }, function (error) {
        // TODO Maybe report stack here.
        // TODO Yes, you could really have an error here. If you do, you're
        // going to want to log the error or pass it up to be logged. Your idea
        // was that this would be middleware and that the errors would be
        // logged. There's not much for one to do about a truncated stream at
        // the application level with HTTP except to retry.
        return [ async.break ].concat(errorify(response, 502, {}))
    }], function (chunks) {
        return [ Buffer.concat(chunks), response ]
    })
})

module.exports = function (options) {
    return new Bufferify(options)
}
