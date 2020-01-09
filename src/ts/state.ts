import {Context} from './context';
import {InheritableOptions, NamedOptions, Options, resolveTimeout} from "./contract";
import {EntryType, EventType, HookType, NodeType} from "./events";
import {strict as assert} from 'assert';
import {Reporter} from "./reporter";
import {VerboseReporter} from "./reporters/verbose";
import {race} from "./race";

// TODO: When running actions, they need to be in a race where one contestant is an unresolved which can be used to abort (when cancelling)

enum Status {
    Ready,
    Started,
    Cancelled
}

function isStatusMutable(status: Status) : boolean {
    return status === Status.Ready;
}

interface StateResolve {
    () : void
}
interface StateReject {
    () : void
}

interface StateCancel {
    (this: State, state?:State) : Promise<void> | void;
}
interface StateAbort {
    (this: State, state?:State) : Promise<void> | void;
}

interface State {
    status: Status;

    filteredChildren: boolean;
    finalChild: NamedOptions; // used to identify the last child in the queue
    entry: NodeType;
    options: Options;
    context: Context;
    actions: Promise<void>;

    before: NamedOptions[];
    beforeEach: NamedOptions[];
    afterEach: NamedOptions[];
    after: NamedOptions[];

    // Cancel just these actions etc
    cancel: StateCancel;
    abort?: StateAbort;
}

export class StateStack {
    private readonly _root : State;
    private readonly _stack : State[];
    private readonly _reporter : Reporter;

    constructor(reporter?: Reporter) {
        this._stack = [];
        this.push(NodeType.describe, { name: 'root', callback: undefined });
        this._reporter = reporter || new VerboseReporter();
    }

    private push(entry: NodeType, options: NamedOptions) : State {
        assert(this._stack.length === 0 || this.current.entry === EntryType.describe, 'Can only nest inside describe blocks');

        const state : State = {
            status: Status.Ready,
            entry: entry,
            filteredChildren: false,
            finalChild: undefined,
            options: options,
            context: {
                name: options.name,
                parents: this._stack.map(state => state.context)
            },
            actions: Promise.resolve(),

            before: [],
            beforeEach: [],
            afterEach: [],
            after: [],

            cancel: async () => {
                if (state.status === Status.Cancelled)
                    return;

                state.status = Status.Cancelled;

                if (state.context.cancel) {
                    const cancel = state.context.cancel;
                    delete state.context.cancel;

                    await cancel.call(state.context, state.context);
                }

                if (state.abort) {
                    const abort = state.abort;
                    delete state.abort;

                    await abort.call(state, state);
                }

                //await state.actions; // Actions in the ready state will just cancel without running sub tasks or hooks etc
            }
        };

        this._stack.push(state);

        return state;
    }

    private pop(state: State) : State {
        assert(this.current === state, `Popping incorrect state (Found '${this.current.context.name}', expected '${state.context.name}')`);
        return this._stack.pop();
    }

    private get current() : State {
        return this._stack[this._stack.length - 1];
    }

    private get parent() : State {
        if (this._stack.length >= 2)
            return this._stack[this._stack.length - 2];
        else
            return null;
    }

    private hook(entry: HookType, options: NamedOptions) : void {
        if (this.current.status !== Status.Ready)
            throw new Error('Hooks have already started, cannot add more at this point');

        this.current[entry].push(options);
    }

    public before(options: NamedOptions) : void {
        this.hook(HookType.before, options);
    }
    public beforeEach(options: NamedOptions) : void {
        this.hook(HookType.beforeEach, options);
    }
    public afterEach(options: NamedOptions) : void {
        this.hook(HookType.afterEach, options);
    }
    public after(options: NamedOptions) : void {
        this.hook(HookType.after, options);
    }

    private async _cancel(state: State) {
        for (let s of this._stack.slice().reverse()) {
            if (s.status !== Status.Cancelled)
                await s.cancel(s);

            if (s === state)
                break;
        }
    }

