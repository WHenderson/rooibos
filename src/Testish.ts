import {
    BlockType,
    BlockTypeHookTarget,
    Callback,
    CallbackBlock,
    CallbackHook,
    CallbackNote,
    Context, ContextBlock,
    ContextHook, ContextNote,
    ErrorAbort, ErrorNotJson,
    ErrorTimeout,
    Event,
    EventBlock,
    EventHook,
    EventNote,
    EventStatusType,
    EventType,
    HookDepth,
    HookEachWhen,
    HookOnceWhen,
    HookSettingsAndState,
    HookWhen,
    isHookBefore,
    isHookOnce,
    isJsonValue,
    JsonValue,
    Reporter,
    State,
    UserOptions,
    UserOptionsBlock,
    UserOptionsHook
} from "./types";
import {ABORT_STATE, Abortable, AbortApi, AbortApiPublic, Deconstructed} from 'advanced-promises';
import {NullReporter} from "./Reporters/NullReporter";
import {strict as assert} from "assert";
import {Guid} from "guid-typescript";

export class Testish {
    private readonly reporter : Reporter;
    private state: State;
    private rootState : State;

    constructor(options: { reporter?: Reporter; description?: string; promise?: Promise<void>; data?: object, aapi?:AbortApi } = {}) {
        this.reporter = options.reporter || new NullReporter();
        this.rootState = this.state = this.createState(
            undefined,
            BlockType.SCRIPT,
            undefined,
            {
                description: options.description
            },
            {
                promise: (options.promise || Promise.resolve())
                    .then(
                        async () => {
                            await this._stepScriptEnter();
                        },
                        async (exception) => {
                            await this._stepScriptEnter(exception);
                            throw exception;
                        }
                    ),
                aapi: options.aapi
            }
        );
    }

    private *stateIter(state: State) {
        while (state) {
            yield state;
            state = state.parentState;
        }
    }

    private createContext(state: State, callback: Callback, userOptions: UserOptions) : Context {
        const context : Omit<Context, 'aapi'> = Object.assign(
            {},
            userOptions,
            {
                blockType: state.blockType,
                parent: state.parentState && state.parentState.context as ContextBlock,
                data: {},
                callback
            },
        );
        Object.defineProperty(context, 'aapi', { get: () => state });
        return context as Context;
    }

    private createState(parentState: State, blockType: BlockType, callback: Callback, userOptions: UserOptions, stateOptions: { promise?: Promise<void>, aapi?:AbortApi} = {}) : State {
        const state : State = {
            blockType: blockType,
            promise: stateOptions.promise || Promise.resolve(),
            hooks: [],
            aapi: stateOptions.aapi || new AbortApiPublic(),
            context: undefined,
            parentState: parentState,
            triggers: []
        };
        state.context = this.createContext(state, callback, userOptions);

        if (parentState) {
            // parent
            parentState.triggers = parentState.triggers
                .filter(trigger => trigger.depth !== HookDepth.SHALLOW || trigger.state.blockType !== blockType)
                .concat({ depth: HookDepth.SHALLOW, state });

            // grand parents
            [...this.stateIter(parentState.parentState)].forEach(ancestorState => {
                ancestorState.triggers = ancestorState.triggers
                    .filter(trigger => trigger.depth !== HookDepth.DEEP || trigger.state.blockType !== blockType)
                    .concat({ depth: HookDepth.DEEP, state });
            });
        }

        return state;
    }

    private push(state: State) : State {
        assert(state.parentState === this.state);
        this.state = state;
        return state;
    }

    private pop(state: State) : void {
        assert(this.state === state);
        this.state = state.parentState;
    }

    private async report(event: Event) {
        return this.reporter.on(event);
    }

