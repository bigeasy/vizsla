require('proof')(9, prove)

function prove (okay) {
    var expand = require('../default')
    var https = require('https')
    okay(expand({
        url: 'http://127.0.0.1:8888/path'
    }).path, '/path', 'path')
    okay(expand({
        url: 'https://127.0.0.1:8888/path'
    }).http === https, 'https')
    okay(expand({
        url: 'http://127.0.0.1:8888/path'
    }).identifier, '127.0.0.1:8888', 'ip identifier')
    okay(expand({
        socketPath: '/var/sock'
    }).identifier, '/var/sock', 'domain socket identifier')
    okay(expand({
        url: 'http://127.0.0.1:8888',
        token: 'x'
    }).headers.authorization, 'Bearer x', 'token')
    okay(expand({
        url: 'http://127.0.0.1:8888',
        response: 'stream'
    }).response, 'stream', 'response')
    okay(expand({
        url: 'http://127.0.0.1:8888',
        payload: {}
    }).payload.toString(), '{}', 'json')
    okay(expand({
        url: 'http://127.0.0.1:8888',
        plugins: [ {} ]
    }).plugins, [ {} ], 'plugins')
    okay(expand({
        url: 'http://127.0.0.1:8888',
        method: 'DELETE'
    }).method, 'DELETE', 'method')
}
