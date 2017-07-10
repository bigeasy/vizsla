require('proof')(1, prove)

function prove (okay) {
    var expand = require('../default')
    okay(expand({
        url: 'http://127.0.0.1:8888/path'
    }).path, '/path', 'path')
}
