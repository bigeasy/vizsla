var cadence = require('cadence')
var errorify = require('./errorify')
var delta = require('delta')
var util = require('util')
var Parser = require('./parser')

function Bufferify (options) {
    Parser.call(this, options, [])
}
util.inherits(Bufferify, Parser)

Bufferify.prototype._parse = cadence(function (async, body, response) {
    async([function () {
        delta(async()).ee(body).on('data', []).on('end')
    }, function (error) {
        // TODO Maybe report stack here.
        return [ async.break ].concat(errorify(502, {}))
    }], function (chunks) {
        return [ Buffer.concat(chunks), response ]
    })
})

module.exports = function (options) {
    return new Bufferify(options)
}
