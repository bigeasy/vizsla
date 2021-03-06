var cadence = require('cadence')
var coalesce = require('extant')

function ClientCredentials (request) {
    this._request = coalesce(request, { url: '/token' })
}

ClientCredentials.prototype.descend = cadence(function (async, descent) {
    if (descent.ua.storage.cc == null) {
        descent.ua.storage.cc = {}
    }
    var properties = descent.properties()
    async(function () {
        if (descent.ua.storage.cc[properties.identifier] == null) {
            if (properties.url.auth == null) {
                throw {
                    statusCode: 502,
                    code: 'EACCES',
                    module: 'vizsla/cc'
                }
            }
            async(function () {
                descent.fetch(this._request, {
                    headers: {
                        authorization: 'Basic ' + Buffer.from(properties.url.auth).toString('base64')
                    },
                    post: {
                        grant_type: 'client_credentials'
                    },
                    parse: 'json',
                    raise: true
                }).response.wait(async())
            }, function (body, response) {
                if (
                    body.token_type != 'Bearer' ||
                    body.access_token == null
                ) {
                    throw {
                        statusCode: 502, stage: 'negotiation'
                    }
                }
                descent.ua.storage.cc[properties.identifier] = body.access_token
            })
        }
    }, function () {
        descent.merge([{ headers: { 'authorization': 'Bearer ' + descent.ua.storage.cc[properties.identifier] } }])
        descent.descend(async())
    }, function (body, response) {
        if (response.statusCode == 401) {
            delete descent.ua.storage.cc[properties.identifier]
        }
        return [ body, response ]
    })
})

module.exports = function (options) {
    return new ClientCredentials(options)
}
