import {
    BlockType,
    Callback,
    Event,
    EventType,
    Hook,
    HookDepth,
    HookOptions,
    HookWhen,
    JsonValue,
    Reporter,
    Stack
} from "./types";
import {ABORT_STATE, Abortable, AbortApi, AbortApiPublic, Timeout} from 'advanced-promises';
import {strict as assert} from 'assert';
import {NullReporter} from "./Reporters/NullReporter";
import {Guid} from "guid-typescript";

export interface BlockOptions {
    timeout?: number;
}

export class Testish {
    private readonly stack : Stack[];
    private readonly reporter : Reporter;

    constructor(options: { reporter?: Reporter; description?: string; promise?: Promise<void>; data?: object, aapi?:AbortApi } = {}) {
        this.reporter = options.reporter || new NullReporter();
        this.stack = [];
        this.push({
            blockType: BlockType.SCRIPT,
            description: options.description,
            promise: options.promise,
            aapi: options.aapi
        });
    }

    private get stackItem() { return this.stack.length && this.stack[0]; }
    private get parentStackItem() { return this.stack.length > 1 ? this.stack[1] : undefined; }
    private get promise() { return this.stackItem.promise; }
    private set promise(val) { this.stackItem.promise = val; }
    private get context() { return this.stack.length && this.stackItem.context; }
    private get aapi() { return this.stackItem.aapi; }
    private get hooks() { return this.stackItem.hooks; }
    private then(cb: () => void | Promise<void>) : Promise<void> {
        return this.promise = this.promise.then(cb);
    }
    private report(eventType: EventType, details : Omit<Event, "eventType">, exception?: Error) : Promise<void> {
        return this.reporter.on(Object.assign(
            { eventType },
            details,
            exception ? { exception} : {}
        ));
    }
    private reportBlock(eventType: EventType, exception?: Error) : Promise<void> {
        const stackItem = this.stackItem;
        return this.report(
            eventType,
            {
                blockType: stackItem.context.blockType,
                context: stackItem.context,
                description: stackItem.context.description
            },
            exception
        )
    }

