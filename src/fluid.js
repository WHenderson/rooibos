const State = require('./state');

const state = new State();

function combine(name, func, ...options) {
    const final = Object.assign({}, ...options, { name, func });

    if (!final.func) {
        final.func = final.name;
        if (!final.func)
            throw new Error('Missing required');

        final.name = final.func.name || '';
    }

    return final;
}

const testishAlias = testish;

function testish(defaults) {

    function testish(options) {
        return testishAlias(Object.assign({}, defaults, options));
    }

    function describe(name, func, options) {
        return state.describe(combine(name, func, defaults, options));
    }

    describe.only = function only(name, func, options) {
        return state.test(combine(name, func, defaults, options, { only: true }));
    };

    describe.skip = function only(name, func, options) {
        return state.test(combine(name, func, defaults, options, { skip: true }));
    };

    function test(name, func, options) {
        return state.test(combine(name, func, defaults, options));
    }

    test.only = function only(name, func, options) {
        return state.test(combine(name, func, defaults, options, { only: true }));
    };

    test.skip = function only(name, func, options) {
        return state.test(combine(name, func, defaults, options, { skip: true }));
    };

    function before(name, func, options) {
        return state.before(combine(name, func, defaults, options));
    }

    function after(name, func, options) {
        return state.before(combine(name, func, defaults, options));
    }

    function beforeEach(name, func, options) {
        return state.before(combine(name, func, defaults, options));
    }

    function afterEach(name, func, options) {
        return state.before(combine(name, func, defaults, options));
    }

    return {
        testish,
        before,
        beforeEach,
        describe,
        test,
        afterEach,
        after
    }
}

module.exports = testish({});

// timeout(ms).describe(name, func)
// timeout(ms).describe.only(name, func)
// timeout(ms).describe.skip(name, func)
// timeout(ms).test(name, func)
// timeout(ms).test.only(name, func)
// timeout(ms).test.skip(name, func)
// should timeouts be only for tests, or for everything including describe and hooks?
// just return a new object from each fluid function, dont use classes