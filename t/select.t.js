require('proof')(20, prove)

function prove (okay) {
    var createSelector = require('../select')
    okay(createSelector([ 2 ])({ statusCode: 200 }), 'status code class')
    okay(!createSelector([ 2 ])({ statusCode: 404 }), 'status code class miss')
    okay(createSelector([ 200 ])({ statusCode: 200 }), 'status code')
    okay(!createSelector([ 200 ])({ statusCode: 404 }), 'status code miss')
    okay(createSelector([ 0 ])({}), 'always include')
    okay(!createSelector([ 0, -2 ])({ statusCode: 200 }), 'exclude status code class')
    okay(createSelector([ 0, -2 ])({ statusCode: 401 }), 'exclude status code class hit')
    okay(!createSelector([ 0, -200 ])({ statusCode: 200 }), 'exclude status code')
    okay(createSelector([ 0, -200 ])({ statusCode: 401 }), 'exclude status code hit')
    okay(createSelector([ 'content-type: text/plain' ])({
        type: { type: 'text', subtype: 'plain' }
    }), 'include full content type')
    okay(!createSelector([ 'content-type: application/json' ])({
        type: { type: 'text', subtype: 'plain' }
    }), 'include full content type miss')
    okay(createSelector([ 'content-type: text' ])({
        type: { type: 'text' }
    }), 'include content type')
    okay(!createSelector([ 'content-type: text' ])({
        type: { type: 'application' }
    }), 'include content type miss')
    okay(createSelector([ 'transfer-encoding: chunked' ])({
        headers: { 'transfer-encoding': 'chunked' }
    }), 'include header')
    okay(createSelector([ 'transfer-encoding: chunked' ])({
        headers: { 'transfer-encoding': 'chunked' }
    }), 'include header miss')
    okay(createSelector([ '+transfer-encoding: chunked' ])({
        headers: { 'transfer-encoding': 'chunked' }
    }), 'include header plus')
    okay(!createSelector([ 'transfer-encoding: chunked' ])({
        headers: { 'transfer-encoding': 'compress' }
    }), 'include header miss')
    okay(!createSelector([ '-transfer-encoding: chunked' ])({
        headers: { 'transfer-encoding': 'chunked' }
    }), 'exclude header')
    okay(createSelector([ function () { return true } ])({}), 'function')
    okay(createSelector([])({}), 'empty')
}
