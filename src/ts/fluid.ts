import { Action, Options, Describe, After, AfterEach, Before, BeforeEach, NamedOptions, Test } from "./contract";
import {StateStack} from "./state";

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

function combine(name : string | Action, callback: Action | Options, ...options : Options[]) : NamedOptions {
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

const stateStack = new StateStack();

function testish(defaults? : Options) : Testish {
    defaults = defaults || {};

    function after(name: string, callback : Action, options?: Options) : void;
    function after(callback : Action, options?: Options) : void;
    function after(name: string | Action, callback : Action | Options, options?: Options) : void {
        stateStack.after(combine(name, callback, defaults, options));
    }

    function afterEach(name: string, callback : Action, options?: Options) : void;
    function afterEach(callback : Action, options?: Options) : void;
    function afterEach(name: string | Action, callback : Action | Options, options?: Options) : void {
        stateStack.afterEach(combine(name, callback, defaults, options));
    }

    function before(name: string, callback : Action, options?: Options) : void;
    function before(callback : Action, options?: Options) : void;
    function before(name: string | Action, callback : Action | Options, options?: Options) : void {
        stateStack.before(combine(name, callback, defaults, options));
    }

    function beforeEach(name: string, callback : Action, options?: Options) : void;
    function beforeEach(callback : Action, options?: Options) : void;
    function beforeEach(name: string | Action, callback : Action | Options, options?: Options) : void {
        stateStack.beforeEach(combine(name, callback, defaults, options));
    }

    function describe(name: string, callback : Action, options?: Options) : Promise<void>;
    function describe(callback : Action, options?: Options) : Promise<void>;
    function describe(name: string | Action, callback : Action | Options, options?: Options) : Promise<void> {
        return stateStack.describe(combine(name, callback, defaults, options));
    }

    function describeOnly(name: string, callback : Action, options?: Options) : Promise<void>;
    function describeOnly(callback : Action, options?: Options) : Promise<void>;
    function describeOnly(name: string | Action, callback : Action | Options, options?: Options) : Promise<void> {
        return stateStack.describe(combine(name, callback, defaults, options, { only: true }));
    }

    function describeSkip(name: string, callback : Action, options?: Options) : Promise<void>;
    function describeSkip(callback : Action, options?: Options) : Promise<void>;
    function describeSkip(name: string | Action, callback : Action | Options, options?: Options) : Promise<void> {
        return stateStack.describe(combine(name, callback, defaults, options, { skip: true }));
    }
    
    describe.only = describeOnly;
    describe.skip = describeSkip;

    function test(name: string, callback : Action, options?: Options) : Promise<void>;
    function test(callback : Action, options?: Options) : Promise<void>;
    function test(name: string | Action, callback : Action | Options, options?: Options) : Promise<void> {
        return stateStack.test(combine(name, callback, defaults, options));
    }

    function testOnly(name: string, callback : Action, options?: Options) : Promise<void>;
    function testOnly(callback : Action, options?: Options) : Promise<void>;
    function testOnly(name: string | Action, callback : Action | Options, options?: Options) : Promise<void> {
        return stateStack.test(combine(name, callback, defaults, options, { only: true }));
    }

    function testSkip(name: string, callback : Action, options?: Options) : Promise<void>;
    function testSkip(callback : Action, options?: Options) : Promise<void>;
    function testSkip(name: string | Action, callback : Action | Options, options?: Options) : Promise<void> {
        return stateStack.test(combine(name, callback, defaults, options, { skip: true }));
    }

    test.only = testOnly;
    test.skip = testSkip;    
    
    return {
        after,
        afterEach,
        before,
        beforeEach,
        describe,
        test,
        testish: function (options: Options) {
            return testish(Object.assign({}, defaults, options));
        }
    }
}

const root = testish();

export const
    before = root.before,
    beforeEach = root.beforeEach,
    describe = root.describe,
    test = root.test,
    afterEach = root.afterEach,
    after = root.after;
