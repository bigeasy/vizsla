var url = require('url')
var ClientCredentials = require('./cc')

function copy (object, exclude) {
    var copy = {}
    for (var property in object) {
        if (property != exclude) {
            copy[property] = object[property]
        }
    }
    return copy
}

module.exports = function (base, vargs, ua) {
    var merged = {}
    vargs.unshift(base)
    while (vargs.length != 0) {
        var varg = vargs.shift()
        if (Array.isArray(varg)) {
            vargs.unshift.apply(vargs, varg)
            continue
        }
        // If we have a UNIX domain socket, make it a base URL.
        if (varg.socketPath) {
            vargs.unshift(copy(varg, 'socketPath'))
            vargs.unshift({ url: 'http://' + encodeURIComponent(varg.socketPath) + '@unix'  })
            continue
        }
        // If we have a `path` property, make it follow any `url` property.
        if (varg.path) {
            vargs.unshift({ url: varg.path })
            vargs.unshift(copy(varg, 'path'))
            continue
        }
        for (var name in varg) {
            if (name == 'url') {
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
            } else if (name == 'put' || name == 'post') {
                merged.payload = varg[name]
                merged.method = name.toUpperCase()
            } else if (name == 'body') {
                merged.payload = varg.body
            } else {
                merged[name] = varg[name]
            }
        }
    }
    return merged
}
