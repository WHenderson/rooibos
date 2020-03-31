import {
    UserOptionsBlock,
    BlockType,
    CallbackBlock,
    ContextBlock,
    Event,
    EventBlock,
    EventHook,
    EventNote,
    EventStatusType,
    EventType,
    CallbackHook,
    ContextHook,
    HookSettingsAndState,
    HookDepth,
    HookEachWhen,
    HookOnceWhen,
    UserOptionsHook,
    BlockTypeHookTarget,
    HookWhen,
    isHookBefore,
    isHookOnce,
    isJsonValue,
    JsonValue,
    Reporter,
    State, UserOptions
} from "./types";
import {ABORT_STATE, Abortable, AbortApi, AbortApiPublic} from 'advanced-promises';
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
            options.description,
            {},
            {
                promise: (options.promise || Promise.resolve())
                    .then(
                        async () => {
                            await this.report({
                                blockType: BlockType.SCRIPT,
                                eventType: EventType.ENTER,
                                eventStatusType: EventStatusType.SUCCESS,
                                description: options.description,
                                context: this.rootState.context
                            });
                        },
                        async (exception) => {
                            await this.report({
                                blockType: BlockType.SCRIPT,
                                eventType: EventType.ENTER,
                                eventStatusType: EventStatusType.EXCEPTION,
                                exception,
                                description: options.description,
                                context: this.rootState.context
                            });
                            throw exception;
                        }
                    ),
                aapi: options.aapi
            }
        );
    }

    private get context() : ContextBlock | ContextHook {
        return this.state && this.state.context;
    }

    private *stateIter(state: State) {
        while (state) {
            yield state;
            state = state.parentState;
        }
    }

    private createState(parentState: State, blockType: BlockType, description: string, options: UserOptions, stateOptions: { promise?: Promise<void>, aapi?:AbortApi} = {}) : State {
        const state : State = {
            blockType: blockType,
            promise: stateOptions.promise || Promise.resolve(),
            hooks: [],
            aapi: stateOptions.aapi || new AbortApiPublic(),
            context: {
                blockType,
                description,
                parent: parentState && parentState.context,
                data: {},
                get aapi() { return state.aapi; }
            },
            parentState: parentState,
            triggers: []
        };

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

    private async _stepRunHook(ownerState: State, triggerState: State, hook: HookSettingsAndState) {
        if (isHookOnce(hook.settings.when))
            hook.creationState.hooks.splice(hook.creationState.hooks.indexOf(hook.settings));

        const ownState = this.createState(ownerState, BlockType.HOOK, hook.settings.description, hook.settings);

        const context = ownState.context as ContextHook;
        context.creator = hook.creationState.context;
        context.trigger = triggerState.context;
        hook.settings.executed = true;

        await this._stepCallback(hook.settings.callback, hook.settings.description, hook.settings.timeout, {
            ownState,
            ownerState,
            eventBase: {
                blockType: BlockType.HOOK,
                description: context.description,
                hookOptions: hook.settings,
                context
            },
            propagateExceptions: true
        });
    }

    private async _stepSkipHook(ownerState: State, triggerState: State, hook: HookSettingsAndState, exception?: Error) {
        const ownState = this.createState(ownerState, BlockType.HOOK, hook.settings.description, hook.settings);

        const context = ownState.context as ContextHook;
        context.creator = hook.creationState.context;
        context.trigger = triggerState.context;

        await this._stepSkip(hook.settings.callback, hook.settings.description, {
            ownState,
            ownerState,
            eventBase: {
                blockType: BlockType.HOOK,
                description: context.description,
                hookOptions: hook.settings,
                context
            },
            exception
        });
    }

    private async _stepUnusedHook(ownerState: State, triggerState: State | undefined, hook: HookSettingsAndState, exception?: Error) {
        const ownState = this.createState(ownerState, BlockType.HOOK, hook.settings.description, hook.settings);

        const context = ownState.context as ContextHook;
        context.creator = hook.creationState.context;
        context.trigger = triggerState && triggerState.context;

        await this._stepUnused(hook.settings.callback, hook.settings.description, {
            ownState,
            ownerState,
            eventBase: {
                blockType: BlockType.HOOK,
                description: context.description,
                hookOptions: hook.settings,
                context
            },
            exception
        });
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
        description: string,
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
        callback: CallbackBlock | CallbackHook,
        description: string,
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
        description: string,
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
        const RES_ABORT = new Error('Abort');
        const RES_TIMEOUT = new Error('Timeout');
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

            await wait.promise;

            if (res === RES_TIMEOUT)
                throw res;
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

    private queueBlock(blockType: BlockType, callback: CallbackBlock, description: string, options: UserOptionsBlock) {
        let ownerState : State = undefined;
        let ownState : State = undefined;

        return this.state.promise = this.state.promise
            // create state
            .finally(
                () => {
                    ownerState = this.state;
                    ownState = this.createState(ownerState, blockType, description, options);
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
                        description,
                        options.timeout,
                        {
                            ownerState,
                            ownState,
                            propagateExceptions: blockType !== BlockType.IT,
                            eventBase: {
                                blockType,
                                description: ownState.context.description,
                                context: ownState.context
                            }
                        }
                    );
                },
                async (exception) => {
                    await this._stepSkip(
                        callback,
                        description,
                        {
                            ownerState,
                            ownState,
                            eventBase: {
                                blockType,
                                description: ownState.context.description,
                                context: ownState.context
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

    private async _stepRunNote(ownState: State, id: Guid, description: string, value: (() => JsonValue) | JsonValue) {
        await this.report({
            blockType: BlockType.NOTE,
            eventType: EventType.ENTER,
            eventStatusType: EventStatusType.SUCCESS,
            description: description,
            id,
            context: ownState.context
        });

        let exception: Error = undefined;
        try {
            await this.report({
                blockType: BlockType.NOTE,
                eventType: EventType.NOTE,
                eventStatusType: EventStatusType.SUCCESS,
                description: description,
                id,
                value: isJsonValue(value) ? value : value === undefined ? undefined : value(),
                context: ownState.context
            });
        }
        catch (ex) {
            exception = ex;
            throw ex;
        }
        finally {
            await this.report({
                blockType: BlockType.NOTE,
                eventType: EventType.LEAVE,
                eventStatusType: exception ? EventStatusType.EXCEPTION : EventStatusType.SUCCESS,
                description: description,
                id,
                context: ownState.context,
                exception
            });
        }
    }
    private async _stepSkipNote(ownState: State, id: Guid, description: string, value: (() => JsonValue) | JsonValue, exception: Error) {
        await this.report({
            blockType: BlockType.NOTE,
            eventType: EventType.SKIP,
            eventStatusType: EventStatusType.SUCCESS,
            description: description,
            exception,
            id,
            value: isJsonValue(value) ? value : undefined,
            context: ownState.context
        });
    }

    private queueNote(id: Guid, description: string, value: (() => JsonValue) | JsonValue, options: UserOptionsBlock) {
        let ownerState : State = undefined;
        let ownState : State = undefined;
        return this.state.promise = this.state.promise
            .finally(
                () => {
                    ownerState = this.state;
                    ownState = this.createState(ownerState, BlockType.NOTE, description, options);
                }
            )
            .then(
                async () => {
                    await this._stepRunNote(ownState, id, description, value);
                },
                async (exception) => {
                    await this._stepSkipNote(ownState, id, description, value, exception);
                    throw exception;
                }
            );
    }

    public describe(description: string, callback: CallbackBlock, options?: UserOptionsBlock) : void | Promise<void> {
        return this.queueBlock(BlockType.DESCRIBE, callback, description, options || {});
    }
    public it(description: string, callback: CallbackBlock, options?: UserOptionsBlock) : void | Promise<void> {
        return this.queueBlock(BlockType.IT, callback, description, options || {});
    }
    public note(id: Guid, description: string, value: (() => JsonValue) | JsonValue, options?: UserOptionsBlock) : void | Promise<void> {
        // TODO: Make this a full blown block with enter/leave/fail conditions
        return this.queueNote(id, description, value, options);
    }
    public hook(description: string, callback: CallbackHook, options: UserOptionsHook) : void {
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
            .then(() => this.state.promise, () => this.state.promise) // TODO: test that requeuing at the back of the line works
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
            .catch(async (exception) => {
                await this.report({
                    blockType: BlockType.SCRIPT,
                    eventType: EventType.NOTE,
                    eventStatusType: EventStatusType.EXCEPTION,
                    description: this.rootState.context.description,
                    context: this.rootState.context,
                    exception
                });
                throw exception;
            })
            .then(
                async () => {
                    await this.report({
                        blockType: BlockType.SCRIPT,
                        eventType: EventType.LEAVE,
                        eventStatusType: EventStatusType.SUCCESS,
                        description: this.rootState.context.description,
                        context: this.rootState.context
                    });
                },
                async (exception) => {
                    await this.report({
                        blockType: BlockType.SCRIPT,
                        eventType: EventType.LEAVE,
                        eventStatusType: EventStatusType.EXCEPTION,
                        exception,
                        description: this.rootState.context.description,
                        context: this.rootState.context
                    });
                    throw exception;
                }
            );
    }
}