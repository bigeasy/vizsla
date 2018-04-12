var cadence = require('cadence')
var interrupt = require('interrupt').createInterrupter('vizsla')
var Parser = require('./parser')
var util = require('util')
var coalesce = require('extant')
var stream = require('stream')

function Raiseify (when) {
    Parser.call(this, coalesce(when, [ -2 ]), [])
}
util.inherits(Raiseify, Parser)

Raiseify.prototype._parse = function (body, response, callback) {
    if (body instanceof stream.Readable) {
        body.resume()
    }
    callback(interrupt('error', response))
}

module.exports = function () {
    return new Raiseify
}
