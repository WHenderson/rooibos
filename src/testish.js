const State = require('./state');

const state = new State();

function describe(name, func) {
    if (!func) {
        func = name;
        name = func.name;
    }

    return state.describe(name, func, false, false);
}

describe.only = function (name, func) {
    if (!func) {
        func = name;
        name = func.name;
    }

    return state.describe(name, func, true, false);
};

describe.skip = function (name, func) {
    if (!func) {
        func = name;
        name = func.name;
    }

    return state.describe(name, func, false, true);
};

function test(name, func) {
    if (!func) {
        func = name;
        name = func.name;
    }

    return state.test(name, func, false, false);
}

test.only = function (name, func) {
    if (!func) {
        func = name;
        name = func.name;
    }

    return state.test(name, func, true, false);
};

test.skip = function (name, func) {
    if (!func) {
        func = name;
        name = func.name;
    }

    return state.test(name, func, false, true);
};

function before(name, func) {
    if (!func) {
        func = name;
        name = func.name;
    }

    return state.before(name, func, false, false);
}

function after(name, func) {
    if (!func) {
        func = name;
        name = func.name;
    }

    return state.after(name, func, false, false);
}

function beforeEach(name, func) {
    if (!func) {
        func = name;
        name = func.name;
    }

    return state.beforeEach(name, func, false, false);
}

function afterEach(name, func) {
    if (!func) {
        func = name;
        name = func.name;
    }

    return state.afterEach(name, func, false, false);
}

module.exports = {
    before,
    beforeEach,
    describe,
    test,
    afterEach,
    after
};