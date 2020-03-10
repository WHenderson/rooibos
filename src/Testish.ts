import {BlockType, Callback, EventType, Reporter, Stack} from "./types";
import {ABORT_STATE, Abortable, AbortApi, Timeout} from 'advanced-promises';
import {strict as assert} from 'assert';
import {NullReporter} from "./Reporters/NullReporter";

export class Testish {
    private stack : Stack[];
    private reporter : Reporter;

    constructor(options: { reporter?: Reporter; description?: string; promise?: PromiseLike<void> | Abortable<void>; data?: object, aapi?:AbortApi } = {}) {
        this.reporter = options.reporter || new NullReporter();
        this.push({
            blockType: BlockType.SCRIPT,
            description: options.description,
            promise: options.promise,
            aapi: options.aapi
        });
    }

    private get stackItem() { return this.stack[0]; }
    private get promise() { return this.stackItem.promise; }
    private set promise(val) { this.stackItem.promise = val; }
    private get context() { return this.stackItem.context; }
    private get aapi() { return this.stackItem.aapi; }
    private get hooks() { return this.stackItem.hooks; }
    private then(cb: () => Promise<void>) : Promise<void> {
        return this.promise = this.promise.then(cb);
    }

    private push(options: { blockType: BlockType, description: string, promise: PromiseLike<void> | Abortable<void>, aapi?:AbortApi}) : Stack {
        const promise : Abortable<void> = options.promise ? ('aapi' in options.promise ? options.promise : Abortable.fromPromise(options.promise)) : Abortable.resolve();

        const stackItem : Stack = {
            promise: this.stack.length ? promise.withAutoAbort(this.context.aapi) : promise,
            hooks: [],
            aapi: options.aapi,
            context: Object.freeze({
                blockType: options.blockType,
                description: options.description,
                parent: this.context,
                data: {},
                get aapi() { return stackItem.aapi; }
            })
        };

        this.stack.unshift(stackItem);
        return stackItem;
    }

    private pop(stack: Stack) {
        const found = this.stack.shift();
        assert(found === stack);
    }

    describe(description: string, callback: Callback) : PromiseLike<void> {
        return this.then(async () => {
            await Promise.resolve();

            const parentAapi = this.aapi;
            const ownStackItem = this.push({
                blockType: BlockType.DESCRIBE,
                description,
                promise: Promise.resolve()
            });

            const report = async (eventType: EventType, exception?: Error) => this.reporter.on({
                blockType: BlockType.DESCRIBE,
                eventType,
                context: ownStackItem.context,
                exception
            });

            await report(EventType.ENTER);

            const RES_ABORT = {};
            const RES_TIMEOUT = {};

            if (this.aapi.state !== ABORT_STATE.NONE) {
                // skip if already aborting
                await report(EventType.SKIP);
                return;
            }

            const wait = Abortable
                .fromAsync<void|object>(async () => {
                    await Promise.resolve();
                    try {
                        await callback.call(this.context, this.context);
                    }
                    catch (ex) {
                        exception = ex;
                        // abort children
                        await wait.abortWith({ resolve: RES_ABORT });
                        throw ex;
                    }
                    finally {
                        await ownStackItem.promise;
                    }
                })
                .withAutoAbort(parentAapi, { resolve: RES_ABORT })
                .withTimeout(Timeout.INF, { resolve: RES_TIMEOUT });

            ownStackItem.aapi = wait.aapi;

            let exception : Error = undefined;
            let res = undefined;
            try {
                const res = await wait;
                if (res === RES_TIMEOUT)
                    await report(EventType.TIMEOUT);
                else if (res === RES_ABORT)
                    await report(EventType.ABORT);

                // wait for safe termination of promise
                await wait.promise;
            }
            finally {
                if (exception)
                    await report(EventType.LEAVE_EXCEPTION, exception);
                else if (res === RES_TIMEOUT)
                    await report(EventType.LEAVE_TIMEOUT);
                else if (res === RES_ABORT)
                    await report(EventType.LEAVE_ABORT);
                else
                    await report(EventType.LEAVE_SUCCESS);

                this.pop(ownStackItem);
            }
        });
    }

    it(description: string, callback: Callback) : PromiseLike<void> {
        return this.then(async () => {
            await Promise.resolve();

            const report = async (eventType: EventType, exception?: Error) => {};

            if (this.aapi.state !== ABORT_STATE.NONE) {
                // skip if already aborting
                await report(EventType.SKIP);
                return;
            }

            const parentAapi = this.aapi;
            const ownStackItem = this.push({
                blockType: BlockType.DESCRIBE,
                description,
                promise: Promise.resolve()
            });

            await report(EventType.ENTER);

            const RES_ABORT = {};
            const RES_TIMEOUT = {};

            const wait = Abortable
                .fromAsync<void|object>(async () => {
                    await Promise.resolve();
                    try {
                        await callback.call(this.context, this.context);
                    }
                    catch (ex) {
                        exception = ex;
                        // abort children
                        wait.abortWith({ resolve: RES_ABORT });
                        throw ex;
                    }
                    finally {
                        await ownStackItem.promise;
                    }
                })
                .withAutoAbort(parentAapi, { resolve: RES_ABORT })
                .withTimeout(Timeout.INF, { resolve: RES_TIMEOUT });

            ownStackItem.aapi = wait.aapi;

            let exception : Error = undefined;
            let res = undefined;
            try {
                const res = await wait;
                if (res === RES_TIMEOUT)
                    await report(EventType.TIMEOUT);
                else if (res === RES_ABORT)
                    await report(EventType.ABORT);

                // wait for safe termination of promise
                await wait.promise;
            }
            catch (ex) {
                await report(EventType.EXCEPTION, ex);

                exception = ex;
                throw ex;
            }
            finally {
                try {
                    await ownStackItem.promise;
                }
                catch (ex) {
                    await report(EventType.EXCEPTION, ex);

                    exception = exception || ex;
                    // noinspection ThrowInsideFinallyBlockJS
                    throw ex;
                }
                finally {
                    if (exception)
                        await report(EventType.LEAVE_EXCEPTION, exception);
                    else if (res === RES_TIMEOUT)
                        await report(EventType.LEAVE_TIMEOUT);
                    else if (res === RES_ABORT)
                        await report(EventType.LEAVE_ABORT);
                    else
                        await report(EventType.LEAVE_SUCCESS);

                    this.pop(ownStackItem);
                }
            }
        });
    }
}