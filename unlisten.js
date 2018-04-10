// This ugliness is extracted for the sake of unit testing and sanity checking
// but it is a kudge to catch a bug that won't reproduce.

module.exports = function (ee, listeners) {
    if (ee != null && typeof ee.removeListener == 'function') {
        listeners.forEach(function (listener) {
            ee.removeListener(listener.name, listener.f)
        })
    } else {
        console.log('no removeListener')
        console.log(typeof ee)
        console.log(ee)
        if (ee != null && typeof ee == 'object') {
            console.log(ee.constructor.name)
        }
    }
}