    private findHooks(fromState: State, blockTypes: BlockType[], when: HookWhen) : HookSettingsAndState[] {
        const hooks : HookSettingsAndState[] = [];

        // Only DESCRIBE and IT have hooks so far
        blockTypes = blockTypes.filter(blockType => (blockType === BlockType.DESCRIBE || blockType === BlockType.IT));
        if (blockTypes.length === 0)
            return hooks;

        // Get all states in the current stack, ordering according appropriately
        const states = isHookBefore(when) ? [...this.stateIter(fromState)].reverse() : [...this.stateIter(fromState)];

        for (let state of states) {
            for (let hook of state.hooks.slice()) {
                // blockType
                if (hook.blockTypes && hook.blockTypes.length
                && !blockTypes.some(blockType => hook.blockTypes.includes(blockType as BlockTypeHookTarget)))
                    continue;

                // depth
                if (hook.when !== when)
                    continue;

                // depth
                const isShallow = state === fromState;
                if ((hook.depth !== HookDepth.ALL) && (!isShallow || hook.depth !== HookDepth.SHALLOW) && (isShallow || hook.depth !== HookDepth.DEEP))
                    continue;

                hooks.push({
                    settings: hook,
                    creationState: state
                });
            }
        }

        return hooks;
    }

    private async _stepScriptEnter(exception?: Error) {
        await this.report({
            blockType: BlockType.SCRIPT,
            eventType: EventType.ENTER,
            eventStatusType: !exception ? EventStatusType.SUCCESS : EventStatusType.EXCEPTION,
            exception,
            description: this.rootState.context.description,
            context: this.rootState.context as ContextBlock
        });
    }

    private async _stepScriptLeave(exception?: Error) {
        await this.report({
            blockType: BlockType.SCRIPT,
            eventType: EventType.LEAVE,
            eventStatusType: !exception ? EventStatusType.SUCCESS : EventStatusType.EXCEPTION,
            exception,
            description: this.rootState.context.description,
            context: this.rootState.context as ContextBlock
        });
    }

    private async _stepRunHook(ownerState: State, triggerState: State, hook: HookSettingsAndState) {
        if (isHookOnce(hook.settings.when))
            hook.creationState.hooks.splice(hook.creationState.hooks.indexOf(hook.settings));

        const ownState = this.createState(ownerState, BlockType.HOOK, hook.settings.callback, hook.settings);

        const context = ownState.context as ContextHook;
        context.creator = hook.creationState.context as ContextBlock;
        context.trigger = triggerState.context as ContextBlock;
        hook.settings.executed = true;

        await this._stepCallback(
            hook.settings.callback,
            hook.settings.timeout,
            {
                ownState,
                ownerState,
                eventBase: {
                    blockType: BlockType.HOOK,
                    description: context.description,
                    hookOptions: hook.settings,
                    context
                },
                propagateExceptions: true
            }
        );
    }

    private async _stepSkipHook(ownerState: State, triggerState: State, hook: HookSettingsAndState, exception?: Error) {
        const ownState = this.createState(ownerState, BlockType.HOOK, hook.settings.callback, hook.settings);

        const context = ownState.context as ContextHook;
        context.creator = hook.creationState.context as ContextBlock;
        context.trigger = triggerState.context as ContextBlock;

        await this._stepSkip(
            {
                ownState,
                ownerState,
                eventBase: {
                    blockType: BlockType.HOOK,
                    description: context.description,
                    hookOptions: hook.settings,
                    context
                },
                exception
            }
        );
    }

    private async _stepUnusedHook(ownerState: State, triggerState: State | undefined, hook: HookSettingsAndState, exception?: Error) {
        const ownState = this.createState(ownerState, BlockType.HOOK, hook.settings.callback, hook.settings);

        const context = ownState.context as ContextHook;
        context.creator = hook.creationState.context as ContextBlock;
        context.trigger = triggerState && triggerState.context as ContextBlock;

        await this._stepUnused(
            hook.settings.callback,
            {
                ownState,
                ownerState,
                eventBase: {
                    blockType: BlockType.HOOK,
                    description: context.description,
                    hookOptions: hook.settings,
                    context
                },
                exception
            }
        );
    }

    private async _stepRunHooks(ownerState: State, triggerState: State, hooks: HookSettingsAndState[]) {
        await hooks
            .reduce((cur, hook) => {
                return cur.then(
                    async () => {
                        await this._stepRunHook(ownerState, triggerState, hook);
                    },
                    async (exception) => {
                        await this._stepSkipHook(ownerState, triggerState, hook, exception);
                        throw exception; // propagate
                    }
                )
            }, Promise.resolve());
    }

