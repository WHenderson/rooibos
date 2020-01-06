import { strict as assert } from 'assert';
import * as fg from 'fast-glob';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

suite('trials', () => {
    const entries = fg.sync('./trials/**/*.js', { cwd: __dirname });

    for (let entry of entries) {
        test(entry,  async () => {

            const outputName = path.join(__dirname, entry.replace(/^\.\/trials\//, './.output/').replace(/\.js$/, ''));
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

            fs.closeSync(out);
            fs.closeSync(err);

            const foundOut = fs.existsSync(outputName + '.stdout') ? fs.readFileSync(outputName + '.stdout', 'utf8') : null;
            const foundErr = fs.existsSync(outputName + '.stderr') ? fs.readFileSync(outputName + '.stderr', 'utf8') : null;

            const expectedName = path.join(__dirname, entry.replace(/\.js$/, ''));

            if (!fs.existsSync(expectedName + '.stdout'))
                fs.writeFileSync(expectedName + '.stdout', foundOut);
            const expectedOut = fs.readFileSync(expectedName + '.stdout', 'utf8');

            if (!fs.existsSync(expectedName + '.stderr'))
                fs.writeFileSync(expectedName + '.stderr', foundErr);
            const expectedErr = fs.readFileSync(expectedName + '.stderr', 'utf8');


            if (foundOut !== null || expectedOut !== null)
                assert.equal(foundOut, expectedOut, 'stdout does not match');

            if (foundErr !== null || expectedErr !== null)
                assert.equal(foundErr, expectedErr, 'stderr does not match');

        })
    }
});
