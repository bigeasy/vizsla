var coalesce = require('extant')

function createHeaderTest (header) {
    var action = true
    if (header[0] == '-') {
        action = false
        header = header.substring(1)
    } else if (header[0] == '+') {
        header = header.substring(1)
    }
    header = header.split(/\s*:\s*/, 2)
    return function (response) {
        if (header[0] == 'content-type') {
            if (~header[1].indexOf('/')) {
                return header[1] == response.type.type + '/' + response.type.subtype ? action : null
            }
            return header[1] == response.type.type ? action : null
        }
        return header[1] == response.headers[header[0]] ? action : null
    }
}

function createStatusCodeTest (statusCode) {
    if (statusCode == 0) {
        return function () { return true }
    }
    if (Math.abs(statusCode) < 10) {
        return function (response) {
            if (Math.floor(response.statusCode / 100) == Math.abs(statusCode)) {
                return statusCode < 0 ? false : true
            }
            return null
        }
    }
    return function (response) {
        if (response.statusCode == Math.abs(statusCode)) {
            return statusCode < 0 ? false : true
        }
        return null
    }
}

module.exports = function (condition) {
    var tests = []
    for (var i = 0, I = condition.length; i < I; i++) {
        switch (typeof condition[i]) {
        case 'number':
            tests.push(createStatusCodeTest(condition[i]))
            break
        case 'string':
            tests.push(createHeaderTest(condition[i]))
            break
        case 'function':
            tests.push(condition[i])
            break
        }
    }
    return function (request) {
        var action = false
        for (var i = 0, I = tests.length; i < I; i++) {
            action = coalesce(tests[i](request), action)
        }
        return action
    }
}
