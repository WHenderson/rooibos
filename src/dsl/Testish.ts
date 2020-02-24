import {Callback, EnumNodeOptionsInheritable, HookOptions, NodeOptions} from "./Options";
import {EventType, Reporter} from "../Reporters/Reporter";
import {EnumNodeEntry} from "./EntryType";
import {Abortable} from 'advanced-promises';
import {State} from './State';
import {resolveTimeout} from "./resolveTimeout";

export interface NodeFunction {
    <T>(this: unknown, name: string, callback: Callback, options?: NodeOptions) : PromiseLike<T> | void;
    <T>(this: unknown, callback: Callback, options?: NodeOptions) : PromiseLike<T> | void;
}

export interface HookFunction {
    (this: unknown, name: string, callback: Callback, options?: HookOptions) : void;
    (this: unknown, callback: Callback, options?: HookOptions) : void;
}

export interface Testish {
    testish: (defaults: NodeOptions & HookOptions) => Testish;

    describe: NodeFunction & {
        only: NodeFunction;
        skip: NodeFunction;
    };
    it: NodeFunction & {
        only: NodeFunction;
        skip: NodeFunction;
    };

    before: HookFunction & {
        local: HookFunction;
        deep: HookFunction;

        any: HookFunction & {
            local: HookFunction;
            deep: HookFunction;
        };

        describe: HookFunction & {
            local: HookFunction;
            deep: HookFunction;
        };

        it: HookFunction & {
            local: HookFunction;
            deep: HookFunction;
        };
    };
    beforeEach: HookFunction & {
        local: HookFunction;
        deep: HookFunction;

        any: HookFunction & {
            local: HookFunction;
            deep: HookFunction;
        };

        describe: HookFunction & {
            local: HookFunction;
            deep: HookFunction;
        };

        it: HookFunction & {
            local: HookFunction;
            deep: HookFunction;
        };
    };
    afterEach: HookFunction & {
        local: HookFunction;
        deep: HookFunction;

        any: HookFunction & {
            local: HookFunction;
            deep: HookFunction;
        };

        describe: HookFunction & {
            local: HookFunction;
            deep: HookFunction;
        };

        it: HookFunction & {
            local: HookFunction;
            deep: HookFunction;
        };
    };
    after: HookFunction & {
        local: HookFunction;
        deep: HookFunction;

        any: HookFunction & {
            local: HookFunction;
            deep: HookFunction;
        };

        describe: HookFunction & {
            local: HookFunction;
            deep: HookFunction;
        };

        it: HookFunction & {
            local: HookFunction;
            deep: HookFunction;
        };
    };
}

