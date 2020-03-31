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

    Object.entries(actual).forEach(([key, val]) => {
        if ({}.hasOwnProperty.call(expected, key)) {
            if (val && val instanceof Error && typeof expected[key] === 'string')
                actual[key] = val.message;
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
