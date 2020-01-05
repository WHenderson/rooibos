import { Action, Options, Describe, After, AfterEach, Before, BeforeEach, NamedOptions, Test } from "./contract";

interface Testish {
    testish: (defaults: Options) => Testish;
    describe: Describe;
    test: Test;
    before: Before;
    beforeEach: BeforeEach;
    afterEach: AfterEach;
    after: After;
}

function isString(x: any): x is string {
    return typeof x === "string";
}

function combine(name : string, callback : Action, ...options : Options[]) : NamedOptions;
function combine(callback : Action, ...options : Options[]) : NamedOptions;

function combine(name, callback, ...options) {
    if (isString(name)) {
        return Object.assign(
            {},
            ...options,
            { name, callback}
        );
    }
    else {
        return Object.assign(
            {},
            callback,
            ...options,
            {
                name: name.name || '',
                callback: name
            }
        )
    }
}

function testish(defaults? : Options) : Testish {
    defaults = defaults || {};

    //TODO: dont forget to add the .only and .skip

    return {
        after: undefined,
        afterEach: undefined,
        before: undefined,
        beforeEach: undefined,
        describe: undefined,
        test: undefined,
        testish: function (options: Options) {
            return testish(Object.assign({}, defaults, options));
        }
    }
}