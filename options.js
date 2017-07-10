var HTTP_PROPERTIES =
    /^host|hostname|family|port|socketPath|method|path|headers|auth|agent$/
var HTTPS_PROPERTIES =
    /^pfx|key|passphrase|cert|ca|ciphers|rejectUnauthorized|secureProtocol|servername$/

module.exports = function (request) {
    var options = {}
    for (var name in request) {
        if (HTTP_PROPERTIES.test(name) || HTTPS_PROPERTIES.test(name)) {
            options[name] = request[name]
        }
    }
    return options
}
