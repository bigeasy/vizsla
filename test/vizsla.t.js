require('proof')(37, require('cadence')(prove))

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

    var responses = []
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
            request.resume()
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
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('x')
        })
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint-z',
            parse: null,
            timeout: 1000
        }, async())
    }, function (body, response) {
        okay(response.statusCode, 200, 'null parse ok')
        // body.resume()
        // body.on('end', function () { console.log('ended') })
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('x')
        })
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
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('x'),
            name: 'steve'
        })
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
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('[]'),
            headers: {
                'content-type': 'application/json'
            }
        })
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
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('[]'),
            headers: {
                'content-type': 'application/json',
                'x-hunky-dory': 'yes'
            }
        })
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            parse: {
                statusCode: 200,
                headers: {
                    'x-hunky-dory': /^yes$/,
                    'content-type': 'application/json'
                },
                parser: 'json'
            }
        }, async())
    }, function (body, response) {
        okay({
            body: body,
            isArray: Array.isArray(body),
            response: !! response
        }, {
            body: [],
            isArray: true,
            response: true
        }, 'json')
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('[]'),
            headers: {
                'content-type': 'application/json'
            }
        })
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            parse: {
                statusCode: 200,
                parser: 'json'
            }
        }, async())
    }, function (body, response) {
        okay({
            body: body,
            isArray: Array.isArray(body),
            response: !! response
        }, {
            body: [],
            isArray: true,
            response: true
        }, 'constructed parser')
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('[]'),
            headers: {
                'content-type': 'application/json'
            }
        })
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            parse: [ 'json' ]
        }, async())
    }, function (body, response) {
        okay({
            body: body,
            isArray: Array.isArray(body),
            response: !! response
        }, {
            body: [],
            isArray: true,
            response: true
        }, 'array of parsers')
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('x')
        })
    }, [function () {
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            parse: 'fred'
        }, async())
    }, function (error) {
        okay(/^vizsla#unknown:parser$/m.test(error.message), 'unknown parser')
    }], function () {
        responses.unshift({
            statusCode: 500,
            body: Buffer.from('x')
        })
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            parse: 'json',
            nullify: true
        }, async())
    }, function () {
        okay(arguments.length, 1, 'nullify')
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('['),
            headers: {
                'content-type': 'application/json'
            }
        })
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            parse: 'json'
        }, async())
    }, function (body, response) {
        okay({
            body: body,
            response: response.statusCode,
            code: 'EVPARSE'
        }, {
            body: null,
            response: 502,
            code: 'EVPARSE'
        }, 'bad json')
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('{}\n'),
            headers: {
                'content-type': 'application/json-stream'
            }
        })
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
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('hello, world'),
            headers: {
                'content-type': 'text/plain'
            }
        })
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
            stage: 'request',
            statusCode: 502,
            statusMessage: 'Bad Gateway',
            code: 'ECONNREFUSED',
            okay: false,
            request: {
                headers: { accept: 'application/json' },
                host: '127.0.0.1',
                port: '8889',
                path: '/endpoint',
                method: 'GET'
            },
            response: null
        }, 'refused properties')
        okay(body, null, 'refused message')
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('x'),
            timeout: 1000
        })
        var fetch = ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            negotiate: []
        }, async())
        setTimeout(function () { fetch.cancel() }, 250)
    }, function (body, response) {
        okay(response, {
            stage: 'request',
            statusCode: 502,
            statusMessage: 'Bad Gateway',
            code: 'ECONNABORTED',
            okay: false,
            request: {
                headers: { accept: 'application/json' },
                host: '127.0.0.1',
                port: '8888',
                path: '/endpoint',
                method: 'GET'
            },
            response: null
        }, 'cancel properties')
        okay(body, null, 'cancel body')
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('x'),
            timeout: 1000
        })
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            timeout: 250
        }, async())
    }, function (body, response) {
        okay(response, {
            stage: 'request',
            statusCode: 502,
            statusMessage: 'Bad Gateway',
            code: 'ETIMEDOUT',
            okay: false,
            request: {
                headers: { accept: 'application/json' },
                host: '127.0.0.1',
                port: '8888',
                path: '/endpoint',
                method: 'GET'
            },
            response: null
        }, 'timeout properties')
        okay(body, null, 'timeout body')
    }, [function () {
        responses.unshift({
            statusCode: 404,
            body: Buffer.from('x')
        })
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            parse: 'json',
            raise: true
        }, async())
    }, function (error) {
        console.log(error.stack)
        okay(error.statusCode, 404, 'raise')
    }], function (body, response) {
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('x'),
            expect: {},
            timeout: 0
        })
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
        responses.unshift({
            statusCode: 200,
            expect: {},
            body: Buffer.from('x')
        })
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
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('z')
        })
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
        console.log(error.stack)
        okay(error.causes[0].message, 'response', 'response error')
    }], function () {
        ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint',
            http: pseudo,
            negotiate: [],
            parse: null,
            post: {}
        }, async())
    }, function (body, response) {
        okay(response, {
            stage: 'request',
            statusCode: 502,
            statusMessage: 'Bad Gateway',
            code: 'natural',
            okay: false,
            request: {
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'content-length': 2
                },
                host: '127.0.0.1',
                port: '8888',
                path: '/endpoint',
                method: 'POST',
                body: {}
            },
            response: null
        }, 'error event')
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('x')
        })
        var fetch = ua.fetch({
            url: 'http://127.0.0.1:8888/endpoint'
        })
        fetch.response.wait(async())
    }, function (body, response) {
        okay(response.statusCode, 200, 'fetch signal')
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('a'),
            timeout: 250
        })
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
            okay(error.truncate.code, 'ECONNABORTED', 'abort response')
        }])
    } , function () {
        var fetch
        responses.unshift({
            statusCode: 200,
            cancel: true
        })
        async(function () {
            fetch = ua.fetch({
                url: 'http://127.0.0.1:8888/endpoint'
            }, async())
        }, [function (body, response) {
            body.resume()
            delta(async()).ee(body).on('end')
            fetch.cancel()
        }, function (error) {
            okay(error.truncate.code, 'ECONNABORTED', 'abort response at server')
        }])
    } , function () {
        responses.unshift({
            statusCode: 200,
            body: Buffer.from('x'),
            timeout: 250
        })
        async(function () {
            ua.fetch({
                url: 'http://127.0.0.1:8888/endpoint',
            }, async())
            setTimeout(function () { ua.destroy() }, 50)
        }, function (body, response) {
            console.log(response)
            okay(response.code, 'ECONNABORTED', 'destroy and cancel')
        })
    } , function () {
        async(function () {
            ua.fetch({
                url: 'http://127.0.0.1:8888/endpoint-x',
            }, async())
        }, function (body, response) {
            okay({
                statusCode: response.statusCode,
                code: response.code
            }, {
                statusCode: 502,
                code: 'ECONNABORTED'
            }, 'after destruction')
        })
    } , function () {
        okay('done')
    })
}
