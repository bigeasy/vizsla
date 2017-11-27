var cadence = require('cadence')

var byline = require('byline')
var errorify = require('./errorify')

var coalesce = require('extant')
var createSelector = require('./select')
var util = require('util')

var JsonStream = require('./jsons')

var Parser = require('./parser')

function Jsonpify (options) {
    options.when = [ 'content-type: application/json-stream' ].concat(coalesce(options.when, []))
    Parser.call(this, options, [])
}
util.inherits(Jsonpify, Parser)

Jsonpify.prototype._parse = cadence(function (async, body, response) {
    return [ body.pipe(byline()).pipe(new JsonStream()), response ]
})

module.exports = function (options) {
    return new Jsonpify(options)
}
