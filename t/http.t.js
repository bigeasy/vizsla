require('proof')(1, prove)

function prove (okay) {
    var transport = require('../http')
    okay(transport, 'require')
}