    private async _stepSkipHooks(ownerState: State, triggerState: State, hooks: HookSettingsAndState[], exception?: Error) {
        await hooks
            .reduce(async (cur, hook) => {
                await cur;
                await this._stepSkipHook(ownerState, triggerState, hook, exception);
            }, Promise.resolve());
    }

    private async _stepRunBeforeEachHooks(ownerState: State, triggerState: State) {
        const hooks = this.findHooks(ownerState, [triggerState.blockType], HookEachWhen.BEFORE_EACH);
        await this._stepRunHooks(ownerState, triggerState, hooks);
    }
    
    private async _stepRunAfterEachHooks(ownerState: State, triggerState: State) {
        const hooks = this.findHooks(ownerState, [triggerState.blockType], HookEachWhen.AFTER_EACH);
        await this._stepRunHooks(ownerState, triggerState, hooks);
    }

    private async _stepRunBeforeOnceHooks(ownerState: State, triggerState: State) {
        const hooks = this.findHooks(ownerState, [triggerState.blockType], HookOnceWhen.BEFORE_ONCE);
        await this._stepRunHooks(ownerState, triggerState, hooks);
    }

    private async _stepRunAfterOnceHooks(ownerState: State, exception?: Error) {
        const hooks : HookSettingsAndState[] = ownerState.hooks
            .filter(hook =>
                hook.when === HookOnceWhen.AFTER_ONCE &&
                hook.blockTypes.some(blockType =>
                    ownerState.triggers.findIndex(trigger => trigger.state.blockType === blockType) !== -1
                )
            )
            .map(hook => ({ settings: hook, creationState: ownerState }));


        let filteredHooks : HookSettingsAndState[] = [];

        // If a settings targets multiple block types, we want to execute after the last target trigger
        const findLastIndex = <T>(arr: T[], predicate: (val: T, idx: number, arr: T[]) => boolean) => {
            for (let [idx, val] of [...arr.entries()].reverse()) {
                if (predicate(val, idx, arr))
                    return idx;
            }
            return -1;
        };

        return ownerState.triggers.reduce(
            (cur, trigger, iTrigger) => {
                return cur
                    .finally(() => {
                        filteredHooks = hooks.filter(hook =>
                            !hook.settings.executed && (
                                iTrigger === findLastIndex(
                                    ownerState.triggers,
                                    trigger =>
                                        (hook.settings.depth === HookDepth.ALL || hook.settings.depth == trigger.depth) &&
                                        hook.settings.blockTypes.indexOf(trigger.state.blockType as BlockTypeHookTarget) !== -1
                                )
                            )
                        );
                    })
                    .then(
                        async () => {
                            await this._stepRunHooks(
                                ownerState,
                                trigger.state,
                                filteredHooks
                            );
                        },
                        async (exception) => {
                            await this._stepSkipHooks(
                                ownerState,
                                trigger.state,
                                filteredHooks,
                                exception
                            );
                            throw exception;
                        }
                    );
            },
            exception ? Promise.reject(exception) : Promise.resolve()
        );
    }

    private async _stepSkipBeforeEachHooks(ownerState: State, triggerState: State, exception?: Error) {
        const hooks = this.findHooks(ownerState, [triggerState.blockType], HookEachWhen.BEFORE_EACH);
        await this._stepSkipHooks(ownerState, triggerState, hooks, exception);
    }

    private async _stepSkipAfterEachHooks(ownerState: State, triggerState: State, exception?: Error) {
        const hooks = this.findHooks(ownerState, [triggerState.blockType], HookEachWhen.AFTER_EACH);
        await this._stepSkipHooks(ownerState, triggerState, hooks, exception);
    }

    private async _stepSkipBeforeOnceHooks(ownerState: State, triggerState: State, exception?: Error) {
        const hooks = this.findHooks(ownerState, [triggerState.blockType], HookOnceWhen.BEFORE_ONCE);
        await this._stepSkipHooks(ownerState, triggerState, hooks, exception);
    }

    private async _stepSkipAfterOnceHooks(ownerState: State, exception?: Error) {
        return this._stepRunAfterOnceHooks(ownerState, exception);
    }

