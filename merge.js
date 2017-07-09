var url = require('url')
var ClientCredentials = require('./cc')

module.exports = function (base, vargs, ua) {
    var merged = {}
    vargs.unshift(base)
    while (vargs.length != 0) {
        var varg = vargs.shift()
        if (Array.isArray(vargs[0])) {
            vargs.unshift.apply(vargs, varg)
        }
        for (var name in varg) {
            if (name == 'socketPath') {
                vargs.unshift({ url: 'http://' + encodeURIComponent(varg.socketPath) + '@unix' })
            } else if (name == 'url') {
                if (merged.url == null) {
                    merged.url = varg.url
                } else {
                    merged.url = url.resolve(merged.url, varg.url)
                }
            } else if (name == 'headers') {
                if (merged.headers == null) {
                    merged.headers = {}
                }
                for (var header in varg.headers) {
                    merged.headers[header] = String(varg.headers[header])
                }
            } else if (name == 'plugins') {
                if (merged.plugins == null) {
                    merged.plugins = []
                }
                merged.plugins.push.apply(merged.plugins, varg.plugins)
            } else if (name == 'grant' && varg.grant == 'cc') {
                vargs.unshift({ plugins: [ new ClientCredentials(ua) ] })
            } else {
                merged[name] = varg[name]
            }
        }
    }
    return merged
}
