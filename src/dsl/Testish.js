"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Options_1 = require("./Options");
const Reporter_1 = require("../Reporters/Reporter");
const EntryType_1 = require("./EntryType");
const advanced_promises_1 = require("advanced-promises");
const resolveTimeout_1 = require("./resolveTimeout");
function testish(options) {
    const rootDefaults = Object.assign({}, options, { name: 'root', callback: undefined, nodeType: EntryType_1.EnumNodeEntry.describe });
    const reporter = rootDefaults.reporter;
    delete rootDefaults.reporter;
    let resolve, reject, aapi;
    const root = new advanced_promises_1.Abortable((res, rej, oa) => {
        resolve = res;
        reject = rej;
        aapi = oa;
    });
    let filter = rootDefaults.filter || false;
    resolve();
    let state = {
        hooks: [],
        nodes: root,
        options: {},
        context: {
            name: 'root',
            parents: [],
            aapi: aapi
        }
    };
    aapi.name = 'root';
    const _testish = function testish(defaults) {
        defaults = Object.assign({}, defaults);
        function testish(options) {
            return _testish(Object.assign({}, defaults, options));
        }
        function node(entryType, name, callback, options) {
            // inherit options from parent
            options = Object.assign({}, Object
                .keys(defaults)
                .filter(key => Options_1.EnumNodeOptionsInheritable.includes(key))
                .reduce((obj, key) => {
                obj[key] = defaults[key];
                return obj;
            }, {}), Object
                .keys(state.options)
                .filter(key => Options_1.EnumNodeOptionsInheritable.includes(key))
                .reduce((obj, key) => {
                obj[key] = state.options[key];
                return obj;
            }, {}), options);
            return state.nodes = state.nodes.then(async () => {
                const outer = state;
                const wait = advanced_promises_1.Abortable.fromAsync(async (aapi) => {
                    aapi.on(() => console.log(`abort ${name} from outer`));
                    const EX_TIMEOUT = new Error(`timeout ${name} inner`);
                    const EX_ABORT = new Error(`abort ${name} inner`);
                    const inner = {
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
                    aapi.name = `${name} layer 1`;
                    const report = async (evenType, ex) => {
                        try {
                            await reporter.on({
                                name: inner.context.name,
                                entry: entryType,
                                type: evenType,
                                context: inner.context,
                                exception: ex
                            });
                        }
                        catch (ex) {
                            console.log('error during reporting');
                        }
                    };
                    const skip = options.skip || (filter && !options.only && entryType === EntryType_1.EnumNodeEntry.it);
                    const wait = !skip
                        ? advanced_promises_1.Abortable.fromAsync(async (aapi) => {
                            inner.context.aapi = aapi;
                            aapi.name = `${name} layer 2`;
                            aapi.on(() => console.log(`abort ${name} from inner`));
                            await Promise.resolve();
                            await callback.call(inner.context, inner.context);
                            await inner.nodes;
                        }).withTimeout(resolveTimeout_1.resolveTimeout(entryType, options), { resolve: EX_TIMEOUT }).withAutoAbort(aapi, { resolve: EX_ABORT })
                        : undefined;
                    await report(Reporter_1.EventType.ENTER);
                    try {
                        if (!skip) {
                            const result = await wait;
                            if (result === EX_TIMEOUT || result === EX_ABORT) {
                                if (options.safeAbort) {
                                    await report(Reporter_1.EventType.PENDING);
                                    await wait.promise;
                                }
                                if (result === EX_TIMEOUT)
                                    await report(Reporter_1.EventType.TIMEOUT);
                                else if (result === EX_ABORT)
                                    await report(Reporter_1.EventType.ABORT);
                            }
                            else
                                await report(Reporter_1.EventType.SUCCESS);
                        }
                        else {
                            await report(Reporter_1.EventType.SKIPPED);
                        }
                    }
                    catch (ex) {
                        await report(Reporter_1.EventType.FAILURE, ex);
                        if (entryType !== EntryType_1.EnumNodeEntry.it)
                            throw ex;
                    }
                    finally {
                        await report(Reporter_1.EventType.LEAVE);
                        state = outer;
                    }
                }).withAutoAbort(outer.context.aapi, { resolve: undefined });
                try {
                    await wait;
                }
                finally {
                    await wait.promise;
                }
            });
        }
        function describe(name, callback, options) {
            return node(EntryType_1.EnumNodeEntry.describe, typeof name === 'string' ? name : callback.name, callback, options);
        }
        function describeOnly(name, callback, options) {
            if (typeof name === 'string')
                return describe(name, callback, Object.assign({}, options, { only: true, skip: false }));
            else
                return describe(name, Object.assign({}, callback, { only: true, skip: false }));
        }
        function describeSkip(name, callback, options) {
            if (typeof name === 'string')
                return describe(name, callback, Object.assign({}, options, { only: false, skip: true }));
            else
                return describe(name, Object.assign({}, callback, { only: false, skip: true }));
        }
        describe.only = describeOnly;
        describe.skip = describeSkip;
        function it(name, callback, options) {
            return node(EntryType_1.EnumNodeEntry.it, typeof name === 'string' ? name : callback.name, callback, options);
        }
        function itOnly(name, callback, options) {
            if (typeof name === 'string')
                return it(name, callback, Object.assign({}, options, { only: true, skip: false }));
            else
                return it(name, Object.assign({}, callback, { only: true, skip: false }));
        }
        function itSkip(name, callback, options) {
            if (typeof name === 'string')
                return it(name, callback, Object.assign({}, options, { only: false, skip: true }));
            else
                return it(name, Object.assign({}, callback, { only: false, skip: true }));
        }
        it.only = itOnly;
        it.skip = itSkip;
        function before(name, callback, options) {
        }
        function beforeLocal(name, callback, options) {
            if (typeof name === 'string')
                return before(name, callback, Object.assign({}, options, { localOnly: true }));
            else
                return before(name, Object.assign({}, callback, { localOnly: true }));
        }
        function beforeDeep(name, callback, options) {
            if (typeof name === 'string')
                return before(name, callback, Object.assign({}, options, { localOnly: false }));
            else
                return before(name, Object.assign({}, callback, { localOnly: false }));
        }
        function beforeAny(name, callback, options) {
            if (typeof name === 'string')
                return before(name, callback, Object.assign({}, options, { entryType: undefined }));
            else
                return before(name, Object.assign({}, callback, { entryType: undefined }));
        }
        function beforeAnyLocal(name, callback, options) {
            if (typeof name === 'string')
                return before(name, callback, Object.assign({}, options, { localOnly: true, entryType: undefined }));
            else
                return before(name, Object.assign({}, callback, { localOnly: true, entryType: undefined }));
        }
        function beforeAnyDeep(name, callback, options) {
            if (typeof name === 'string')
                return before(name, callback, Object.assign({}, options, { localOnly: false, entryType: undefined }));
            else
                return before(name, Object.assign({}, callback, { localOnly: false, entryType: undefined }));
        }
        function beforeDescribe(name, callback, options) {
            if (typeof name === 'string')
                return before(name, callback, Object.assign({}, options, { entryType: EntryType_1.EnumNodeEntry.describe }));
            else
                return before(name, Object.assign({}, callback, { entryType: EntryType_1.EnumNodeEntry.describe }));
        }
        function beforeDescribeLocal(name, callback, options) {
            if (typeof name === 'string')
                return before(name, callback, Object.assign({}, options, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.describe }));
            else
                return before(name, Object.assign({}, callback, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.describe }));
        }
        function beforeDescribeDeep(name, callback, options) {
            if (typeof name === 'string')
                return before(name, callback, Object.assign({}, options, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.describe }));
            else
                return before(name, Object.assign({}, callback, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.describe }));
        }
        function beforeIt(name, callback, options) {
            if (typeof name === 'string')
                return before(name, callback, Object.assign({}, options, { entryType: EntryType_1.EnumNodeEntry.it }));
            else
                return before(name, Object.assign({}, callback, { entryType: EntryType_1.EnumNodeEntry.it }));
        }
        function beforeItLocal(name, callback, options) {
            if (typeof name === 'string')
                return before(name, callback, Object.assign({}, options, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.it }));
            else
                return before(name, Object.assign({}, callback, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.it }));
        }
        function beforeItDeep(name, callback, options) {
            if (typeof name === 'string')
                return before(name, callback, Object.assign({}, options, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.it }));
            else
                return before(name, Object.assign({}, callback, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.it }));
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
        function beforeEach(name, callback, options) {
        }
        function beforeEachLocal(name, callback, options) {
            if (typeof name === 'string')
                return beforeEach(name, callback, Object.assign({}, options, { localOnly: true }));
            else
                return beforeEach(name, Object.assign({}, callback, { localOnly: true }));
        }
        function beforeEachDeep(name, callback, options) {
            if (typeof name === 'string')
                return beforeEach(name, callback, Object.assign({}, options, { localOnly: false }));
            else
                return beforeEach(name, Object.assign({}, callback, { localOnly: false }));
        }
        function beforeEachAny(name, callback, options) {
            if (typeof name === 'string')
                return beforeEach(name, callback, Object.assign({}, options, { entryType: undefined }));
            else
                return beforeEach(name, Object.assign({}, callback, { entryType: undefined }));
        }
        function beforeEachAnyLocal(name, callback, options) {
            if (typeof name === 'string')
                return beforeEach(name, callback, Object.assign({}, options, { localOnly: true, entryType: undefined }));
            else
                return beforeEach(name, Object.assign({}, callback, { localOnly: true, entryType: undefined }));
        }
        function beforeEachAnyDeep(name, callback, options) {
            if (typeof name === 'string')
                return beforeEach(name, callback, Object.assign({}, options, { localOnly: false, entryType: undefined }));
            else
                return beforeEach(name, Object.assign({}, callback, { localOnly: false, entryType: undefined }));
        }
        function beforeEachDescribe(name, callback, options) {
            if (typeof name === 'string')
                return beforeEach(name, callback, Object.assign({}, options, { entryType: EntryType_1.EnumNodeEntry.describe }));
            else
                return beforeEach(name, Object.assign({}, callback, { entryType: EntryType_1.EnumNodeEntry.describe }));
        }
        function beforeEachDescribeLocal(name, callback, options) {
            if (typeof name === 'string')
                return beforeEach(name, callback, Object.assign({}, options, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.describe }));
            else
                return beforeEach(name, Object.assign({}, callback, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.describe }));
        }
        function beforeEachDescribeDeep(name, callback, options) {
            if (typeof name === 'string')
                return beforeEach(name, callback, Object.assign({}, options, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.describe }));
            else
                return beforeEach(name, Object.assign({}, callback, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.describe }));
        }
        function beforeEachIt(name, callback, options) {
            if (typeof name === 'string')
                return beforeEach(name, callback, Object.assign({}, options, { entryType: EntryType_1.EnumNodeEntry.it }));
            else
                return beforeEach(name, Object.assign({}, callback, { entryType: EntryType_1.EnumNodeEntry.it }));
        }
        function beforeEachItLocal(name, callback, options) {
            if (typeof name === 'string')
                return beforeEach(name, callback, Object.assign({}, options, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.it }));
            else
                return beforeEach(name, Object.assign({}, callback, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.it }));
        }
        function beforeEachItDeep(name, callback, options) {
            if (typeof name === 'string')
                return beforeEach(name, callback, Object.assign({}, options, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.it }));
            else
                return beforeEach(name, Object.assign({}, callback, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.it }));
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
        function afterEach(name, callback, options) {
        }
        function afterEachLocal(name, callback, options) {
            if (typeof name === 'string')
                return afterEach(name, callback, Object.assign({}, options, { localOnly: true }));
            else
                return afterEach(name, Object.assign({}, callback, { localOnly: true }));
        }
        function afterEachDeep(name, callback, options) {
            if (typeof name === 'string')
                return afterEach(name, callback, Object.assign({}, options, { localOnly: false }));
            else
                return afterEach(name, Object.assign({}, callback, { localOnly: false }));
        }
        function afterEachAny(name, callback, options) {
            if (typeof name === 'string')
                return afterEach(name, callback, Object.assign({}, options, { entryType: undefined }));
            else
                return afterEach(name, Object.assign({}, callback, { entryType: undefined }));
        }
        function afterEachAnyLocal(name, callback, options) {
            if (typeof name === 'string')
                return afterEach(name, callback, Object.assign({}, options, { localOnly: true, entryType: undefined }));
            else
                return afterEach(name, Object.assign({}, callback, { localOnly: true, entryType: undefined }));
        }
        function afterEachAnyDeep(name, callback, options) {
            if (typeof name === 'string')
                return afterEach(name, callback, Object.assign({}, options, { localOnly: false, entryType: undefined }));
            else
                return afterEach(name, Object.assign({}, callback, { localOnly: false, entryType: undefined }));
        }
        function afterEachDescribe(name, callback, options) {
            if (typeof name === 'string')
                return afterEach(name, callback, Object.assign({}, options, { entryType: EntryType_1.EnumNodeEntry.describe }));
            else
                return afterEach(name, Object.assign({}, callback, { entryType: EntryType_1.EnumNodeEntry.describe }));
        }
        function afterEachDescribeLocal(name, callback, options) {
            if (typeof name === 'string')
                return afterEach(name, callback, Object.assign({}, options, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.describe }));
            else
                return afterEach(name, Object.assign({}, callback, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.describe }));
        }
        function afterEachDescribeDeep(name, callback, options) {
            if (typeof name === 'string')
                return afterEach(name, callback, Object.assign({}, options, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.describe }));
            else
                return afterEach(name, Object.assign({}, callback, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.describe }));
        }
        function afterEachIt(name, callback, options) {
            if (typeof name === 'string')
                return afterEach(name, callback, Object.assign({}, options, { entryType: EntryType_1.EnumNodeEntry.it }));
            else
                return afterEach(name, Object.assign({}, callback, { entryType: EntryType_1.EnumNodeEntry.it }));
        }
        function afterEachItLocal(name, callback, options) {
            if (typeof name === 'string')
                return afterEach(name, callback, Object.assign({}, options, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.it }));
            else
                return afterEach(name, Object.assign({}, callback, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.it }));
        }
        function afterEachItDeep(name, callback, options) {
            if (typeof name === 'string')
                return afterEach(name, callback, Object.assign({}, options, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.it }));
            else
                return afterEach(name, Object.assign({}, callback, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.it }));
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
        function after(name, callback, options) {
        }
        function afterLocal(name, callback, options) {
            if (typeof name === 'string')
                return after(name, callback, Object.assign({}, options, { localOnly: true }));
            else
                return after(name, Object.assign({}, callback, { localOnly: true }));
        }
        function afterDeep(name, callback, options) {
            if (typeof name === 'string')
                return after(name, callback, Object.assign({}, options, { localOnly: false }));
            else
                return after(name, Object.assign({}, callback, { localOnly: false }));
        }
        function afterAny(name, callback, options) {
            if (typeof name === 'string')
                return after(name, callback, Object.assign({}, options, { entryType: undefined }));
            else
                return after(name, Object.assign({}, callback, { entryType: undefined }));
        }
        function afterAnyLocal(name, callback, options) {
            if (typeof name === 'string')
                return after(name, callback, Object.assign({}, options, { localOnly: true, entryType: undefined }));
            else
                return after(name, Object.assign({}, callback, { localOnly: true, entryType: undefined }));
        }
        function afterAnyDeep(name, callback, options) {
            if (typeof name === 'string')
                return after(name, callback, Object.assign({}, options, { localOnly: false, entryType: undefined }));
            else
                return after(name, Object.assign({}, callback, { localOnly: false, entryType: undefined }));
        }
        function afterDescribe(name, callback, options) {
            if (typeof name === 'string')
                return after(name, callback, Object.assign({}, options, { entryType: EntryType_1.EnumNodeEntry.describe }));
            else
                return after(name, Object.assign({}, callback, { entryType: EntryType_1.EnumNodeEntry.describe }));
        }
        function afterDescribeLocal(name, callback, options) {
            if (typeof name === 'string')
                return after(name, callback, Object.assign({}, options, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.describe }));
            else
                return after(name, Object.assign({}, callback, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.describe }));
        }
        function afterDescribeDeep(name, callback, options) {
            if (typeof name === 'string')
                return after(name, callback, Object.assign({}, options, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.describe }));
            else
                return after(name, Object.assign({}, callback, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.describe }));
        }
        function afterIt(name, callback, options) {
            if (typeof name === 'string')
                return after(name, callback, Object.assign({}, options, { entryType: EntryType_1.EnumNodeEntry.it }));
            else
                return after(name, Object.assign({}, callback, { entryType: EntryType_1.EnumNodeEntry.it }));
        }
        function afterItLocal(name, callback, options) {
            if (typeof name === 'string')
                return after(name, callback, Object.assign({}, options, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.it }));
            else
                return after(name, Object.assign({}, callback, { localOnly: true, entryType: EntryType_1.EnumNodeEntry.it }));
        }
        function afterItDeep(name, callback, options) {
            if (typeof name === 'string')
                return after(name, callback, Object.assign({}, options, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.it }));
            else
                return after(name, Object.assign({}, callback, { localOnly: false, entryType: EntryType_1.EnumNodeEntry.it }));
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
        };
    };
    return _testish(rootDefaults);
}
exports.testish = testish;
//# sourceMappingURL=Testish.js.map