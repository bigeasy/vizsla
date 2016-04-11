var cadence = require('cadence')
var slice = [].slice
var stream = require('stream')
var util = require('util')

function Request (request) {
    this.headers = request.options.headers
    this.url = request.options.url
    this.method = request.options.method
    stream.PassThrough.call(this)
    this.end(request.payload)
}
util.inherits(Request, stream.PassThrough)

function Response () {
    this.headers = {}
    stream.PassThrough.call(this)
}
util.inherits(Response, stream.PassThrough)

Response.prototype.setHeader = function (name, value) {
    this.headers[name] = value
}

Response.prototype.getHeader = function (name) {
    return this.headers[name]
}

Response.prototype.writeHead = function (statusCode) {
    var vargs = slice.call(arguments, 1)
    if (typeof vargs[0] == 'string') {
        vargs.shift()
    }
    if (vargs.length) {
        for (var key in vargs[0]) {
            this.setHeader(key, vargs[0][key])
        }
    }
    this.statusCode = statusCode
}

function Transport (dispatch) {
    this._dispatch = dispatch
}

Transport.prototype.send = cadence(function (async, request) {
    var response = new Response
    async([function () {
        this._dispatch.call(null, new Request(request), response, function () {
            response.writeHead(404)
            response.end('')
        })
    }, function (error) {
        throw error
    }], function () {
        return [ response ]
    })
})

module.exports = Transport
