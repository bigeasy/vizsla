require('proof')(31, require('cadence')(prove))

function prove (async, okay) {
    var http = require('http')
    var util = require('util')
    var stream = require('stream')

    var extra = false

    var coalesce = require('extant')
    var delta = require('delta')

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
        body: new Buffer('x')
    }, {
        statusCode: 200,
        body: new Buffer('x')
    }, {
        statusCode: 200,
        body: new Buffer('x')
    }, {
        statusCode: 200,
        body: new Buffer('[]'),
        headers: {
            'content-type': 'application/json'
        }
    }, {
        statusCode: 200,
        body: new Buffer('[]'),
        headers: {
            'content-type': 'application/json'
        }
    }, {
        statusCode: 200,
        body: new Buffer('{}\n'),
        headers: {
            'content-type': 'application/json-stream'
        }
    }, {
        statusCode: 200,
        body: new Buffer('hello, world'),
        headers: {
            'content-type': 'text/plain'
        }
    }, {
        statusCode: 200,
        body: new Buffer('x'),
        timeout: 1000
    }, {
        statusCode: 404,
        body: new Buffer('x')
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
    }, {
        statusCode: 200,
        body: new Buffer('a'),
        timeout: 250
    }, {
        statusCode: 200,
        cancel: true
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
            if (send.cancel) {
                response.writeHead(send.statusCode, coalesce(send.headers, {}))
                response.write('a')
                setTimeout(function () {
                    response.socket.destroy()
                }, 100)
            } else {
                setTimeout(function () {
                    response.writeHead(send.statusCode, coalesce(send.headers, {}))
                    response.write(send.body)
                    setTimeout(function () { response.end() }, 1)
                }, coalesce(send.timeout, 0))
            }
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
            parse: null,
            timeout: 1000
        }, async())
    }, function (body, response) {
        okay(response.statusCode, 200, 'null parse ok')
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint'
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
            url: 'http://127.0.0.1:8888/endpoint',
            parse: 'stream'
        }, async())
    }, function (body, response) {
        async(function () {
            delta(async()).ee(body).on('data', []).on('end')
        }, function (chunks) {
            okay(Buffer.concat(chunks).toString(), 'x', 'parse stream')
        })
    }, function () {
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            parse: 'dump'
        }, async())
    }, function (body, response) {
        okay({
            body: body,
            statusCode: response.statusCode
        }, {
            body: null,
            statusCode: 200
        }, 'dump')
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            parse: 'json'
        }, async())
    }, function (body, response) {
        okay({
            body: body,
            isArray: Array.isArray(body),
            response: !! response
        }, {
            body: {},
            isArray: true,
            response: true
        }, 'json')
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            parse: [ Vizsla.json(200) ],
            nullify: true
        }, async())
    }, function () {
        okay(arguments.length, 1, 'nullify')
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            parse: 'jsons'
        }, async())
    }, function (body) {
        async(function () {
            delta(async()).ee(body).on('data', []).on('end')
        }, function (jsons) {
            okay(jsons, [{}], 'jsons')
        })
    }, function () {
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            parse: 'text'
        }, async())
    }, function (body) {
        okay(body, 'hello, world', 'explicit text')
        ua.fetch({
            url: 'http://127.0.0.1:8889/endpoint'
        }, async())
    }, function (body, response) {
        okay(response, {
            stage: 'negotiation',
            statusCode: 503,
            statusMessage: 'Service Unavailable',
            code: 'ECONNREFUSED',
            headers: {},
            rawHeaders: [],
            trailers: null,
            type: null
        }, 'refused properties')
        okay(body, null, 'refused message')
        var fetch = ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            negotiate: []
        }, async())
        fetch.cancel()
    }, function (body, response) {
        okay(response, {
            stage: 'negotiation',
            statusCode: 504,
            statusMessage: 'Gateway Timeout',
            code: 'ECONNABORTED',
            headers: {},
            rawHeaders: [],
            trailers: null,
            type: null,
        }, 'cancel properties')
        okay(body, null, 'cancel body')
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            timeout: 250
        }, async())
    }, function (body, response) {
        okay(response, {
            stage: 'negotiation',
            statusCode: 504,
            statusMessage: 'Gateway Timeout',
            headers: {},
            rawHeaders: {},
            code: 'ETIMEDOUT',
            trailers: null,
            type: null,
        }, 'timeout properties')
        okay(body, null, 'timeout body')
    }, [function () {
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            parse: 'json',
            raise: true
        }, async())
    }, function (error) {
        okay(error.statusCode, 404, 'raise')
    }], function (body, response) {
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            negotiate: [],
            parse: null,
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
            parse: 'buffer'
        }, async())
    }, function (body, response) {
        okay(response.statusCode, 200, 'buffer status code')
        okay(Buffer.isBuffer(body), 'buffer is buffer')
        okay(body.toString(), 'z', 'buffer body')
    }, function () {
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            http: pseudo,
            negotiate: [],
            parse: null
        }, async())
    }, [function (body, response) {
        delta(async()).ee(body).on('end')
    }, function (error) {
        okay(error.message, 'response', 'response error')
    }], function () {
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            http: pseudo,
            negotiate: [],
            parse: null,
            post: {}
        }, async())
    }, function (body, response) {
        okay(response.statusCode, 503, 'error')
        var fetch = ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint'
        })
        fetch.response.wait(async())
    }, function (body, response) {
        okay(response.statusCode, 200, 'fetch signal')
        var fetch
        async(function () {
            extra = true
            fetch = ua.fetch({
                url: 'http://127.0.0.1:8888/endpoint'
            }, async())
        }, [function (body, response) {
            body.resume()
            delta(async()).ee(body).on('end')
            fetch.cancel()
        }, function (error) {
            okay(error.code, 'ECONNABORTED', 'abort response')
        }])
    } , function () {
        var fetch
        async(function () {
            fetch = ua.fetch({
                url: 'http://127.0.0.1:8888/endpoint'
            }, async())
        }, [function (body, response) {
            body.resume()
            delta(async()).ee(body).on('end')
            fetch.cancel()
        }, function (error) {
            okay(error.code, 'ECONNABORTED', 'abort response at server')
        }])
    } , function () {
        okay(true, 'done')
    })
}
