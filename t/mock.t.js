require('proof')(5, require('cadence')(prove))

function prove (async, assert) {
    var Interlocutor = require('interlocutor')
    var UserAgent = require('..')
    var responses = [
        function (request, response, next) {
            response.writeHead(200, 'ignore', { key: 'value' })
            response.end('foo')
            assert(response.getHeader('key'), 'value', 'get header')
        },
        function (request, response, next) {
            response.writeHead(200)
            response.end('foo')
        },
        function (response, response, next) {
            response.statusCode = 404
            response.end('foo')
        },
        function (response, response, next) {
            throw new Error
        }
    ]
    var interlocutor = new Interlocutor(require('connect')().use(function (request, response, next) {
        responses.shift()(request, response, next)
    }))
    var ua = new UserAgent().bind({ http: interlocutor, parse: 'json' })
    async(function () {
        ua.fetch({ url: '/' }, async())
    }, function (body, response, buffer) {
        assert(response.headers, { key: 'value' }, 'headers')
        ua.fetch({ url: '/' }, async())
    }, function (body, response, buffer) {
        assert(response.headers, {}, 'no headers')
        ua.fetch({ url: '/' }, async())
    }, function (body, response, buffer) {
        assert(response.statusCode, 404, 'not found')
        ua.fetch({ url: '/' }, async())
    }, function (body, response) {
        assert(response.statusCode, 500, 'huge error')
    })
}