    private async _stepUnusedHooks(ownState: State, exception?: Error) {
        const hooks : HookSettingsAndState[] = ownState.hooks.filter(hook => !hook.executed).map(hook => ({
            settings: hook,
            creationState: ownState
        }));

        await hooks
            .reduce(async (cur, hook) => {
                return cur.then(
                    async () => await this._stepUnusedHook(ownState, undefined, hook),
                    async (exception) => await this._stepUnusedHook(ownState, undefined, hook, exception)
                );
            }, exception ? Promise.reject(exception) : Promise.resolve());
    }
    
    private async _stepUnused(
        callback: CallbackBlock | CallbackHook,
        options: {
            ownState?: State;
            ownerState: State;
            eventBase :
                Omit<EventBlock, 'eventType' | 'eventStatusType'> |
                Omit<EventHook, 'eventType' | 'eventStatusType'> |
                Omit<EventNote, 'eventType' | 'eventStatusType'>
            exception?: Error
        }
    ) {
        await this.report(Object.assign({}, options.eventBase, {
            eventType: EventType.SKIP,
            eventStatusType: EventStatusType.UNUSED,
            exception: options.exception,
            context: (options.ownState || options.ownerState).context // TODO: Context isn't quite right, need to create a state with creator/trigger?
        }));
    }

    private async _stepSkip(
        options: {
            ownState?: State;
            ownerState: State;
            eventBase :
                Omit<EventBlock, 'eventType' | 'eventStatusType'> |
                Omit<EventHook, 'eventType' | 'eventStatusType'> |
                Omit<EventNote, 'eventType' | 'eventStatusType'>
            exception?: Error
        }
    ) {
        await this.report(Object.assign({}, options.eventBase, {
            eventType: EventType.SKIP,
            eventStatusType: EventStatusType.SUCCESS,
            exception: options.exception,
            context: options.ownState || options.ownerState
        }));
    }

    private async _stepCallback(
        callback: CallbackBlock | CallbackHook,
        timeout: number,
        options: {
            ownState?: State;
            ownerState: State;
            eventBase:
                Omit<EventBlock, 'eventType' | 'eventStatusType'> |
                Omit<EventNote, 'eventType' | 'eventStatusType'> |
                Omit<EventHook, 'eventType' | 'eventStatusType'>;
            propagateExceptions: boolean
            }
        ) {
        const RES_ABORT = new ErrorAbort();
        const RES_TIMEOUT = new ErrorTimeout();
        let exception: Error = undefined;
        let res : void | Error = undefined;
        let eventStatusType: EventStatusType = EventStatusType.SUCCESS;

        const report = (event: Partial<Event> & { eventType: EventType, eventStatusType: EventStatusType }) => this.report(Object.assign({}, options.eventBase, event));

        if (options.ownerState && options.ownerState.aapi && options.ownerState.aapi.state !== ABORT_STATE.NONE) {
            await report({ eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS });
            return;
        }

        await report({ eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS });

        try {
            const waitCallback = Abortable.fromAsync<void | Error>(async () => {
                await Promise.resolve();

                const state = options.ownState || options.ownerState;

                try {
                    await callback.call(state.context, state.context);
                } catch (ex) {
                    exception = exception || ex;

                    eventStatusType = EventStatusType.EXCEPTION;

                    // signal abort
                    const waitAbort = wait.abortWith({resolve: RES_ABORT});
                    // report error
                    await report({ eventType: EventType.NOTE, eventStatusType, exception });
                    // wait for abort to finish
                    await waitAbort;

                    throw ex;
                } finally {
                    // Evaluate nested
                    if (options.ownState) {
                        await options.ownState.promise
                            // afterOnce
                            .then(
                                async () => {
                                    await this._stepRunAfterOnceHooks(options.ownState);
                                },
                                async (exception) => {
                                    await this._stepSkipAfterOnceHooks(options.ownState, exception);
                                    throw exception;
                                }
                            )
                            // unused
                            .then(
                                async () => {
                                    await this._stepUnusedHooks(options.ownState);
                                },
                                async (exception) => {
                                    await this._stepUnusedHooks(options.ownState, exception);
                                    throw exception;
                                }
                            );
                    }
                }
            });

            const waitAbort = options.ownerState && options.ownerState.aapi ? waitCallback.withAutoAbort(options.ownerState.aapi, {resolve: RES_ABORT}) : waitCallback;
            const wait = waitAbort.withTimeout(timeout, {resolve: RES_TIMEOUT});

            if (options.ownState)
                options.ownState.aapi = wait.aapi;

            res = await wait;

            if (res === RES_TIMEOUT) {
                exception = res;
                eventStatusType = EventStatusType.TIMEOUT;
                await report({ eventType: EventType.NOTE, eventStatusType, exception });
            }
            else if (res === RES_ABORT && !exception) {
                eventStatusType = EventStatusType.ABORT;
                await report({ eventType: EventType.NOTE, eventStatusType, exception });
            }

            let inner = wait.promise;
            if (options.ownState && options.ownState.promiseAfter) {
                inner = inner.then(
                    () => {
                        options.ownState.promiseAfter.start.resolve();
                        return options.ownState.promiseAfter.end;
                    },
                    (exception) => {
                        options.ownState.promiseAfter.start.reject(exception);
                        return options.ownState.promiseAfter.end;
                    }
                )
            }
            await inner;

            if (res === RES_TIMEOUT)
            { // noinspection ExceptionCaughtLocallyJS
                throw res;
            }
        }
        catch (ex) {
            if (!exception) {
                exception = ex;
                eventStatusType = EventStatusType.EXCEPTION;
                await report({ eventType: EventType.NOTE, eventStatusType, exception });
            }

            if (options.propagateExceptions)
                throw ex;
        }
        finally {
            this.state.aapi = undefined;

            await report({ eventType: EventType.LEAVE, eventStatusType, exception });
        }
    }

