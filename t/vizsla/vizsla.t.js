require('proof')(43, require('cadence')(prove))

function prove (async, assert) {
    var Semblance = require('semblance'),
        UserAgent = require('../..'),
        http = require('http'),
        path = require('path'),
        fs = require('fs'),
        exec = require('child_process').exec,
        pems

    var pseudo = new Semblance,
        ua = new UserAgent,
        binder

    var server = http.createServer(pseudo.dispatch()), request
    async(function () {
        exec('make -C t/fixtures/certs', async())
    }, function () {
        pems = {
            cert: fs.readFileSync(path.join(__dirname, '../fixtures/certs/agent1-cert.pem')),
            key: fs.readFileSync(path.join(__dirname, '../fixtures/certs/agent1-key.pem')),
            ca: fs.readFileSync(path.join(__dirname, '../fixtures/certs/ca1-cert.pem'))
        }
        var ua = new UserAgent(false)
        async(function () {
            ua.fetch({
                url: 'http://127.0.0.1:9999/here',
            }, async())
        }, function (body, response) {
            assert(response.statusCode, 599, 'no logging refused status')
        })
    }, function () {
        server.listen(7779, '127.0.0.1', async())
    }, function () {
        ua.fetch({
            url: 'http://127.0.0.1:9999/here'
        }, async())
    }, function (body, response) {
        assert(response.statusCode, 599, 'refused status')
        assert(response.errno, 'ECONNREFUSED', 'refused errno')
        assert(/^connect ECONNREFUSED/.test(body.message), 'refused body')
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
        }, async())
    }, function (body, response, buffer) {
        assert(response.statusCode, 599, 'unparsed refused status')
        assert(response.errno, 'ECONNREFUSED', 'unparsed refused errno')
        assert(/^connect ECONNREFUSED/.test(JSON.parse(buffer.toString()).message), 'unparsed refused body')
        ua.fetch({
            grant: 'cc',
            url: 'http://a:z@127.0.0.1:9999/here',
        }, async())
    }, function (body, response, buffer) {
        assert(response.statusCode, 599, 'unparsed refused cc status')
        assert(response.errno, 'ECONNREFUSED', 'unparsed refused cc errno')
        assert(/^connect ECONNREFUSED/.test(JSON.parse(buffer.toString()).message), 'unparsed refused cc body')
        pseudo.push({ delay: 1000 })
        ua.fetch({
            url: 'http://127.0.0.1:7779/here',
            timeout: 250
        }, async())
    }, function (body, response) {
        assert(response.statusCode, 599, 'timeout status')
        assert(response.errno, 'ECONNRESET', 'timeout errno')
        assert(body, { message: 'socket hang up', errno: 'ECONNRESET' }, 'timeout body')
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
                connection: 'keep-alive'
            },
            url: '/there?1',
            body: {}
        }, 'get')
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
                connection: 'keep-alive'
            },
            url: '/there?1',
            body: {}
        }, 'get array override')
        pseudo.push({ payload: {} })
        ua.fetch({
            url: 'http://127.0.0.1:7779/here'
        }, {
            method: 'GET',
            url: '/there'
        }, async())
    }, function (body, response, buffer) {
        assert(buffer.toString(), '{}\n', 'unparsed')
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
                connection: 'keep-alive'
            },
            url: '/there',
            body: { a: 1 }
        }, 'payload')
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
                connection: 'keep-alive'
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
                connection: 'keep-alive'
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
                connection: 'keep-alive'
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
        assert(error.parsed, {}, 'raise HTTP error parsed body')
    }], function () {
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
            grant: 'cc',
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
            grant: 'cc',
            url: '/there',
        }, async())
    }, function (body, response) {
        assert(response.statusCode, 200, 'good authentication')
        assert(ua.lookupToken('http://a:z@127.0.0.1:7779/here'), 'x', 'lookup token')
        assert(pseudo.shift(), {
            method: 'POST',
            headers: {
                authorization: 'Basic YTp6',
                'content-type': 'application/json',
                accept: 'application/json',
                'content-length': '35',
                host: '127.0.0.1:7779',
                connection: 'keep-alive'
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
                connection: 'keep-alive'
            },
            url: '/there',
            body: {}
        }, 'request with token')
        pseudo.clear()
        pseudo.push({ statusCode: 401 })
        ua.fetch({
            url: 'http://a:z@127.0.0.1:7779/here'
        }, {
            grant: 'cc',
            url: '/there',
        }, async())
    }, function (body, response) {
        assert(response.statusCode, 401, 'cleared authentication')
        server.close(async())
    }, function () {
// SSL!
        binder = [
            { url: 'https://127.0.0.1:7779' }, pems
        ]
        server = require('https').createServer(pems, pseudo.dispatch())
        server.listen(7779, '127.0.0.1', async())
    }, function () {
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
        server.close(async())
    })
}
