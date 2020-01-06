import {Context} from './context';
import {InheritableOptions, NamedOptions, Options, resolveTimeout} from "./contract";
import {EntryType, EventType, HookType, NodeType} from "./events";
import {strict as assert} from 'assert';
import {Reporter} from "./reporter";
import {VerboseReporter} from "./reporters/verbose";
import {race} from "./race";

enum Status {
    Pending,
    Ready,
    Started,
    Cancelled
}

function isStatusMutable(status: Status) : boolean {
    return status === Status.Pending || status === Status.Ready;
}

interface StateResolve {
    () : void
}
interface StateReject {
    () : void
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

    resolve: StateResolve;
    reject: StateReject;
}

export class StateStack {
    private readonly _root : State;
    private readonly _stack : State[];
    private readonly _reporter : Reporter;

    constructor(reporter?: Reporter) {
        this._root = {
            status: Status.Ready,
            entry: EntryType.describe,
            filteredChildren: false,
            finalChild: undefined,
            options: {},
            context: {
                name: 'root',
                parents: []
            },
            actions: Promise.resolve(),
            before: [],
            beforeEach: [],
            afterEach: [],
            after: [],

            // not used (yet), TODO: implement mocha 'run'
            resolve: async () => {},
            reject: async () => {}
        };
        this._stack = [this._root];
        this._reporter = reporter || new VerboseReporter();
    }

    private push(entry: NodeType, options: NamedOptions) : State {
        assert(this.current.entry === EntryType.describe, 'Can only nest inside describe blocks');

        const state : State = {
            status: Status.Pending,
            entry: entry,
            filteredChildren: false,
            finalChild: undefined,
            options: options,
            context: {
                name: options.name,
                parents: this._stack.map(state => state.context)
            },
            actions: undefined,

            before: [],
            beforeEach: [],
            afterEach: [],
            after: [],

            resolve: undefined,
            reject: undefined
        };

        state.actions = new Promise((resolve, reject) => {
            state.resolve = () => {
                assert(state.status === Status.Pending, 'Expected pending state');
                state.status = Status.Ready;
                resolve();
            };
            state.reject = () => {
                assert(state.status === Status.Pending, 'Expected pending state');
                state.status = Status.Cancelled;
                reject();
            }
        });

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
        if (this.current.status !== Status.Pending && this.current.status !== Status.Ready)
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
        for (let s of this._stack.slice(1).reverse()) {
            switch (s.status) {
                case Status.Pending:
                    s.status = Status.Cancelled;
                    s.reject();
                    try {
                        await state.actions;
                    }
                    catch (ex) {
                        // TODO: what do we catch here? should be whatever was passed to reject?
                    }
                    break;
                case Status.Ready:
                case Status.Started:
                    s.status = Status.Cancelled;
                    if (s.context.cancel) {
                        const cancel = s.context.cancel;
                        delete s.context.cancel;

                        await cancel.call(s.context, s.context);
                    }
                    await s.actions;
                    break;
            }


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
                await race(resolveTimeout(options, entry), options.callback.call(context, context));

                await this._reporter.on({event: EventType.SUCCESS, entry: entry, context});
            }
            catch (ex) {
                if (ex.message === 'Timeout') {
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

            assert(parent.status !== Status.Pending, 'Cannot run child nodes whilst parent is pending');

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
                        await options.callback.call(me.context, me.context);

                        await this._reporter.on({event: EventType.PENDING, entry: entry, context: me.context});

                        me.resolve();
                        await me.actions;
                    };

                    try {
                        await race(resolveTimeout(options, entry), action());
                        await this._reporter.on({event: EventType.SUCCESS, entry: entry, context: me.context});
                    }
                    catch (ex) {
                        if (ex.message === 'Timeout') {
                            await this._cancel(me);
                            await this._reporter.on({event: EventType.TIMEOUT, entry: entry, context: me.context});
                        }
                        else {
                            await this._reporter.on({event: EventType.FAILURE, entry: entry, context: me.context, exception: ex });
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