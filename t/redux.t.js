require('proof')(14, require('cadence')(prove))

function prove (async, okay) {
    var http = require('http')
    var coalesce = require('extant')
    var delta = require('delta')
    var responses = [{
        statusCode: 200,
        body: new Buffer('x')
    }, {
        statusCode: 200,
        body: new Buffer('x'),
        timeout: 1000
    }, {
        statusCode: 200,
        body: new Buffer('x'),
        expect: {},
        timeout: 0
    }, {
        statusCode: 200,
        expect: {},
        body: new Buffer('x')
    }]
    var server = http.createServer(function (request, response) {
        var send = responses.shift()
        if (send.expect) {
            var chunks = []
            request.on('data', function (data) {
                chunks.push(data)
            })
            request.on('end', function () {
                var buffer = Buffer.concat(chunks)
                if (typeof send.expect == 'object') {
                    okay(JSON.parse(buffer.toString()), send.expect, 'okay')
                } else {
                    okay(buffer.toString(), send.expect, 'okay')
                }
                done()
            })
        } else {
            done()
        }
        function done () {
            setTimeout(function () {
                response.writeHead(send.statusCode, coalesce(send.headers, {}))
                response.end(send.body)
            }, coalesce(send.timeout, 0))
        }
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
            gateways: [],
            timeout: 1000
        }, async())
    }, function (body, response) {
        okay(response.statusCode, 200, 'minimal ok')
        async(function () {
            delta(async()).ee(body).on('data', []).on('end')
        }, function (chunks) {
            okay(Buffer.concat(chunks).toString(), 'x', 'minimal ok body')
        })
    }, function () {
        ua.fetch({
            url: 'http://127.0.0.1:8889/endpoint',
            gateways: []
        }, async())
    }, function (body, response) {
        okay(response, {
            statusCode: 503,
            statusMessage: 'Service Unavailable',
            headers: {
                'x-vizsla-errno': 'ECONNREFUSED',
                'content-type': 'application/json'
            },
            rawHeaders: [
                'x-vizsla-errno', 'ECONNREFUSED',
                'content-type', 'application/json'
            ],
            trailers: null
        }, 'refused properties')
        okay(body, 'Service Unavailable', 'refused message')
        var fetch = ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            gateways: []
        }, async())
        fetch.cancel()
    }, function (body, response) {
        okay(response, {
            statusCode: 504,
            statusMessage: 'Gateway Timeout',
            headers: {
                'x-vizsla-errno': 'ECONNABORTED',
                'content-type': 'application/json'
            },
            rawHeaders: [
                'x-vizsla-errno', 'ECONNABORTED',
                'content-type', 'application/json'
            ],
            trailers: null
        }, 'cancel properties')
        okay(body, 'Gateway Timeout', 'cancel body')
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            gateways: [],
            timeout: 250
        }, async())
    }, function (body, response) {
        okay(response, {
            statusCode: 504,
            statusMessage: 'Gateway Timeout',
            headers: {
                'x-vizsla-errno': 'ETIMEDOUT',
                'content-type': 'application/json'
            },
            rawHeaders: [
                'x-vizsla-errno', 'ETIMEDOUT',
                'content-type', 'application/json'
            ],
            trailers: null
        }, 'cancel properties')
        okay(body, 'Gateway Timeout', 'cancel body')
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            gateways: [],
            post: {}
        }, async())
    }, function (body, response) {
        okay(response.statusCode, 200, 'post')
        async(function () {
            delta(async()).ee(body).on('data', []).on('end')
        }, function (chunks) {
            okay(Buffer.concat(chunks).toString(), 'x', 'minimal ok body')
        })
    }, function () {
        var fetch = ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            gateways: [],
            method: 'POST'
        }, async())
        fetch.input.end('{}')
    }, function (body, response) {
        okay(response.statusCode, 200, 'stream status code')
        async(function () {
            delta(async()).ee(body).on('data', []).on('end')
        }, function (chunks) {
            okay(Buffer.concat(chunks).toString(), 'x', 'stream body ok')
        })
    })
}
