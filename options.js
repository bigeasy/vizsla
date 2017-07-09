module.exports = function (request) {
    var options = {}
    for (var name in request) {
        if (!/^(?:response|context|body|payload|grant|token|timeout|raise|falsify|nullify|plugins|log)$/.test(name)) {
            options[name] = request[name]
        }
    }
    return options
}
