import { strict as assert } from 'assert';
import * as fg from 'fast-glob';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

suite('trials', () => {
    const entries = fg.sync('./trials/**/*.js', { cwd: __dirname });

    for (let entry of entries) {
        test(entry,  async () => {

            const outputName = path.join(__dirname, entry.replace(/^\.\/trials\//, './.output/'));
            const out = fs.openSync(outputName + '.stdout', 'w');
            const err = fs.openSync(outputName + '.stderr', 'w');

            await new Promise((resolve, reject) => {
                const sub = spawn(
                    process.argv[0],
                    [path.join(__dirname, entry)],
                    {
                        stdio: [ 'ignore', out, err]
                    }
                );
                sub.on('exit', () => {
                    resolve();
                });
            });

            console.log('done');
        })
    }
});
