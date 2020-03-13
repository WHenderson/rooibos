import {BlockType, Callback, Event, EventType, JsonValue, Reporter, Stack} from "./types";
import {ABORT_STATE, Abortable, AbortApi, AbortApiPublic, Timeout} from 'advanced-promises';
import {strict as assert} from 'assert';
import {NullReporter} from "./Reporters/NullReporter";

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
    private get promise() { return this.stackItem.promise; }
    private set promise(val) { this.stackItem.promise = val; }
    private get context() { return this.stack.length && this.stackItem.context; }
    private get aapi() { return this.stackItem.aapi; }
    private get hooks() { return this.stackItem.hooks; }
    private then(cb: () => void | Promise<void>) : Promise<void> {
        return this.promise = this.promise.then(cb);
    }
    private report(eventType: EventType, details : Partial<Event> = {}) : Promise<void> {
        const stackItem = this.stackItem;
        return this.reporter.on(Object.assign({
                description: stackItem.context.description,
                blockType: stackItem.context.blockType,
                eventType: eventType,
                context: stackItem.context,
            },
            details
        ));
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

    private skipBlock(blockType: BlockType, description: string, callback: Callback, options?: BlockOptions) : void | Promise<void> {
        return this.promise = this.promise.then(
            async () => {
                const ownStackItem = this.push({
                    blockType,
                    description
                });

                await this.report(EventType.SKIP);

                this.pop(ownStackItem);
            },
            async (exception) => {
                const ownStackItem = this.push({
                    blockType,
                    description
                });

                await this.report(EventType.SKIP, exception);

                this.pop(ownStackItem);

                throw exception;
            }
        )
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

                if (parentAapi.state !== ABORT_STATE.NONE) {
                    await this.report(EventType.SKIP);
                    this.pop(ownStackItem);
                    return;
                }

                await this.report(EventType.ENTER);

                const RES_ABORT = new Error('Abort');
                const RES_TIMEOUT = new Error('Timeout');

                const wait = Abortable
                    .fromAsync<void|Error>(async () => {
                        await Promise.resolve();
                        try {
                            await callback.call(this.context, this.context);
                        }
                        catch (ex) {
                            exception = exception || ex;

                            // signal abort
                            const waitAbort = wait.abortWith({ resolve: RES_ABORT });
                            // report error
                            await this.report(EventType.EXCEPTION, ex);
                            // wait for abort to finish
                            await waitAbort;

                            throw ex;
                        }
                        finally {
                            await ownStackItem.promise;
                        }
                    })
                    .withAutoAbort(parentAapi, { resolve: RES_ABORT })
                    .withTimeout(timeout, { resolve: RES_TIMEOUT });

                ownStackItem.aapi = wait.aapi;

                let exception : Error = undefined;
                let res = undefined;
                try {
                    res = await wait;
                    if (res === RES_TIMEOUT) {
                        exception = res;
                        await this.report(EventType.TIMEOUT, res);
                    }
                    else if (res === RES_ABORT) {
                        if (!exception)
                            await this.report(EventType.ABORT, { exception });
                    }

                    // wait for safe termination of promise
                    await wait.promise;

                    if (res === RES_TIMEOUT)
                        throw res;
                }
                catch (ex) {
                    if (exception !== ex) {
                        exception = ex;
                        await this.report(EventType.EXCEPTION, ex);
                    }
                    if (blockType !== BlockType.IT)
                        throw ex;
                }
                finally {
                    if (exception && exception !== RES_TIMEOUT)
                        await this.report(EventType.LEAVE_EXCEPTION, { exception });
                    else if (res === RES_TIMEOUT)
                        await this.report(EventType.LEAVE_TIMEOUT, res);
                    else if (res === RES_ABORT)
                        await this.report(EventType.LEAVE_ABORT);
                    else
                        await this.report(EventType.LEAVE_SUCCESS);

                    this.pop(ownStackItem);
                }
            },
            async (exception) => {
                const ownStackItem = this.push({
                    blockType,
                    description
                });

                await this.report(EventType.SKIP, exception);

                this.pop(ownStackItem);

                throw exception;
            }
        );
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

    async note(id: string, description: string, value: JsonValue) : Promise<void> {
        return this.promise = this.promise.then(
            async () => {
                await this.report(EventType.NOTE, { blockType: BlockType.NOTE, description, id, value });
            }
        );


    }

    done() : Promise<void> {
        return this.promise;
    }
}