    private queueBlock(blockType: BlockType, callback: CallbackBlock, options: UserOptionsBlock) {
        let ownerState : State = undefined;
        let ownState : State = undefined;

        return this.state.promise = this.state.promise
            // create state
            .finally(
                () => {
                    ownerState = this.state;
                    ownState = this.createState(ownerState, blockType, callback, options);
                }
            )
            // beforeOnce
            .then(
                async () => {
                    await this._stepRunBeforeOnceHooks(ownerState, ownState);
                },
                async (exception) => {
                    await this._stepSkipBeforeOnceHooks(ownerState, ownState, exception);
                    throw exception;
                }
            )
            // push
            .finally(
                () => {
                    this.push(ownState);
                }
            )
            // beforeEach
            .then(
                async () => {
                    await this._stepRunBeforeEachHooks(ownerState, ownState);
                },
                async (exception) => {
                    await this._stepSkipBeforeEachHooks(ownerState, ownState, exception);
                    throw exception;
                }
            )
            // callback
            .then(
                async () => {
                    await this._stepCallback(
                        callback,
                        options.timeout,
                        {
                            ownerState,
                            ownState,
                            propagateExceptions: blockType !== BlockType.IT,
                            eventBase: {
                                blockType,
                                description: ownState.context.description,
                                context: ownState.context as ContextBlock
                            }
                        }
                    );
                },
                async (exception) => {
                    await this._stepSkip(
                        {
                            ownerState,
                            ownState,
                            eventBase: {
                                blockType,
                                description: ownState.context.description,
                                context: ownState.context as ContextBlock
                            },
                            exception
                        }
                    );
                    throw exception;
                }
            )
            // afterEach
            .then(
                async () => {
                    await this._stepRunAfterEachHooks(ownerState, ownState);
                },
                async (exception) => {
                    await this._stepSkipAfterEachHooks(ownerState, ownState, exception);
                    throw exception;
                }
            )
            // pop
            .finally(
                () => {
                    this.pop(ownState);
                    ownState = undefined;
                }
            )
            .then(
                () => {
                    return undefined;
                },
                (exception) => {
                    throw exception;
                }
            )
            ;
    }

