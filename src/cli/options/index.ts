import { parse as parseCmd } from './cmd';
import {ConfigSchema, Convert} from './config.schema';
import * as fs from 'fs';
import * as path from 'path';
import * as fg from 'fast-glob';

export interface Options {
    files?: string[];
    global?: string;
    only?: string[];
    reporter?: string;
}

export function parse() {
    const cmd = parseCmd();
    const filepathConfig = cmd["--config"] || (fs.existsSync('testish.config') && 'testish.config');

    const optionsDefault = {
        files: [],
        reporter: 'VerboseReporter'
    };

    const empty2Undefined = (val) => val && val.length ? val : undefined;

    const optionsCmd = {
        files: empty2Undefined(cmd["<file>"]),
        global: cmd["--global"],
        only: empty2Undefined(cmd["--only"]),
        reporter: cmd["--reporter"]
    };

    if (optionsCmd.files)
        optionsCmd.files = fg.sync(optionsCmd.files);

    const optionsConfig : ConfigSchema = {};

    if (filepathConfig) {
        Object.assign(optionsConfig, Convert.toConfigSchema(fs.readFileSync(filepathConfig, 'UTF8')));

        optionsConfig.files = empty2Undefined(optionsConfig.files);
        optionsConfig.only = empty2Undefined(optionsConfig.only);

        const cwd = path.dirname(filepathConfig);

        if (optionsConfig.global)
            optionsConfig.global = path.join(cwd, optionsConfig.global);

        if (optionsConfig.files)
            optionsConfig.files = fg.sync(optionsConfig.files, { cwd }).map(filepath => path.join(cwd, filepath));
        else if (!optionsCmd.files)
            optionsConfig.files = fg.sync(['test/**/*.testish.js'], { cwd }).map(filepath => path.join(cwd, filepath));

        if (optionsConfig.reporter && !optionsConfig.reporter.match(/^[a-zA-Z]+$/))
            optionsConfig.reporter = path.join(cwd, optionsConfig.reporter);
    }
    else {
        if (!optionsCmd.files)
            optionsCmd.files = fg.sync(['test/**/*.testish.js']);
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
