var cadence = require('cadence')

var errorify = require('./errorify')

var coalesce = require('extant')
var util = require('util')

var stringify = require('./stringify')

var Parser = require('./parser')

function Jsonify (when) {
    when = coalesce(when, [ 'content-type: application/json' ])
    Parser.call(this, when, [{ gateways: [ stringify(when) ] }])
}
util.inherits(Jsonify, Parser)

Jsonify.prototype._parse = cadence(function (async, body, response) {
    try {
        return [ JSON.parse(body.toString()), response ]
    } catch (e) {
        return  errorify(502, {})
    }
})

module.exports = function (options) {
    return new Jsonify(options)
}
