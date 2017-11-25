var assert = require('assert')
var url = require('url')
var cadence = require('cadence')
var merge = require('./merge')
var defaultify = require('./defaultify')
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

Stringify.prototype._parse = cadence(function (async, body, response) {
    try {
        return [ body.toString(coalesce(response.type.parameters.charset, 'utf8')), response ]
    } catch (error) {
        return errorify(502, {})
    }
})

module.exports = function (options) {
    return new Stringify(options)
}