    private async _runHooks(state: State, entry: HookType, context?: Context) : Promise<void> {
        const actions = state[entry];
        context = context || state.context;

        for (let options of actions) {
            await this._reporter.on({ event: EventType.ENTER, entry: entry, context });
            try {
                if (state.status !== Status.Cancelled) {
                    const waitAbort: Promise<void> = new Promise((resolve, reject) => {
                        state.abort = () => reject(new Error('Abort'));
                    });

                    try {
                        await race(options.callback.call(context, context), resolveTimeout(options, entry), waitAbort);
                    } finally {
                        delete state.abort;
                    }

                    await this._reporter.on({event: EventType.SUCCESS, entry: entry, context});
                }
                else {
                    await this._reporter.on({event: EventType.SKIP, entry: entry, context});
                }
            }
            catch (ex) {
                if (ex && ex.message === 'Abort') {
                    await this._reporter.on({ event: EventType.ABORT, entry: entry, context })
                }
                else if (ex && ex.message === 'Timeout') {
                    await this._cancel(state);
                    await this._reporter.on({ event: EventType.TIMEOUT, entry: entry, context })
                }
                else {
                    await this._reporter.on({ event: EventType.FAILURE, entry: entry, context })
                }
            }
            finally {
                await this._reporter.on({event: EventType.LEAVE, entry: entry, context})
            }
        }
    }
    private async _queueNode(options: NamedOptions, entry: NodeType) : Promise<void> {
        // compile options
        options = Object.assign(
            {},
            // only include inheritable options
            Object
                .keys(this.current.options)
                .filter(key => InheritableOptions.includes(key))
                .reduce((obj, key) => {
                    obj[key] = this.current.options[key];
                    return obj;
                }, {}),
            options
        );

        if (this.current.entry !== NodeType.describe)
            throw new Error('Cannot nest here');

        if (options.only) {
            if (!isStatusMutable(this.current.status) && !this.current.filteredChildren)
                throw new Error('Actions have already started, can not use .only at this point');

            this.current.filteredChildren = true;
        }

        // tag this node as the final child
        this.current.finalChild = options;

        return this.current.actions = this.current.actions.then(async () => {
            const parent = this.current;

            const skip = parent.status == Status.Cancelled || options.skip || (parent.filteredChildren && !options.only);

            // first non-skipped child?
            if (!skip && parent.status == Status.Ready) {
                parent.status = Status.Started;
                await this._runHooks(parent, HookType.before);
            }

            const me = this.push(entry, options);
            try {
                if (!skip) {
                    await this._runHooks(parent, HookType.beforeEach, me.context);
                }

                await this._reporter.on({ event: EventType.ENTER, entry: entry, context: me.context });

                if (!skip) {
                    const action = async () => {
                        let waitAbort = new Promise((resolve, reject) => {
                            me.abort = async () => { reject(new Error('Abort')); }
                        });
                        try {
                            await Promise.race([waitAbort, options.callback.call(me.context, me.context)]);
                        }
                        catch (ex) {
                            if (ex && ex.message === 'Abort') {
                                await this._reporter.on({event: EventType.ABORT, entry: entry, context: me.context});
                            }
                            else {
                                await this._reporter.on({event: EventType.FAILURE, entry: entry, context: me.context, exception: ex });
                            }
                        }
                        finally {
                            delete me.abort;
                        }

                        await this._reporter.on({event: EventType.PENDING, entry: entry, context: me.context});

                        await me.actions;
                    };

                    try {
                        // TODO: This race is problematic, we still need to wait for the action even after a timeout, we just need to abort it first...
                        await race(action(), resolveTimeout(options, entry));
                        if (me.status !== Status.Cancelled)
                            await this._reporter.on({event: EventType.SUCCESS, entry: entry, context: me.context});
                    }
                    catch (ex) {
                        if (ex && ex.message === 'Timeout') {
                            console.log('timeout >', options.name);
                            await this._cancel(me);
                            await this._reporter.on({event: EventType.TIMEOUT, entry: entry, context: me.context});
                            console.log('timeout <', options.name);
                        }
                        else {
                            console.log('unexpected error', ex);
                            throw ex;
                        }
                    }
                }
                else {
                    await this._reporter.on({ event: EventType.SKIP, entry: entry, context: me.context });
                }

                await this._reporter.on({ event: EventType.LEAVE, entry: entry, context: me.context });

                if (!skip) {
                    await this._runHooks(parent, HookType.afterEach, me.context);
                }
            }
            finally {
                console.log('pop', options.name);
                this.pop(me);
            }

            // last child
            if (parent.status !== Status.Ready && parent.finalChild === options) {
                await this._runHooks(parent, HookType.after);
            }
        });
    }

    public describe(options: NamedOptions) : Promise<void> {
        return this._queueNode(options, NodeType.describe);
    }
    public test(options: NamedOptions) : Promise<void> {
        return this._queueNode(options, NodeType.test);
    }
}