var cadence = require('cadence')
var coalesce = require('extant')
var errorify = require('./errorify')
var jsonify = require('./jsonify')

function ClientCredentials (request) {
    this._request = coalesce(request, { url: '/token' })
}

ClientCredentials.prototype.descend = cadence(function (async, descent) {
    if (descent.storage.cc == null) {
        descent.storage.cc = {}
    }
    var request = descent.request()
    var label = async(function () {
        if (descent.storage.cc[request.identifier] == null) {
            if (request.url.auth == null) {
                return [ label.break ].concat(errorify(503, {}))
            }
            async(function () {
                descent.fetch(this._request, {
                    headers: {
                        authorization: 'Basic ' + new Buffer(request.url.auth).toString('base64')
                    },
                    post: {
                        grant_type: 'client_credentials'
                    },
                    gateways: [ jsonify(), null ]
                }).response.wait(async())
            }, function (body, response) {
                if (!response.okay) {
                    return [ label.break ].concat(errorify(response.statusCode, {}))
                } else if (
                    response.headers['content-type'] != 'application/json' ||
                    body.token_type != 'Bearer' ||
                    body.access_token == null
                ) {
                    return [ label.break ].concat(errorify(502, {}))
                }
                descent.storage.cc[request.identifier] = body.access_token
            })
        }
    }, function () {
        descent.merge([{ headers: { 'authorization': 'Bearer ' + descent.storage.cc[request.identifier] } }])
        descent.descend(async())
    }, function (body, response) {
        if (response.statusCode == 401) {
            delete descent.storage.cc[request.identifier]
        }
        return [ label.break, body, response ]
    })()
})

module.exports = function (options) {
    return new ClientCredentials(options)
}
