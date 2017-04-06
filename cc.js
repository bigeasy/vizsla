var assert = require('assert')
var url = require('url')
var stream = require('stream')
var cadence = require('cadence')

function ClientCredentials (ua) {
    ua.storage.cc = {}
}

ClientCredentials.prototype.before = cadence(function (async, ua, request) {
    if (ua.storage.cc[request.key] != null) {
        request.options.headers.authorization = 'Bearer ' + ua.storage.cc[request.key]
        return [ null ]
    }
    assert(request.baseUrl.auth)
    async(function () {
        ua.fetch({
            url: url.format(request.url),
            ca: request.options.ca,
            rejectUnauthorized: request.options.rejectUnauthorized,
            timeout: request.timeout
        }, {
            url: '/token',
            headers: {
                authorization: 'Basic ' + new Buffer(request.baseUrl.auth).toString('base64')
            },
            payload: {
                grant_type: 'client_credentials'
            }
        }, async())
    }, function (body, response) {
        if (!response.okay || body.token_type != 'Bearer' || body.access_token == null) {
            var through = new stream.PassThrough
            if (response.headers['content-type'] == 'application/json') {
                through.end(JSON.stringify(body))
            } else {
                through.end('{}')
            }
            switch (request.response) {
            case 'parse':
                return {
                    body: JSON.parse(through.read().toString()),
                    response: response
                }
            case 'stream':
                return {
                    body: through,
                    response: response
                }
            case 'buffer':
                return {
                    body: through.read(),
                    response: response
                }
            }
        }
        ua.storage.cc[request.key] = body.access_token
        request.options.headers.authorization = 'Bearer ' + ua.storage.cc[request.key]
        return [ null ]
    })
})

ClientCredentials.prototype.after = cadence(function (async, ua, request, response) {
    if (response.statusCode == 401) {
        delete ua.storage.cc[request.key]
    }
    return [ null ]
})

module.exports = ClientCredentials
