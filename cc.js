var cadence = require('cadence')
var coalesce = require('extant')

function ClientCredentials (request) {
    this._request = coalesce(request, { url: '/token' })
}

ClientCredentials.prototype.descend = cadence(function (async, descent) {
    if (descent.storage.cc == null) {
        descent.storage.cc = {}
    }
    var request = descent.request()
    async(function () {
        if (descent.storage.cc[request.identifier] == null) {
            if (request.url.auth == null) {
                throw 503
            }
            async(function () {
                descent.fetch(this._request, {
                    headers: {
                        authorization: 'Basic ' + new Buffer(request.url.auth).toString('base64')
                    },
                    post: {
                        grant_type: 'client_credentials'
                    },
                    _parse: 'json'
                }).response.wait(async())
            }, function (body, response) {
                if (!response.okay) {
                    throw { statusCode: 502, response: response, stage: 'negotiation' }
                } else if (
                    body.token_type != 'Bearer' ||
                    body.access_token == null
                ) {
                    throw { statusCode: 502, response: response, stage: 'negotiation' }
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
        return [ body, response ]
    })
})

module.exports = function (options) {
    return new ClientCredentials(options)
}
