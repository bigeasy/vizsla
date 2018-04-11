var cadence = require('cadence')

var Parser = require('./parser')
var util = require('util')
var coalesce = require('extant')

function Nullify (when) {
    Parser.call(this, coalesce(when, [ -2 ]), [])
}
util.inherits(Nullify, Parser)

Nullify.prototype._parse = function (body, response, callback) {
    callback(null, null, response)
}

module.exports = function () {
    return new Nullify
}
