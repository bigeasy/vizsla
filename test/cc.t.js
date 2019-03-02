require('proof')(6, require('cadence')(prove))

function prove (async, okay) {
    var http = require('http')
    var util = require('util')
    var stream = require('stream')
    var cc = require('../cc')
    var coalesce = require('extant')

    var responses = [{
        statusCode: 400,
        body: Buffer.from('x')
    }, {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: Buffer.from('{"token_type":"Bearer"}')
    }, {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: Buffer.from('{"token_type":"Bearer","access_token":"x"}')
    }, {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: Buffer.from('{}'),
        expect: 'Bearer x'
    }, {
        statusCode: 401,
        body: Buffer.from('x')
    }]
    var server = http.createServer(function (request, response) {
        var send = responses.shift()
        if (send.expect) {
            okay(request.headers['authorization'], send.expect, 'token')
        }
        setTimeout(function () {
            response.writeHead(send.statusCode, coalesce(send.headers, {}))
            response.write(send.body)
            setTimeout(function () { response.end() }, 1)
        }, coalesce(send.timeout, 0))
    })

    var UserAgent = require('..')
    var ua = new UserAgent

    async(function () {
        server.listen(8888, async())
    }, [function () {
        server.close(async())
    }], function () {
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            negotiate: [ cc({ url: '/auth' }) ]
        }, async())
    }, function (body, response) {
        // TODO How would I know from logs that this is a configuration problem
        // and not a network problem?
        okay({
            statusCode: response.statusCode,
            body: body
        }, {
            statusCode: 503,
            body: null
        }, 'no password')
        ua.fetch({
            url: 'http://a:z@127.0.0.1:8888/endpoint',
            negotiate: [ cc({ url: '/auth' }) ]
        }, async())
    }, function (body, response) {
        okay({
            statusCode: response.statusCode,
            response: {
                statusCode: response.response.statusCode
            },
            body: body
        }, {
            statusCode: 502,
            response: { statusCode: 400 },
            body: null
        }, 'not okay')
        ua.fetch({
            url: 'http://a:z@127.0.0.1:8888/endpoint',
            negotiate: [  cc({ url: '/auth' }) ]
        }, async())
    }, function (body, response) {
        okay({
            statusCode: response.statusCode,
            body: body
        }, {
            statusCode: 502,
            body: null
        }, 'no token')
        ua.fetch({
            url: 'http://a:z@127.0.0.1:8888/endpoint',
            negotiate: [ cc({ url: '/auth' }) ],
            parse: 'json'
        }, async())
    }, function (body, response) {
        okay(body, {}, 'body')
        ua.fetch({
            url: 'http://a:z@127.0.0.1:8888/endpoint',
            negotiate: [ cc({ url: '/auth' }) ]
        }, async())
    }, function (body, response) {
        okay(response.statusCode, 401, 'expired')
    })
}
