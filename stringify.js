var assert = require('assert')
var url = require('url')
var cadence = require('cadence')
var merge = require('./merge')
var defaultify = require('./default')
var typer = require('media-typer')
var Parser = require('./parser')
var util = require('util')
var bufferify = require('./bufferify')
var coalesce = require('extant')
var errorify = require('./errorify')

function Stringify (options) {
    Parser.call(this, options, [{ gateways: [ bufferify({ when: options.when }) ] }])
}
util.inherits(Stringify, Parser)

Stringify.prototype._parse = function (body, response, callback) {
    try {
        callback(null, body.toString(coalesce(response.type.parameters.charset, 'utf8')), response)
    } catch (error) {
        var errorified = errorify(502, {})
        callback(null, errorified[0], errorified[1])
    }
}

module.exports = function (options) {
    return new Stringify(options)
}
