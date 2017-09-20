require('proof')(53, require('cadence')(prove))

function prove (async, assert) {
    var ClientCredentials = require('../cc')
    var connection = /^v0\.10\./.test(process.version) ? 'keep-alive' : 'close'
    var Semblance = require('semblance'),
        UserAgent = require('..'),
        http = require('http'),
        path = require('path'),
        fs = require('fs'),
        exec = require('child_process').exec,
        delta = require('delta'),
        pems

    var pseudo = new Semblance,
        ua = new UserAgent,
        binder

    var server = http.createServer(pseudo.dispatch()), request, tls
    async(function () {
        exec('make -C t/fixtures/certs', async())
    }, function () {
        pems = {
            cert: fs.readFileSync(path.join(__dirname, 'fixtures/certs/agent1-cert.pem')),
            key: fs.readFileSync(path.join(__dirname, 'fixtures/certs/agent1-key.pem')),
            ca: fs.readFileSync(path.join(__dirname, 'fixtures/certs/ca1-cert.pem'))
        }
        var ua = new UserAgent
    }, function () {
        server.listen(7779, '127.0.0.1', async())
    }, [function () {
        server.close(async())
    }], function () {
        ua.fetch({
            url: 'http://127.0.0.1:9999/here'
        }, async())
    }, function (body, response) {
        assert(response.statusCode, 599, 'refused status')
        assert(response.errno, 'ECONNREFUSED', 'refused errno')
        assert(/^connect ECONNREFUSED/.test(body), 'refused body')
        ua.fetch({
            socketPath: path.join(__dirname, 'non-existant'),
            url: '/'
        }, async())
    }, function (body, response) {
        assert(response.statusCode, 599, 'refused status')
        assert(response.errno, 'ENOENT', 'refused errno')
        assert(/^connect ENOENT/.test(body), 'refused body')
    }, [function () {
        ua.fetch({
            url: 'http://127.0.0.1:9999/here',
            raise: true
        }, async())
    }, function (error) {
        assert(error.response.statusCode, 599, 'raised refused status')
    }], function () {
        ua.fetch({
            url: 'http://127.0.0.1:9999/here',
            nullify: true
        }, async())
    }, function (response) {
        assert(response, null, 'nullify refused status')
        ua.fetch({
            url: 'http://127.0.0.1:9999/here',
            falsify: true
        }, async())
    }, function (response) {
        assert(response, false, 'falsify refused status')
        ua.fetch({
            url: 'http://127.0.0.1:9999/here',
        }, async())
    }, function (body, response) {
        assert(response.statusCode, 599, 'unparsed refused status')
        assert(response.errno, 'ECONNREFUSED', 'unparsed refused errno')
        ua.fetch({
            plugins: [ new ClientCredentials(ua) ],
            url: 'http://a:z@127.0.0.1:9999/here',
        }, async())
    }, function (body, response) {
        assert(response.statusCode, 599, 'unparsed refused cc status')
        assert(response.errno, 'ECONNREFUSED', 'unparsed refused cc errno')
        pseudo.push({ delay: 1000 })
        ua.fetch({
            url: 'http://127.0.0.1:7779/here',
            timeout: 250
        }, async())
    }, function (body, response) {
        assert(response.statusCode, 599, 'timeout status')
        assert(response.errno, 'ECONNRESET', 'timeout errno')
        assert(body, 'socket hang up', 'timeout body')
        pseudo.clear()
        ua.fetch({
            url: 'http://127.0.0.1:7779/here'
        }, {
            method: 'GET',
            url: '/there?1'
        }, async())
    }, function () {
        assert(pseudo.shift(), {
            method: 'GET',
            headers: {
                accept: 'application/json',
                host: '127.0.0.1:7779',
                connection: connection
            },
            url: '/there?1',
            body: {}
        }, 'get')
        pseudo.clear()
        ua.fetch({
            url: 'http://127.0.0.1:7779/',
            nullify: true
        }, async())
    }, function (body) {
        assert(body, { message: 'Hello, World!' }, 'nullify okay')
        pseudo.clear()
        ua.bind({
            url: 'http://127.0.0.1:7779/here'
        }).fetch({
            method: 'GET',
            url: '/there?1'
        }, async())
    }, function () {
        assert(pseudo.shift(), {
            method: 'GET',
            headers: {
                accept: 'application/json',
                host: '127.0.0.1:7779',
                connection: connection
            },
            url: '/there?1',
            body: {}
        }, 'bind')
        pseudo.clear()
        ua.fetch([{
            url: 'http://127.0.0.1:7779/here'
        }, {
            method: 'GET',
            url: '/there?1'
        }], async())
    }, function () {
        assert(pseudo.shift(), {
            method: 'GET',
            headers: {
                accept: 'application/json',
                host: '127.0.0.1:7779',
                connection: connection
            },
            url: '/there?1',
            body: {}
        }, 'get array override')
        pseudo.push({ payload: {} })
        ua.fetch({
            url: 'http://127.0.0.1:7779/here'
        }, {
            method: 'GET',
            url: '/there',
            response: 'buffer'
        }, async())
    }, function (body, response) {
        assert(body.toString(), '{}\n', 'unparsed')
        pseudo.push({ payload: {} })
        ua.fetch({
            url: 'http://127.0.0.1:7779/here'
        }, {
            method: 'GET',
            url: '/there',
            response: 'stream'
        }, async())
    }, function (body, response) {
        async(function () {
            delta(async()).ee(body).on('readable')
        }, function () {
            assert(body.read().toString(), '{}\n', 'stream')
        })
    }, function () {
        pseudo.clear()
        ua.fetch({
            url: 'http://127.0.0.1:7779/here'
        }, {
            url: '/there',
            payload: { a: 1 }
        }, {
            headers: {
                greeting: 'Hello, World!'
            }
        }, async())
    }, function () {
        assert(pseudo.shift(), {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'content-length': '7',
                accept: 'application/json',
                host: '127.0.0.1:7779',
                greeting: 'Hello, World!',
                connection: connection
            },
            url: '/there',
            body: { a: 1 }
        }, 'payload')
        pseudo.clear()
        var fetch = ua.fetch({
            url: 'http://127.0.0.1:7779/here'
        }, {
            url: '/there',
            method: 'POST'
        }, {
            headers: {
                'content-type': 'application/json',
                greeting: 'Hello, World!'
            }
        }, async())
        fetch.input.write(JSON.stringify({ a: 1 }))
        fetch.input.end()
    }, function () {
        assert(pseudo.shift(), {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'transfer-encoding': 'chunked',
                accept: 'application/json',
                host: '127.0.0.1:7779',
                greeting: 'Hello, World!',
                connection: connection
            },
            url: '/there',
            body: { a: 1 }
        }, 'upload')
        pseudo.clear()
        ua.fetch({
            url: 'http://127.0.0.1:7779/here'
        }, {
            url: '/there',
            put: { a: 1 }
        }, {
            headers: {
                greeting: 'Hello, World!'
            }
        }, async())
    }, function () {
        assert(pseudo.shift(), {
            method: 'PUT',
            headers: {
                'content-type': 'application/json',
                'content-length': '7',
                accept: 'application/json',
                host: '127.0.0.1:7779',
                greeting: 'Hello, World!',
                connection: connection
            },
            url: '/there',
            body: { a: 1 }
        }, 'put')
        pseudo.clear()
        ua.fetch({
            url: 'http://127.0.0.1:7779/here'
        }, {
            url: '/there',
            post: { a: 1 }
        }, {
            headers: {
                greeting: 'Hello, World!'
            }
        }, async())
    }, function () {
        assert(pseudo.shift(), {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'content-length': '7',
                accept: 'application/json',
                host: '127.0.0.1:7779',
                greeting: 'Hello, World!',
                connection: connection
            },
            url: '/there',
            body: { a: 1 }
        }, 'post')
        pseudo.clear()
        ua.fetch({
            url: 'http://127.0.0.1:7779/here'
        }, {
            url: '/there',
            body: { a: 1 }
        }, {
            headers: {
                greeting: 'Hello, World!'
            }
        }, async())
    }, function () {
        assert(pseudo.shift(), {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'content-length': '7',
                accept: 'application/json',
                host: '127.0.0.1:7779',
                greeting: 'Hello, World!',
                connection: connection
            },
            url: '/there',
            body: { a: 1 }
        }, 'body')
        pseudo.push({
            headers: {},
            payload: 'Hello, World!'
        })
        ua.fetch({
            url: 'http://127.0.0.1:7779/here'
        }, {
            method: 'GET',
            url: '/there'
        }, async())
    }, function () {
        assert(pseudo.shift().headers['content-type'] == null, 'null content-type')
        pseudo.push({
            statusCode: 200,
            headers: {
                'content-type': 'text/plain'
            },
            payload: 'Hello, World!'
        })
        ua.fetch({ url: 'http://127.0.0.1:7779' }, async())
    }, function (body, response) {
        assert(body.toString(), 'Hello, World!', 'text')
        assert(response.headers['content-type'], 'text/plain', 'text content-type')
    }, [function () {
        pseudo.push({
            statusCode: 404,
            headers: {
                'content-type': 'application/json'
            },
            payload: {}
        })
        ua.fetch({ url: 'http://127.0.0.1:7779', raise: true }, async())
    }, function (error) {
        assert(error.response.statusCode, 404, 'raise HTTP error status')
        assert(error.body, {}, 'raise HTTP error parsed body')
    }], function () {
        pseudo.push({
            statusCode: 404,
            headers: {
                'content-type': 'application/json'
            },
            payload: {}
        })
        ua.fetch({ url: 'http://127.0.0.1:7779', nullify: true }, async())
    }, function (response) {
        assert(response, null, 'nullify HTTP error status')
        pseudo.push({
            statusCode: 200,
            headers: {
                'content-type': 'text/html'
            },
            payload: 'Hello, World!'
        })
        ua.fetch({ url: 'http://127.0.0.1:7779' }, async())
    }, function (body, response) {
        assert(body.toString(), 'Hello, World!', 'html')
        assert(response.headers['content-type'], 'text/html', 'html content-type')
        pseudo.push({
            statusCode: 200,
            headers: {
                'content-type': 'application/octet-stream'
            },
            payload: 'Hello, World!'
        })
        ua.fetch({ url: 'http://127.0.0.1:7779' }, async())
    }, function (body, response) {
        console.log(body)
        assert(body.toString(), 'Hello, World!', 'unknown')
        assert(response.headers['content-type'], 'application/octet-stream', 'unknown content-type')
        pseudo.push({
            statusCode: 200,
            headers: {
                'content-type': 'application/json'
            },
            payload: new Buffer('{a')
        })
        ua.fetch({ url: 'http://127.0.0.1:7779' }, async())
    }, function (body, response) {
        assert(body.toString(), '{a', 'botched json')
        pseudo.push({ statusCode: 401 })
        ua.fetch({
            url: 'http://a:z@127.0.0.1:7779/here'
        }, {
            plugins: [ new ClientCredentials(ua) ],
            url: '/there',
        }, async())
    }, function (body, response) {
        assert(response.statusCode, 401, 'bad authentication')
        pseudo.clear()
        pseudo.push({
            payload: {
                token_type: 'Bearer',
                access_token: 'x'
            }
        })
        ua.fetch({
            url: 'http://a:z@127.0.0.1:7779/here'
        }, {
            plugins: [ new ClientCredentials(ua) ],
            url: '/there',
        }, async())
    }, function (body, response) {
        assert(response.statusCode, 200, 'good authentication')
        assert(ua.storage.cc['127.0.0.1:7779'], 'x', 'lookup token')
        assert(pseudo.shift(), {
            method: 'POST',
            headers: {
                authorization: 'Basic YTp6',
                'content-type': 'application/json',
                accept: 'application/json',
                'content-length': '35',
                host: '127.0.0.1:7779',
                connection: connection
            },
            url: '/token',
            body: { grant_type: 'client_credentials' }
        }, 'token request')
        assert(pseudo.shift(), {
            method: 'GET',
            headers: {
                accept: 'application/json',
                authorization: 'Bearer x',
                host: '127.0.0.1:7779',
                connection: connection
            },
            url: '/there',
            body: {}
        }, 'request with token')
        pseudo.clear()
        pseudo.push({ statusCode: 401 })
        ua.fetch({
            url: 'http://a:z@127.0.0.1:7779/here'
        }, {
            plugins: [ new ClientCredentials(ua) ],
            url: '/there',
        }, async())
    }, function (body, response) {
        assert(response.statusCode, 401, 'cleared authentication')
        pseudo.push({
            statusCode: 200,
            headers: {
                'content-type': 'application/json-stream'
            },
            payload: '1\n2\n3\n'
        })
        ua.fetch({ url: 'http://127.0.0.1:7779' }, async())
    }, function (stream, response) {
        var values = []
        async(function () {
            var wait = null
            // 'readable' does not emit on 'end' in 0.10.
            // TODO Need a delta OR.
            stream.on('end', function () {  if (wait != null) wait.cancel() })
            var loop = async(function () {
                wait = delta(async()).ee(stream).on('readable')
            }, function () {
                wait = null
                var value, count = 0
                while ((value = stream.read()) != null) {
                    count++
                    values.push(value)
                }
                if (count == 0) {
                    return [ loop.break ]
                }
            })()
        }, function () {
            assert(values, [ 1, 2, 3 ], 'values')
        })
    }, function () {
        ua.fetch({ url: 'http://127.0.0.1:7779' }, async()).cancel()
    }, function (result, response) {
        assert(response.statusCode, 599, 'cancel')
        ua.fetch({ url: 'http://127.0.0.1:7779' }).response.wait(async())
    }, function (result) {
        assert(result, { message: 'Hello, World!' }, 'cancel')
    }, function () {
// SSL!
        binder = [
            { url: 'https://127.0.0.1:7778' }, pems
        ]
        tls = require('https').createServer(pems, pseudo.dispatch())
        tls.listen(7778, '127.0.0.1', async())
    }, [function () {
        tls.close(async())
    }], function () {
        ua.fetch(binder, async())
    }, function (body, response) {
        assert(response.statusCode, 200, 'https code')
        assert(body, { message: 'Hello, World!' }, 'https body')
        pseudo.clear()
        ua.fetch({ url: 'https://www.google.com/' }, async())
    }, function (body, response) {
        assert(response.statusCode, 200, 'https fetch without pinned CA')
        ua.fetch(binder, { agent: false }, async())
    }, function () {
        assert(pseudo.shift().headers.connection, 'close', 'connection close')
    }, function () {
        server.close(async())
    }, function () {
        server = require('https').createServer({
            ca:                 pems.ca,
            key:                pems.key,
            cert:               pems.cert,
            requestCert:        true,
            rejectUnauthorized: true
        }, pseudo.dispatch())
        server.listen(7779, '127.0.0.1', async())
    }, function () {
        ua.fetch({
            url: 'https://127.0.0.1:7779',
            ca: pems.ca
        }, { agent: false }, async())
    }, function (body, response) {
        assert(response.statusCode, 599, 'TLS client authentication failed')
        ua.fetch(binder, pems, { agent: false }, async())
    }, function (body, response) {
        assert(response.statusCode, 200, 'TLS client authentication succeeded')
    })
}
