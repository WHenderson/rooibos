import { parse as parseCmd } from './cmd';
import { Convert } from './config.schema';
import * as fs from 'fs';
import * as path from 'path';

export interface Options {
    files?: string[];
    global?: string;
    only?: string[];
    reporter?: string;
}

export function parse() {
    const cmd = parseCmd();
    console.log('cmd:', cmd);
    const filepathConfig = cmd["--config"] || (fs.existsSync('testish.config') && 'testish.config');

    const optionsDefault = {
        files: ['test/**/*.testish.js'],
        reporter: 'Verbose'
    };

    const empty2Undefined = (val) => val && val.length ? val : undefined;

    const optionsCmd = {
        files: empty2Undefined(cmd["<file>"]),
        global: cmd["--global"],
        only: empty2Undefined(cmd["--only"]),
        reporter: cmd["--reporter"]
    };

    const optionsConfig = {};

    if (filepathConfig) {
        Object.assign(optionsConfig, Convert.toConfigSchema(fs.readFileSync(filepathConfig, 'UTF8')));
        console.log('config:', optionsConfig);
    }

    const filterNA = (obj) => Object.entries(obj)
        .filter(([key, val]) => val !== undefined && val !== null)
        .reduce(
            (obj, [key, val]) => {
                obj[key] = val;
                return obj;
            },
            {}
        );

    const options : Options = Object.assign(
        optionsDefault,
        filterNA(optionsConfig),
        filterNA(optionsCmd)
    );

    return options;
}
