#!/usr/bin/env node
const doc = `
testish.
A fully async test framework with detailed and customizable reporting.

Usage:
    testish [options] [--only=TAG]... [<file>...]
    testish -h | --help
    testish --version
    
Options:
    -c CONFIG --config=CONFIG       # Specify config file for controlling options
    --only=TAG                      # Only run tests with the given tag
    --reporter=REPORTER             # Specify an alternate reporter [default: Verbose]
    --global=FILE                   # Specify a script to run globally ahead of the main script files
`;

import {docopt} from 'docopt';
import * as fs from 'fs';
import * as fg from 'fast-glob';
import * as djv from 'djv';
import * as path from 'path';

interface Options {
    only: string[];
    files: string[];
    global: string;
    reporter: string;
}

//
type CmdOptions = {
    '--config' : string;
    '--global' : string;
    '--help': boolean;
    '--only': string[];
    '--reporter': string;
    '--version': boolean;
    '-h': boolean;
    '<file>': string[];
}

function findOptions() : Options {
    const pkg = JSON.parse(fs.readFileSync(`${__dirname}/../package.json`, 'UTF8'));
    const opt = docopt(doc, { version: pkg.version }) as CmdOptions;
    console.log('opt:', opt);

    if (opt['--config'] !== null) {
        const env = djv({
            version: 'draft-06',
            formats: {},
            errorHandler: function (type?) {
                return `return "${type}: ${this.data}";`;
            }
        });
        env.addSchema('config', JSON.parse(fs.readFileSync(`${__dirname}/config.schema.json`, 'UTF8')));
        const config = JSON.parse(fs.readFileSync(opt['--config'], 'UTF8'));
        const errors = env.validate('config', config);
        if (errors) {
            console.error('invalid configuration:', errors);
            process.exit(-1);
        }

        const files = config.files
            ? typeof config.files === 'string'
            ? [config.files]
            : config.files
            : ['test/**/*.testish.js'];

        return {
            only: config.only || [],
            files: fg.sync(files, { cwd: path.dirname(opt['--config'])}),
            global: '',
            reporter: ''
        }
    }
    return {
        only: opt['--only'] || [],
        files: opt['<file>'],
        global: opt["--global"],
        reporter: opt["--reporter"]
    }
}

const opt = findOptions();
console.log('final:', opt);