export function testish(options?: NodeOptions & HookOptions & { reporter?: Reporter }) : Testish {
    const rootDefaults = Object.assign({}, options, { name: 'root', callback: undefined, nodeType: EnumNodeEntry.describe });
    const reporter = rootDefaults.reporter;
    delete rootDefaults.reporter;

    let resolve, reject, aapi;
    const root = new Abortable((res, rej, oa) => {
        resolve = res;
        reject = rej;
        aapi = oa;
    });

    let filtered = false;

    resolve();

    let state : State = {
        hooks: [],
        nodes: root,
        options: {},
        context: {
            name: 'root',
            parents: [],
            aapi: aapi
        }
    };

    (aapi as any).name = 'root';

    const _testish = function testish(defaults: NodeOptions & HookOptions) : Testish {
        defaults = Object.assign({}, defaults);

        if (defaults.only)
            filtered = true; // filtered is a global

        function testish(options: NodeOptions & HookOptions) : Testish {
            return _testish(Object.assign({}, defaults, options));
        }

        function node(entryType: EnumNodeEntry, name: string, callback: Callback, options?: NodeOptions & HookOptions) : PromiseLike<void> {
            // inherit options from parent
            options = Object.assign(
                {},
                Object
                    .keys(defaults)
                    .filter(key => EnumNodeOptionsInheritable.includes(key))
                    .reduce((obj, key) => {
                        obj[key] = defaults[key];
                        return obj;
                    }, {}),
                Object
                    .keys(state.options)
                    .filter(key => EnumNodeOptionsInheritable.includes(key))
                    .reduce((obj, key) => {
                        obj[key] = state.options[key];
                        return obj;
                    }, {}),
                options
            );
            // TODO: option inheritance isn't working properly. See inheritance of 'only'
            if (options.only)
                filtered = true;

            return state.nodes = state.nodes.then(async () => {
                const outer = state;

                try {
                    const wait = Abortable.fromAsync(async (aapi) => {
                        aapi.on(() => console.log(`abort ${name} from outer`));

                        const EX_TIMEOUT = new Error(`timeout ${name} inner`);
                        const EX_ABORT = new Error(`abort ${name} inner`);

                        const inner: State = {
                            hooks: [],
                            nodes: Promise.resolve(),
                            options: options,
                            context: {
                                name: name,
                                parents: outer.context.parents.concat([outer.context]),
                                aapi: undefined
                            }
                        };
                        state = inner;

                        (aapi as any).name = `${name} layer 1`;

                        const report = async (evenType: EventType, ex?: Error) => {
                            try {
                                await reporter.on({
                                    name: inner.context.name,
                                    entry: entryType,
                                    type: evenType,
                                    context: inner.context,
                                    exception: ex
                                })
                            }
                            catch (ex) {
                                console.log('error during reporting');
                            }
                        };

                        const skip = options.skip || (filtered && !options.only);

                        const wait = !skip
                            ? Abortable.fromAsync<Error|void>(async (aapi) => {
                                inner.context.aapi = aapi;
                                (aapi as any).name = `${name} layer 2`;
                                aapi.on(() => console.log(`abort ${name} from inner`));

                                await Promise.resolve();

                                await callback.call(inner.context, inner.context);
                                await inner.nodes;
                            }).withTimeout(resolveTimeout(entryType, options), {resolve: EX_TIMEOUT}).withAutoAbort(aapi, {resolve: EX_ABORT})
                            : undefined;

                        await report(EventType.ENTER);

                        try {
                            if (!skip) {
                                const result = await wait;

                                if (result === EX_TIMEOUT || result === EX_ABORT) {
                                    if (options.safeAbort) {
                                        await report(EventType.PENDING);
                                        await wait.promise;
                                    }

                                    if (result === EX_TIMEOUT)
                                        await report(EventType.TIMEOUT);
                                    else if (result === EX_ABORT)
                                        await report(EventType.ABORT);
                                } else
                                    await report(EventType.SUCCESS);
                            }
                            else {
                                await report(EventType.SKIPPED);
                            }
                        } catch (ex) {
                            await report(EventType.FAILURE);

                            if (entryType !== EnumNodeEntry.it)
                                throw ex;
                        } finally {
                            await report(EventType.LEAVE);
                            state = outer;
                        }
                    }).withAutoAbort(outer.context.aapi, {resolve: undefined });

                    // wait for resolution or abort
                    await wait;

                    // Ensure reporting etc is complete
                    await wait.promise;
                }
                catch (ex) {
                    console.log('ex:', ex);
                    throw ex;
                }
            });
        }


        function describe(name: string, callback : Callback, options?: HookOptions) : PromiseLike<void>;
        function describe(callback : Callback, options?: HookOptions) : PromiseLike<void>;
        function describe(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : PromiseLike<void> {
            return node(EnumNodeEntry.describe, typeof name === 'string' ? name : (callback as Callback).name, callback as Callback, options as NodeOptions);
        }

        function describeOnly(name: string, callback : Callback, options?: HookOptions) : PromiseLike<void>;
        function describeOnly(callback : Callback, options?: HookOptions) : PromiseLike<void>;
        function describeOnly(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : PromiseLike<void> {
            if (typeof name === 'string')
                return describe(name, callback as Callback, Object.assign({}, options, { only: true, skip: false }));
            else
                return describe(name as Callback, Object.assign({}, callback as HookOptions, { only: true, skip: false }));
        }

        function describeSkip(name: string, callback : Callback, options?: HookOptions) : PromiseLike<void>;
        function describeSkip(callback : Callback, options?: HookOptions) : PromiseLike<void>;
        function describeSkip(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : PromiseLike<void> {
            if (typeof name === 'string')
                return describe(name, callback as Callback, Object.assign({}, options, { only: false, skip: true }));
            else
                return describe(name as Callback, Object.assign({}, callback as HookOptions, { only: false, skip: true }));
        }

        describe.only = describeOnly;
        describe.skip = describeSkip;

        function it(name: string, callback : Callback, options?: HookOptions) : PromiseLike<void>;
        function it(callback : Callback, options?: HookOptions) : PromiseLike<void>;
        function it(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : PromiseLike<void> {
            return node(EnumNodeEntry.it, typeof name === 'string' ? name : (callback as Callback).name, callback as Callback, options as NodeOptions);
        }

        function itOnly<T>(name: string, callback : Callback, options?: HookOptions) : PromiseLike<void>;
        function itOnly<T>(callback : Callback, options?: HookOptions) : PromiseLike<void>;
        function itOnly<T>(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : PromiseLike<void> {
            if (typeof name === 'string')
                return it(name, callback as Callback, Object.assign({}, options, { only: true, skip: false }));
            else
                return it(name as Callback, Object.assign({}, callback as HookOptions, { only: true, skip: false }));
        }

        function itSkip<T>(name: string, callback : Callback, options?: HookOptions) : PromiseLike<void>;
        function itSkip<T>(callback : Callback, options?: HookOptions) : PromiseLike<void>;
        function itSkip<T>(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : PromiseLike<void> {
            if (typeof name === 'string')
                return it(name, callback as Callback, Object.assign({}, options, { only: false, skip: true }));
            else
                return it(name as Callback, Object.assign({}, callback as HookOptions, { only: false, skip: true }));
        }

        it.only = itOnly;
        it.skip = itSkip;

        function before(name: string, callback : Callback, options?: HookOptions) : void;
        function before(callback : Callback, options?: HookOptions) : void;
        function before(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
        }

        function beforeLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeLocal(callback : Callback, options?: HookOptions) : void;
        function beforeLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return before(name, callback as Callback, Object.assign({}, options, { localOnly: true }));
            else
                return before(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true }));
        }

        function beforeDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeDeep(callback : Callback, options?: HookOptions) : void;
        function beforeDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return before(name, callback as Callback, Object.assign({}, options, { localOnly: false }));
            else
                return before(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false }));
        }

        function beforeAny(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeAny(callback : Callback, options?: HookOptions) : void;
        function beforeAny(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return before(name, callback as Callback, Object.assign({}, options, { entryType: undefined }));
            else
                return before(name as Callback, Object.assign({}, callback as HookOptions, { entryType: undefined }));
        }

        function beforeAnyLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeAnyLocal(callback : Callback, options?: HookOptions) : void;
        function beforeAnyLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return before(name, callback as Callback, Object.assign({}, options, { localOnly: true, entryType: undefined }));
            else
                return before(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true, entryType: undefined }));
        }

        function beforeAnyDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeAnyDeep(callback : Callback, options?: HookOptions) : void;
        function beforeAnyDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return before(name, callback as Callback, Object.assign({}, options, { localOnly: false, entryType: undefined }));
            else
                return before(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false, entryType: undefined }));
        }

        function beforeDescribe(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeDescribe(callback : Callback, options?: HookOptions) : void;
        function beforeDescribe(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return before(name, callback as Callback, Object.assign({}, options, { entryType: EnumNodeEntry.describe }));
            else
                return before(name as Callback, Object.assign({}, callback as HookOptions, { entryType: EnumNodeEntry.describe }));
        }

        function beforeDescribeLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeDescribeLocal(callback : Callback, options?: HookOptions) : void;
        function beforeDescribeLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return before(name, callback as Callback, Object.assign({}, options, { localOnly: true, entryType: EnumNodeEntry.describe }));
            else
                return before(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true, entryType: EnumNodeEntry.describe }));
        }

        function beforeDescribeDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeDescribeDeep(callback : Callback, options?: HookOptions) : void;
        function beforeDescribeDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return before(name, callback as Callback, Object.assign({}, options, { localOnly: false, entryType: EnumNodeEntry.describe }));
            else
                return before(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false, entryType: EnumNodeEntry.describe }));
        }

        function beforeIt(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeIt(callback : Callback, options?: HookOptions) : void;
        function beforeIt(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return before(name, callback as Callback, Object.assign({}, options, { entryType: EnumNodeEntry.it }));
            else
                return before(name as Callback, Object.assign({}, callback as HookOptions, { entryType: EnumNodeEntry.it }));
        }

        function beforeItLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeItLocal(callback : Callback, options?: HookOptions) : void;
        function beforeItLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return before(name, callback as Callback, Object.assign({}, options, { localOnly: true, entryType: EnumNodeEntry.it }));
            else
                return before(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true, entryType: EnumNodeEntry.it }));
        }

        function beforeItDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeItDeep(callback : Callback, options?: HookOptions) : void;
        function beforeItDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return before(name, callback as Callback, Object.assign({}, options, { localOnly: false, entryType: EnumNodeEntry.it }));
            else
                return before(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false, entryType: EnumNodeEntry.it }));
        }

        before.local = beforeLocal;
        before.deep = beforeDeep;
        before.any = beforeAny;
        before.describe = beforeDescribe;
        before.it = beforeIt;
        beforeAny.local = beforeAnyLocal;
        beforeAny.deep = beforeAnyDeep;
        beforeDescribe.local = beforeDescribeLocal;
        beforeDescribe.deep = beforeDescribeDeep;
        beforeIt.local = beforeItLocal;
        beforeIt.deep = beforeItDeep;

        function beforeEach(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeEach(callback : Callback, options?: HookOptions) : void;
        function beforeEach(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
        }

        function beforeEachLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeEachLocal(callback : Callback, options?: HookOptions) : void;
        function beforeEachLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return beforeEach(name, callback as Callback, Object.assign({}, options, { localOnly: true }));
            else
                return beforeEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true }));
        }

        function beforeEachDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeEachDeep(callback : Callback, options?: HookOptions) : void;
        function beforeEachDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return beforeEach(name, callback as Callback, Object.assign({}, options, { localOnly: false }));
            else
                return beforeEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false }));
        }

        function beforeEachAny(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeEachAny(callback : Callback, options?: HookOptions) : void;
        function beforeEachAny(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return beforeEach(name, callback as Callback, Object.assign({}, options, { entryType: undefined }));
            else
                return beforeEach(name as Callback, Object.assign({}, callback as HookOptions, { entryType: undefined }));
        }

        function beforeEachAnyLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeEachAnyLocal(callback : Callback, options?: HookOptions) : void;
        function beforeEachAnyLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return beforeEach(name, callback as Callback, Object.assign({}, options, { localOnly: true, entryType: undefined }));
            else
                return beforeEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true, entryType: undefined }));
        }

        function beforeEachAnyDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeEachAnyDeep(callback : Callback, options?: HookOptions) : void;
        function beforeEachAnyDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return beforeEach(name, callback as Callback, Object.assign({}, options, { localOnly: false, entryType: undefined }));
            else
                return beforeEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false, entryType: undefined }));
        }

        function beforeEachDescribe(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeEachDescribe(callback : Callback, options?: HookOptions) : void;
        function beforeEachDescribe(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return beforeEach(name, callback as Callback, Object.assign({}, options, { entryType: EnumNodeEntry.describe }));
            else
                return beforeEach(name as Callback, Object.assign({}, callback as HookOptions, { entryType: EnumNodeEntry.describe }));
        }

        function beforeEachDescribeLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeEachDescribeLocal(callback : Callback, options?: HookOptions) : void;
        function beforeEachDescribeLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return beforeEach(name, callback as Callback, Object.assign({}, options, { localOnly: true, entryType: EnumNodeEntry.describe }));
            else
                return beforeEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true, entryType: EnumNodeEntry.describe }));
        }

        function beforeEachDescribeDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeEachDescribeDeep(callback : Callback, options?: HookOptions) : void;
        function beforeEachDescribeDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return beforeEach(name, callback as Callback, Object.assign({}, options, { localOnly: false, entryType: EnumNodeEntry.describe }));
            else
                return beforeEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false, entryType: EnumNodeEntry.describe }));
        }

        function beforeEachIt(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeEachIt(callback : Callback, options?: HookOptions) : void;
        function beforeEachIt(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return beforeEach(name, callback as Callback, Object.assign({}, options, { entryType: EnumNodeEntry.it }));
            else
                return beforeEach(name as Callback, Object.assign({}, callback as HookOptions, { entryType: EnumNodeEntry.it }));
        }

        function beforeEachItLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeEachItLocal(callback : Callback, options?: HookOptions) : void;
        function beforeEachItLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return beforeEach(name, callback as Callback, Object.assign({}, options, { localOnly: true, entryType: EnumNodeEntry.it }));
            else
                return beforeEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true, entryType: EnumNodeEntry.it }));
        }

        function beforeEachItDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function beforeEachItDeep(callback : Callback, options?: HookOptions) : void;
        function beforeEachItDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return beforeEach(name, callback as Callback, Object.assign({}, options, { localOnly: false, entryType: EnumNodeEntry.it }));
            else
                return beforeEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false, entryType: EnumNodeEntry.it }));
        }

        beforeEach.local = beforeEachLocal;
        beforeEach.deep = beforeEachDeep;
        beforeEach.any = beforeEachAny;
        beforeEach.describe = beforeEachDescribe;
        beforeEach.it = beforeEachIt;
        beforeEachAny.local = beforeEachAnyLocal;
        beforeEachAny.deep = beforeEachAnyDeep;
        beforeEachDescribe.local = beforeEachDescribeLocal;
        beforeEachDescribe.deep = beforeEachDescribeDeep;
        beforeEachIt.local = beforeEachItLocal;
        beforeEachIt.deep = beforeEachItDeep;

        function afterEach(name: string, callback : Callback, options?: HookOptions) : void;
        function afterEach(callback : Callback, options?: HookOptions) : void;
        function afterEach(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
        }

        function afterEachLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function afterEachLocal(callback : Callback, options?: HookOptions) : void;
        function afterEachLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return afterEach(name, callback as Callback, Object.assign({}, options, { localOnly: true }));
            else
                return afterEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true }));
        }

        function afterEachDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function afterEachDeep(callback : Callback, options?: HookOptions) : void;
        function afterEachDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return afterEach(name, callback as Callback, Object.assign({}, options, { localOnly: false }));
            else
                return afterEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false }));
        }

        function afterEachAny(name: string, callback : Callback, options?: HookOptions) : void;
        function afterEachAny(callback : Callback, options?: HookOptions) : void;
        function afterEachAny(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return afterEach(name, callback as Callback, Object.assign({}, options, { entryType: undefined }));
            else
                return afterEach(name as Callback, Object.assign({}, callback as HookOptions, { entryType: undefined }));
        }

        function afterEachAnyLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function afterEachAnyLocal(callback : Callback, options?: HookOptions) : void;
        function afterEachAnyLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return afterEach(name, callback as Callback, Object.assign({}, options, { localOnly: true, entryType: undefined }));
            else
                return afterEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true, entryType: undefined }));
        }

        function afterEachAnyDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function afterEachAnyDeep(callback : Callback, options?: HookOptions) : void;
        function afterEachAnyDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return afterEach(name, callback as Callback, Object.assign({}, options, { localOnly: false, entryType: undefined }));
            else
                return afterEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false, entryType: undefined }));
        }

        function afterEachDescribe(name: string, callback : Callback, options?: HookOptions) : void;
        function afterEachDescribe(callback : Callback, options?: HookOptions) : void;
        function afterEachDescribe(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return afterEach(name, callback as Callback, Object.assign({}, options, { entryType: EnumNodeEntry.describe }));
            else
                return afterEach(name as Callback, Object.assign({}, callback as HookOptions, { entryType: EnumNodeEntry.describe }));
        }

        function afterEachDescribeLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function afterEachDescribeLocal(callback : Callback, options?: HookOptions) : void;
        function afterEachDescribeLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return afterEach(name, callback as Callback, Object.assign({}, options, { localOnly: true, entryType: EnumNodeEntry.describe }));
            else
                return afterEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true, entryType: EnumNodeEntry.describe }));
        }

        function afterEachDescribeDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function afterEachDescribeDeep(callback : Callback, options?: HookOptions) : void;
        function afterEachDescribeDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return afterEach(name, callback as Callback, Object.assign({}, options, { localOnly: false, entryType: EnumNodeEntry.describe }));
            else
                return afterEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false, entryType: EnumNodeEntry.describe }));
        }

        function afterEachIt(name: string, callback : Callback, options?: HookOptions) : void;
        function afterEachIt(callback : Callback, options?: HookOptions) : void;
        function afterEachIt(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return afterEach(name, callback as Callback, Object.assign({}, options, { entryType: EnumNodeEntry.it }));
            else
                return afterEach(name as Callback, Object.assign({}, callback as HookOptions, { entryType: EnumNodeEntry.it }));
        }

        function afterEachItLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function afterEachItLocal(callback : Callback, options?: HookOptions) : void;
        function afterEachItLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return afterEach(name, callback as Callback, Object.assign({}, options, { localOnly: true, entryType: EnumNodeEntry.it }));
            else
                return afterEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true, entryType: EnumNodeEntry.it }));
        }

        function afterEachItDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function afterEachItDeep(callback : Callback, options?: HookOptions) : void;
        function afterEachItDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return afterEach(name, callback as Callback, Object.assign({}, options, { localOnly: false, entryType: EnumNodeEntry.it }));
            else
                return afterEach(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false, entryType: EnumNodeEntry.it }));
        }

        afterEach.local = afterEachLocal;
        afterEach.deep = afterEachDeep;
        afterEach.any = afterEachAny;
        afterEach.describe = afterEachDescribe;
        afterEach.it = afterEachIt;
        afterEachAny.local = afterEachAnyLocal;
        afterEachAny.deep = afterEachAnyDeep;
        afterEachDescribe.local = afterEachDescribeLocal;
        afterEachDescribe.deep = afterEachDescribeDeep;
        afterEachIt.local = afterEachItLocal;
        afterEachIt.deep = afterEachItDeep;

        function after(name: string, callback : Callback, options?: HookOptions) : void;
        function after(callback : Callback, options?: HookOptions) : void;
        function after(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
        }

        function afterLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function afterLocal(callback : Callback, options?: HookOptions) : void;
        function afterLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return after(name, callback as Callback, Object.assign({}, options, { localOnly: true }));
            else
                return after(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true }));
        }

        function afterDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function afterDeep(callback : Callback, options?: HookOptions) : void;
        function afterDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return after(name, callback as Callback, Object.assign({}, options, { localOnly: false }));
            else
                return after(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false }));
        }

        function afterAny(name: string, callback : Callback, options?: HookOptions) : void;
        function afterAny(callback : Callback, options?: HookOptions) : void;
        function afterAny(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return after(name, callback as Callback, Object.assign({}, options, { entryType: undefined }));
            else
                return after(name as Callback, Object.assign({}, callback as HookOptions, { entryType: undefined }));
        }

        function afterAnyLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function afterAnyLocal(callback : Callback, options?: HookOptions) : void;
        function afterAnyLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return after(name, callback as Callback, Object.assign({}, options, { localOnly: true, entryType: undefined }));
            else
                return after(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true, entryType: undefined }));
        }

        function afterAnyDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function afterAnyDeep(callback : Callback, options?: HookOptions) : void;
        function afterAnyDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return after(name, callback as Callback, Object.assign({}, options, { localOnly: false, entryType: undefined }));
            else
                return after(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false, entryType: undefined }));
        }

        function afterDescribe(name: string, callback : Callback, options?: HookOptions) : void;
        function afterDescribe(callback : Callback, options?: HookOptions) : void;
        function afterDescribe(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return after(name, callback as Callback, Object.assign({}, options, { entryType: EnumNodeEntry.describe }));
            else
                return after(name as Callback, Object.assign({}, callback as HookOptions, { entryType: EnumNodeEntry.describe }));
        }

        function afterDescribeLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function afterDescribeLocal(callback : Callback, options?: HookOptions) : void;
        function afterDescribeLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return after(name, callback as Callback, Object.assign({}, options, { localOnly: true, entryType: EnumNodeEntry.describe }));
            else
                return after(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true, entryType: EnumNodeEntry.describe }));
        }

        function afterDescribeDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function afterDescribeDeep(callback : Callback, options?: HookOptions) : void;
        function afterDescribeDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return after(name, callback as Callback, Object.assign({}, options, { localOnly: false, entryType: EnumNodeEntry.describe }));
            else
                return after(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false, entryType: EnumNodeEntry.describe }));
        }

        function afterIt(name: string, callback : Callback, options?: HookOptions) : void;
        function afterIt(callback : Callback, options?: HookOptions) : void;
        function afterIt(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return after(name, callback as Callback, Object.assign({}, options, { entryType: EnumNodeEntry.it }));
            else
                return after(name as Callback, Object.assign({}, callback as HookOptions, { entryType: EnumNodeEntry.it }));
        }

        function afterItLocal(name: string, callback : Callback, options?: HookOptions) : void;
        function afterItLocal(callback : Callback, options?: HookOptions) : void;
        function afterItLocal(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return after(name, callback as Callback, Object.assign({}, options, { localOnly: true, entryType: EnumNodeEntry.it }));
            else
                return after(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: true, entryType: EnumNodeEntry.it }));
        }

        function afterItDeep(name: string, callback : Callback, options?: HookOptions) : void;
        function afterItDeep(callback : Callback, options?: HookOptions) : void;
        function afterItDeep(name: string | Callback, callback : Callback | HookOptions, options?: HookOptions) : void {
            if (typeof name === 'string')
                return after(name, callback as Callback, Object.assign({}, options, { localOnly: false, entryType: EnumNodeEntry.it }));
            else
                return after(name as Callback, Object.assign({}, callback as HookOptions, { localOnly: false, entryType: EnumNodeEntry.it }));
        }

        after.local = afterLocal;
        after.deep = afterDeep;
        after.any = afterAny;
        after.describe = afterDescribe;
        after.it = afterIt;
        afterAny.local = afterAnyLocal;
        afterAny.deep = afterAnyDeep;
        afterDescribe.local = afterDescribeLocal;
        afterDescribe.deep = afterDescribeDeep;
        afterIt.local = afterItLocal;
        afterIt.deep = afterItDeep;

        return {
            testish,

            describe,
            it,

            before,
            beforeEach,
            afterEach,
            after
        }
    };

    return _testish(rootDefaults);
}