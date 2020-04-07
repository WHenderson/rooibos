const doc = `
testish.
A fully async test framework with detailed and customizable reporting.

Usage:
    testish [options] [<file>...]
    testish --config <config>
    testish -h | --help
    testish --version
    
Options:
    -c CONFIG --config=CONFIG       # Specify config file for controlling options
    --only=TAG                      # Only run tests with the given tag
`;

import {docopt} from 'docopt';
import * as fs from 'fs';
import * as fg from 'fast-glob';
import * as djv from 'djv';
import * as path from 'path';

interface Options {
    only: string[];
    files: string[];
}

function findOptions() : Options {
    const pkg = JSON.parse(fs.readFileSync(`${__dirname}/../package.json`, 'UTF8'));
    const opt = docopt(doc, { version: pkg.version });
    console.log('opt:', opt);

    if (opt['--config'] !== null) {
        const env = djv({
            version: 'draft-06',
            formats: {},
            errorHandler: function (type) {
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
            files: fg.sync(config.files, { cwd: path.dirname(opt['--config'])})
        }
    }
    return {
        only: opt['---only'] || [],
        files: opt['<file>']
    }
}

const opt = findOptions();
console.log('final:', opt);