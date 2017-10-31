var cadence = require('cadence')

var errorify = require('./errorify')

var coalesce = require('extant')
var createSelector = require('./select')
var util = require('util')

var stringify = require('./stringify')

var Parser = require('./parser')

function Jsonify (options) {
    options.when = [ 'content-type: application/json' ].concat(coalesce(options.when, []))
    Parser.call(this, options, [{ gateways: [ stringify({ when: options.when }) ] }])
}
util.inherits(Jsonify, Parser)

Jsonify.prototype._parse = function (body, response, callback) {
    try {
        callback(null,  JSON.parse(body.toString()), response)
    } catch (e) {
        var errorified = errorify(502, {})
        callback(null, errorified[0], errorified[1])
    }
}

module.exports = function (options) {
    return new Jsonify(options)
}
