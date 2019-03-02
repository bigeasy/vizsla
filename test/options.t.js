require('proof')(1, prove)

function prove (okay) {
    var options = require('../options')
    okay(options({
        method: 'POST',
        token: 'x'
    }), {
        method: 'POST'
    }, 'options')
}
