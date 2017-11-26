require('proof')(20, require('cadence')(prove))

function prove (async, okay) {
    var http = require('http')
    var util = require('util')
    var stream = require('stream')

    var coalesce = require('extant')
    var delta = require('delta')

    var bufferify = require('../bufferify')

    function PseudoRequest (options) {
        stream.PassThrough.call(this)
    }
    util.inherits(PseudoRequest, stream.PassThrough)

    PseudoRequest.prototype.request = function (options) {
    }

    var pseudo = {
        request: function (options) {
            return pseudos.shift()(this, options)
        }
    }

    var pseudos = [function (options) {
        var request = new PseudoRequest(options)
        request.once('finish', function () {
            var response = new PseudoResponse({ statusCode: 200 })
            setImmediate(function () {
                request.emit('response', response)
                request.emit('error', new Error('response'))
            })
        })
        return request
    }, function (options) {
        var request = new PseudoRequest(options)
        /*
        var end = request.end
        request.end = function () {
            console.log('hello')
            request.emit('error', new Error('request'))
            end.call(request)
        }*/
            setImmediate(function () {
                request.emit('error', new Error('natural'))
                request.emit('error', new Error('abnormal'))
            })
        return request
    }]

    function PseudoResponse (send) {
        stream.PassThrough.call(this)
        this.statusCode = coalesce(send.statusCode, 200)
        this.statusMessage = coalesce(send.statusCode, http.STATUS_CODES[this.statusCode])
        this.headers = coalesce(send.headers, {})
        this.rawHeaders = []
        for (var key in this.headers) {
            this.rawHeaders.push(key, this.headers[key])
        }
    }
    util.inherits(PseudoResponse, stream.PassThrough)

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
    }, {
        statusCode: 200,
        body: new Buffer('z')
    }, {
        statusCode: 200,
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
    }, function () {
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            gateways: [ bufferify({ when: [ 200 ] }) ]
        }, async())
    }, function (body, response) {
        okay(response.statusCode, 200, 'buffer status code')
        okay(Buffer.isBuffer(body), 'buffer is buffer')
        okay(body.toString(), 'z', 'buffer body')
    }, function () {
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            http: pseudo,
            gateways: []
        }, async())
    }, [function (body, response) {
        delta(async()).ee(body).on('end')
    }, function (error) {
        okay(error.message, 'response', 'response error')
    }], function () {
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            http: pseudo,
            gateways: [],
            psot: {}
        }, async())
    }, function (body, response) {
        okay(response.statusCode, 503, 'error')
        var fetch = ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            gateways: []
        })
        fetch.response.wait(async())
    }, function (body, response) {
        okay(response.statusCode, 200, 'fetch signal')
    })
}
