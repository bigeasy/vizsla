var cadence = require('cadence')
var Parser = require('./parser')
var util = require('util')
var bufferify = require('./bufferify')
var coalesce = require('extant')
var errorify = require('./errorify')

function Stringify (when) {
    when = coalesce(when, [])
    Parser.call(this, when, [{ gateways: [ bufferify(when) ] }])
}
util.inherits(Stringify, Parser)

Stringify.prototype._parse = cadence(function (async, body, response) {
    try {
        return [ body.toString(coalesce(response.type.parameters.charset, 'utf8')), response ]
    } catch (error) {
        return errorify(response, 502, {})
    }
})

module.exports = function (options) {
    return new Stringify(options)
}