    private async _stepRunNote(ownerState: State, ownState: State, id: Guid, value: CallbackNote | JsonValue, options: UserOptionsBlock) {
        const eventBase = {
            blockType: BlockType.NOTE,
            description: options.description,
            id,
            context: ownState.context as ContextNote
        };

        let res : JsonValue = undefined;

        // queue the reporting to happen outside of the callback

        const start = new Deconstructed<void>();
        const end = start.then(async () => {
            if (typeof res !== 'undefined' && !isJsonValue(res))
                throw new ErrorNotJson(res);

            await this.report(Object.assign(
                {},
                eventBase,
                {
                    eventType: EventType.NOTE,
                    eventStatusType: EventStatusType.SUCCESS,
                    value: res
                }
            ));
        });

        ownState.promiseAfter = {
            start,
            end
        };

        await this._stepCallback(
            async (context) => {
                res = await (typeof value === 'function' ? value(context) : value);
            },
            options.timeout,
            {
                ownerState,
                ownState,
                eventBase,
                propagateExceptions: true
            }
        );
    }

    private async _stepSkipNote(ownerState: State, ownState: State, id: Guid, value: CallbackNote | JsonValue, options: UserOptionsBlock, exception: Error) {
        const eventBase = {
            blockType: BlockType.NOTE,
            description: options.description,
            id,
            context: ownState.context as ContextNote
        };

        await this._stepSkip({
            ownerState,
            ownState,
            eventBase,
            exception
        });
    }

    private queueNote(id: Guid, value: CallbackNote | JsonValue, options: UserOptionsBlock) {
        let ownerState : State = undefined;
        let ownState : State = undefined;
        return this.state.promise = this.state.promise
            .finally(
                () => {
                    ownerState = this.state;
                    ownState = this.createState(ownerState, BlockType.NOTE, typeof value === 'function' ? value : undefined, options);
                }
            )
            .then(
                async () => {
                    await this._stepRunNote(ownerState, ownState, id, value, options);
                },
                async (exception) => {
                    await this._stepSkipNote(ownerState, ownState, id, value, options, exception);
                    throw exception;
                }
            );
    }

    public describe(description: string, callback: CallbackBlock, options?: Omit<UserOptionsBlock, 'description'>) : void | Promise<void> {
        return this.queueBlock(BlockType.DESCRIBE, callback, Object.assign({}, options, { description }));
    }
    public it(description: string, callback: CallbackBlock, options?: Omit<UserOptionsBlock, 'description'>) : void | Promise<void> {
        return this.queueBlock(BlockType.IT, callback, Object.assign({}, options, { description }));
    }
    public note(id: Guid, description: string, value: CallbackNote | JsonValue, options?: Omit<UserOptionsBlock, 'description'>) : void | Promise<void> {
        return this.queueNote(id, value, Object.assign({}, options, { description }));
    }
    public hook(description: string, callback: CallbackHook, options: Omit<UserOptionsHook, 'description'>) : void {
        this.state.hooks.push(Object.assign(
            {},
            options,
            {
                description,
                callback,
                executed: false
            })
        );
    }
    public done() : Promise<void> {
        if (this.state !== this.rootState)
            return this.state.promise;

        return this.state.promise
            // move to the end of the queue
            .then(() => this.state.promise, () => this.state.promise) // TODO: test that requeuing at the back of the line works
            // afterOnce
            .then(
                async () => {
                    await this._stepRunAfterOnceHooks(this.state);
                },
                async (exception) => {
                    await this._stepSkipAfterOnceHooks(this.state, exception);
                    throw exception;
                }
            )
            // unused
            .then(
                async () => {
                    await this._stepUnusedHooks(this.state);
                },
                async (exception) => {
                    await this._stepUnusedHooks(this.state, exception);
                    throw exception;
                }
            )
            // note exceptions
            .catch(async (exception) => {
                await this.report({
                    blockType: BlockType.SCRIPT,
                    eventType: EventType.NOTE,
                    eventStatusType: EventStatusType.EXCEPTION,
                    description: this.rootState.context.description,
                    context: this.rootState.context as ContextBlock,
                    exception
                });
                throw exception;
            })
            // leave
            .then(
                async () => {
                    await this._stepScriptLeave();
                },
                async (exception) => {
                    await this._stepScriptLeave(exception);
                    throw exception;
                }
            );
    }
}