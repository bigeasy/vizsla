require('proof')(6, require('cadence')(prove))

function prove (async, okay) {
    var http = require('http')
    var util = require('util')
    var stream = require('stream')
    var cc = require('../cc')
    var jsonify = require('../jsonify')
    var coalesce = require('extant')

    var responses = [{
        statusCode: 400,
        body: new Buffer('x')
    }, {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: new Buffer('{"token_type":"Bearer"}')
    }, {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: new Buffer('{"token_type":"Bearer","access_token":"x"}')
    }, {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: new Buffer('{}'),
        expect: 'Bearer x'
    }, {
        statusCode: 401,
        body: new Buffer('x')
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

    var Vizsla = require('..')
    var ua = new Vizsla

    async(function () {
        server.listen(8888, async())
    }, [function () {
        server.close(async())
    }], function () {
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            gateways: [ cc({ url: '/auth' }), jsonify({}) ]
        }, async())
    }, function (body, response) {
        okay(response.statusCode, 503, 'no password')
        ua.fetch({
            url: 'http://a:z@127.0.0.1:8888/endpoint',
            gateways: [ cc({ url: '/auth' }), jsonify({}) ]
        }, async())
    }, function (body, response) {
        okay(response.statusCode, 503, 'not okay')
        ua.fetch({
            url: 'http://a:z@127.0.0.1:8888/endpoint',
            gateways: [ cc({ url: '/auth' }), jsonify({}) ]
        }, async())
    }, function (body, response) {
        okay(response.statusCode, 503, 'no token')
        ua.fetch({
            url: 'http://a:z@127.0.0.1:8888/endpoint',
            gateways: [ cc({ url: '/auth' }), jsonify({}) ]
        }, async())
    }, function (body, response) {
        okay(body, {}, 'body')
        ua.fetch({
            url: 'http://a:z@127.0.0.1:8888/endpoint',
            gateways: [ cc({ url: '/auth' }), jsonify({}) ]
        }, async())
    }, function (body, response) {
        okay(response.statusCode, 401, 'expired')
    })
}