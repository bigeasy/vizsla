require('proof')(2, prove)

function prove (okay) {
    var unlisten = require('../unlisten')
    var listener = {
        name: 'listener',
        f: function () {}
    }
    unlisten({
        removeListener: function (name, f) {
            okay(f === listener.f, 'name')
            okay(listener.name, 'listener', 'function')
        }
    }, [ listener ])
    unlisten({}, [ listener ])
    unlisten(null, [ listener ])
}
