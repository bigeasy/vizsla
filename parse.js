var cadence = require('cadence')

function Parse () {
}

Parse.prototype.descend = cadence(function (async, descent) {
    descent.descend(async())
})

module.exports = function (parse) {
    return new Parse
}
