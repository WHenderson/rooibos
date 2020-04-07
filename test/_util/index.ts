import {JsonReporter, PipeReporter, VerboseReporter} from "../../src/Reporters";
import {Testish} from "../../src";
import instantiate = WebAssembly.instantiate;
import {UserOptionsTestish} from "../../src/types";

export function createApi(stateOptions?: { promise?: Promise<void>, start: boolean }, userOptions? : UserOptionsTestish) {
    stateOptions = Object.assign({ start: true }, stateOptions);
    userOptions = Object.assign({ description: undefined }, userOptions);

    const jsonReporter = new JsonReporter();
    const api = new Testish(
        Object.assign(
            {
                reporter: new PipeReporter([
                    jsonReporter,
                    new VerboseReporter({ indent: true })
                ])
            },
            stateOptions
        ),
        userOptions
    );

    if (stateOptions.start)
        api.start();

    return { events: jsonReporter.events, api };
}

export function _mutatingMerge(expected, actual) {
    if (!expected || typeof expected !== 'object' || expected instanceof Error)
        return;
    if (!actual || typeof actual !== 'object' || actual instanceof Error)
        return;

    if (Array.isArray(expected)) {
        expected.forEach((val, idx) => {
            mutatingMerge(val, actual[idx]);
        });
        return expected;
    }

    Object.entries(expected).forEach(([key, val]) => {
        // make "key: undefined === key not in actual"
        if (typeof val === 'undefined' && actual && !(key in actual))
            delete expected[key];
    });

    if (actual.exception)
        console.log('hmm');

    Object.entries(actual).forEach(([key, val]) => {
        if ({}.hasOwnProperty.call(expected, key)) {
            if (val && val instanceof Error && typeof expected[key] === 'string')
                actual[key] = val.message;
            else if (val && val instanceof Error && typeof expected[key] === 'object' && !(expected[key] instanceof Error)) {
                val = actual[key] = ['name', 'message']
                    .concat(Object.keys(val))
                    .filter((val, idx, arr) => arr.indexOf(val) == idx)
                    .reduce(
                        (obj, key) => {
                            obj[key] = val[key];
                            return obj;
                        },
                        {}
                    );
                mutatingMerge(expected[key], val);
            }
            else
                mutatingMerge(expected[key], val);
        }
        else {
            try {
                delete actual[key];
            }
            catch (ex) {
                expected[key] = val;
            }
        }
    });

    return expected;
}

function isAtomic(val) {
    if (!val)
        return true;
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || typeof val === 'function')
        return true;
    if (typeof val === 'object' && Object.prototype.toString.call(val) !== '[object Object]' && Object.prototype.toString.call(val) !== '[object Array]')
        return true;
    return false;
}

export function cloneMerge({ expected, actual }) {
    let out = {
        expected: expected,
        actual: actual
    };

    // string vs Error
    if (typeof expected === 'string' && actual && actual instanceof Error) {
        out.expected = expected = { message: expected };
    }

    // object vs class?
    if (expected &&
        Object.prototype.toString.call(expected) === '[object Object]' &&
        actual &&
        Object.prototype.toString.call(actual) !== '[object Object]' &&
        Object.prototype.toString.call(actual) !== '[object Array]'
    ) {
        // turn class into instance
        out.actual = actual = Object.keys(expected).reduce(
            (cur, key) => {
                cur[key] = actual[key];
                return cur;
            },
            {}
        );
    }

    if (isAtomic(expected) || isAtomic(actual))
        return out;

    if (Array.isArray(expected) !== Array.isArray(actual))
        return out;

    if (Array.isArray(expected)) {
        out.expected = expected.slice();
        out.actual = actual.slice();

        [...Array(Math.min(expected.length, actual.length))].forEach((val, idx)=> {
            const res = cloneMerge({ expected: expected[idx], actual: actual[idx] });
            out.expected[idx] = res.expected;
            out.actual[idx] = res.actual;
        });
    }
    else {
        out.expected = {};
        out.actual = {};

        const keys = Object.keys(actual).filter(key =>
            Object.keys(expected).includes(key) &&
            (
                typeof expected[key] !== 'undefined' ||
                (actual && key in actual)
            )
        );

        keys.forEach(key => {
            const res = cloneMerge({ expected: expected[key], actual: actual[key] });
            out.expected[key] = res.expected;
            out.actual[key] = res.actual;
        });
    }

    return out;
}

export function mutatingMerge(expected, actual) {
    const out = cloneMerge({ expected, actual });

    expected.splice(0, expected.length, ...out.expected);
    actual.splice(0, actual.length, ...out.actual);

    return expected;
}

export function getEx(cb: () => void) : Error {
    let exception : Error = undefined;
    try {
        cb();
    }
    catch (ex) {
        exception = ex;
    }
    return exception;
}
