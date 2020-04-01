import {JsonReporter, PipeReporter, VerboseReporter} from "../../src/Reporters";
import {Testish} from "../../src";

export function createApi(options = {}) {
    const jsonReporter = new JsonReporter();
    const api = new Testish(Object.assign(
        {
            reporter: new PipeReporter([
                jsonReporter,
                new VerboseReporter({ indent: true })
            ])
        },
        options
    ));

    return { events: jsonReporter.events, api };
}

export function mutatingMerge(expected, actual) {
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
            delete actual[key];
            //expected[key] = val;
        }
    });

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
