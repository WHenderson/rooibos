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
import * as path from 'path';

export interface CmdOptions {
    '--config' : string;
    '--global' : string;
    '--help': boolean;
    '--only': string[];
    '--reporter': string;
    '--version': boolean;
    '-h': boolean;
    '<file>': string[];
}

export function parse() {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'UTF8'));
    return docopt(doc, { version: pkg.version }) as CmdOptions;
}
