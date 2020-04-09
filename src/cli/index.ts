#!/usr/bin/env node
import { parse } from './options';
import { Testish } from '../Testish';
import { testish } from "../UserApi";
import {Reporter} from "../types";
import * as StandardReporters from '../Reporters';
import {ReporterBase} from "../Reporters/ReporterBase";
import * as path from 'path';

const options = parse();

async function loadReporter() : Promise<Reporter> {
    if (options.reporter.match(/^[a-zA-Z]+$/)) {
        if (!StandardReporters[options.reporter] || StandardReporters[options.reporter] instanceof ReporterBase || options.reporter === ReporterBase.name)
            throw new Error(`Invalid Standard Reporter Specified: ${options.reporter}`);

        return new StandardReporters[options.reporter]();
    }

    const { default: reporter } = await import(path.resolve(options.reporter)) as { default: ReporterBase };
    return reporter;
}

(async () => {
    const reporter = await loadReporter();
    const iapi = new Testish(
        {
            reporter
        },
        {
            description: undefined,
            only: options.only
        }
    );
    const uapi = testish(iapi);

    // place User API into the global namespace
    Object.assign(global, uapi);

    try {
        await iapi.start();

        if (options.global) {
            await import(path.resolve(options.global));
        }

        options.files.forEach(filepath => {
            uapi.script(filepath, async () => {
                const found = await import(path.resolve(filepath));
                if (found.default)
                    await found.default;
            });
        })
    }
    finally {
        await iapi.done();
    }
})();