    private push(options: { blockType: BlockType, description: string, promise?: Promise<void>, aapi?:AbortApi}) : Stack {
        const stackItem : Stack = {
            promise: options.promise || Promise.resolve(),
            hooks: [],
            aapi: options.aapi || new AbortApiPublic(),
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

    private findHooks({blockType, when} : { blockType: BlockType, when: HookWhen}) {
        const hooks : Hook[] = [];

        // Only DESCRIBE and IT have hooks so far
        if (blockType !== BlockType.DESCRIBE && blockType !== BlockType.IT)
            return hooks;

        const parentStackItem = this.parentStackItem;

        for (let stackItem of this.stack.slice().reverse()) {
            for (let hook of stackItem.hooks) {
                // blockType
                if (hook.blockTypes && hook.blockTypes.length && !hook.blockTypes.includes(blockType))
                    continue;

                // when
                if (hook.when !== when && hook.when !== HookWhen.BOTH)
                    continue;

                // depth
                if (!(hook.depth === HookDepth.ALL) && !(stackItem === parentStackItem && hook.depth === HookDepth.SHALLOW) && !(stackItem !== parentStackItem && hook.depth === HookDepth.DEEP))
                    continue;

                hooks.push(hook);
            }
        }
        return hooks;
    }

    private async runHooks(hooks: Hook[], exception?: Error) {
        const ownStackItem = this.stackItem;

        await hooks
            .reduce((cur, hook) => {
                return cur.then(
                    async () => {
                        await this.run({
                            callback: hook.callback,
                            blockType: BlockType.HOOK,
                            description: hook.description,
                            timeout: hook.timeout,
                            aapi: ownStackItem.aapi,
                            reportDefaults: {
                                blockType: BlockType.HOOK,
                                description: hook.description,
                                hookOptions: hook,
                                context: ownStackItem.context
                            },
                            evaluateNested: false,
                            discardExceptions: false
                        });
                    },
                    async (exception) => {
                        this.report(
                            EventType.SKIP,
                            {
                                context: ownStackItem.context,
                                hookOptions: hook,
                                description: hook.description,
                                blockType: BlockType.HOOK
                            }
                        );
                        throw exception;
                    }
                )
            }, exception ? Promise.reject(exception) : Promise.resolve());
    }

    private async run({callback, blockType, description, discardExceptions, evaluateNested, timeout, reportDefaults, aapi}: { callback: Callback; blockType: BlockType; description: string; discardExceptions: boolean; evaluateNested; timeout: number; reportDefaults: Omit<Event, "eventType">; aapi: AbortApi}) {
        const ownStackItem = this.stackItem;

        const report = (eventType: EventType, exception?: Error) : Promise<void> =>
            this.report(eventType, Object.assign({}, reportDefaults, {exception}));

        const EX_SKIP: Error = new Error('skip');

        let exception: Error = undefined;

        try {
            await this.runHooks(this.findHooks({blockType, when: HookWhen.BEFORE}), aapi.state !== ABORT_STATE.NONE ? EX_SKIP : undefined);
        } catch (ex) {
            exception = ex;
        }

        const RES_ABORT = new Error('Abort');
        const RES_TIMEOUT = new Error('Timeout');

        let res = undefined;

        try {
            if (!exception) {
                await report(EventType.ENTER);

                const wait = Abortable
                    .fromAsync<void | Error>(async () => {
                        await Promise.resolve();
                        try {
                            await callback.call(ownStackItem.context, ownStackItem.context);
                        } catch (ex) {
                            exception = exception || ex;

                            // signal abort
                            const waitAbort = wait.abortWith({resolve: RES_ABORT});
                            // report error
                            await report(EventType.EXCEPTION, exception);
                            // wait for abort to finish
                            await waitAbort;

                            throw ex;
                        } finally {
                            if (evaluateNested)
                                await ownStackItem.promise;
                        }
                    })
                    .withAutoAbort(aapi, {resolve: RES_ABORT})
                    .withTimeout(timeout, {resolve: RES_TIMEOUT});

                ownStackItem.aapi = wait.aapi;

                res = await wait;
                if (res === RES_TIMEOUT) {
                    exception = res;
                    await report(EventType.TIMEOUT, exception);
                } else if (res === RES_ABORT) {
                    if (!exception)
                        await report(EventType.ABORT, exception);
                }

                // wait for safe termination of promise
                await wait.promise;

                if (res === RES_TIMEOUT)
                    throw res;
            }
            else {
                await report(EventType.SKIP);
            }
        } catch (ex) {
            if (exception !== ex) {
                exception = ex;
                await report(EventType.EXCEPTION, ex);
            }
            if (!discardExceptions)
                throw ex;
        } finally {
            if (exception === EX_SKIP)
                {}
            else if (exception && exception !== RES_TIMEOUT)
                await report(EventType.LEAVE_EXCEPTION, exception);
            else if (res === RES_TIMEOUT)
                await report(EventType.LEAVE_TIMEOUT, exception);
            else if (res === RES_ABORT)
                await report(EventType.LEAVE_ABORT);
            else
                await report(EventType.LEAVE_SUCCESS);

            try {
                await this.runHooks(this.findHooks({blockType, when: HookWhen.AFTER}), exception);
            } catch (ex) {
                if (ex !== exception)
                    throw ex;
            }
        }
    }

    private block(blockType: BlockType, description: string, callback: Callback, options: BlockOptions) : void | Promise<void> {
        if (blockType === BlockType.IT && blockType === this.context.blockType)
            throw new Error('Cannot nest "it" blocks');

        const { timeout } = Object.assign({
            timeout: Timeout.INF
        }, options);

        return this.promise = this.promise.then(
            async () => {
                await Promise.resolve();

                const parentAapi = this.aapi;
                const ownStackItem = this.push({
                    blockType,
                    description
                });

                try {
                    await this.run({
                        callback,
                        discardExceptions: blockType === BlockType.IT,
                        evaluateNested: true,
                        reportDefaults: {
                            blockType,
                            description,
                            context: ownStackItem.context
                        },
                        description,
                        blockType,
                        aapi: parentAapi,
                        timeout
                    })
                }
                finally {
                    this.pop(ownStackItem);
                }
            },
            async (exception) => {
                const ownStackItem = this.push({
                    blockType,
                    description
                });

                await this.reportBlock(EventType.SKIP, exception);

                this.pop(ownStackItem);

                throw exception;
            }
        );
    }

    private skipBlock(blockType: BlockType, description: string, callback: Callback, options?: BlockOptions) : void | Promise<void> {
        const skip = async (exception?: Error) => {
            const ownStackItem = this.push({
                blockType,
                description
            });

            await this.reportBlock(EventType.SKIP, exception);

            this.pop(ownStackItem);

            if (exception)
                throw exception;
        };

        return this.promise = this.promise.then(
            async () => {
                await skip();
            },
            async (exception) => {
                await skip(exception);
            }
        )
    }

    describe(description: string, callback: Callback, options?: BlockOptions) : void | Promise<void> {
        return this.block(BlockType.DESCRIBE, description, callback, options);
    }

    describeSkip(description: string, callback: Callback, options?: BlockOptions) : void | Promise<void> {
        return this.skipBlock(BlockType.DESCRIBE, description, callback);
    }

    it(description: string, callback: Callback, options?: BlockOptions) : void | Promise<void> {
        return this.block(BlockType.IT, description, callback, options);
    }

    itSkip(description: string, callback: Callback, options?: BlockOptions) : void | Promise<void> {
        return this.skipBlock(BlockType.IT, description, callback);
    }

    async note(id: Guid, description: string, value: JsonValue) : Promise<void> {
        return this.promise = this.promise.then(
            async () => {
                await this.report(EventType.NOTE, {
                    blockType: BlockType.NOTE,
                    context: this.context,
                    description,
                    id,
                    value
                });
            }
        );
    }

    hook(description: string, callback: Callback, options?: Partial<HookOptions>) : void {
        const opts : Hook = Object.assign({
            blockTypes: [],
            when: HookWhen.BOTH,
            depth: HookDepth.SHALLOW,
            timeout: Timeout.INF,
            description,
            callback,
            creationContext: this.context
        }, options);

        this.stackItem.hooks.push(opts);
    }

    done() : Promise<void> {
        return this.promise;
    }
}