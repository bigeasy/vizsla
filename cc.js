var assert = require('assert')
var url = require('url')
var cadence = require('cadence')
var merge = require('./merge')
var defaultify = require('./default')
var Converter = require('./converter')

function ClientCredentials (request) {
    this._request = request
}

ClientCredentials.prototype.fetch = cadence(function (async, ua, request, fetch) {
    var expanded = defaultify(request)
    if (ua.storage.cc == null) {
        ua.storage.cc = {}
    }
    var label = async(function () {
        if (ua.storage.cc[expanded.identifier] == null) {
            async(function () {
                ua.fetch(request, this._request, {
                    headers: {
                        authorization: 'Basic ' + new Buffer(expanded.url.auth).toString('base64')
                    },
                    post: {
                        grant_type: 'client_credentials'
                    },
                    url: '/token',
                    response: 'parse',
                    plugins: [ null ]
                }, async())
            }, function (body, response, buffer) {
                if (!response.okay || body.token_type != 'Bearer' || body.access_token == null) {
                    return [ label.break, new Converter(response.headers, buffer, 'buffer'), response ]
                }
                ua.storage.cc[expanded.identifier] = body.access_token
            })
        }
    }, function () {
        request = merge(request, [{ token: ua.storage.cc[expanded.identifier] }])
        request.plugins.shift().fetch(ua, request, fetch, async())
    }, function (body, response) {
        if (response.statusCode == 401) {
            delete ua.storage.cc[expanded.identifier]
        }
        return [ label.break ].concat(Array.prototype.slice.call(arguments))
    })()
})

module.exports = ClientCredentials
