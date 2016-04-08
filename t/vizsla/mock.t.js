require('proof')(3, require('cadence')(prove))

function prove (async, assert) {
    var UserAgent = require('../..')
    var Transport = require('../../mock')
    var responses = [
        function (request, response, next) {
            response.writeHead(200, 'ignore', { key: 'value' })
            response.end('foo')
            assert(response.getHeader('key'), 'value', 'get header')
            next()
        },
        function (request, response, next) {
            response.writeHead(200)
            response.end('foo')
            next()
        }
    ]
    var transport = new Transport(function (request, response, next) {
        responses.shift()(request, response, next)
    })
    var ua = new UserAgent({ transport: transport })
    async(function () {
        ua.fetch({ url: '/' }, async())
    }, function (body, response, buffer) {
        assert(response.headers, { key: 'value' }, 'headers')
        ua.fetch({ url: '/' }, async())
    }, function (body, response, buffer) {
        assert(response.headers, {}, 'no headers')
    })
}
