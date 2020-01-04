const EVENTS = require('./events');
const Reporter = require('./reporter');

class State {
    constructor(reporter) {
        this._stack = [];
        this._reporter = reporter || new Reporter();

        this.push('root', { nest: true });

        const root = this.current;
        Promise.resolve()
            .then(() => root.actions)
            .then(() => this._after(root));
    }

    get current() {
        return this._stack[this._stack.length - 1];
    }

    push(name, options) {
        const item = {
            name,
            options: Object.assign({}, this._stack.length !== 0 ? this.current : {}, options),
            canceled: this._stack.length !== 0 ? this.current.canceled : false,
            //nest
            //only: false,
            started: false,
            //timeout: undefined,
            before: [],
            beforeEach: [],
            afterEach: [],
            after: [],
            actions: Promise.resolve(),
            context: {
                name
            }
        };

        item.context.parent = this._stack.length !== 0 ? this.current.context : null;
        item.context.parents = this._stack.map(x => x.context);

        this._stack.push(item);
        return item;
    }

    pop(name) {
        if (this.current.name !== name)
            throw new Error(`Incorrect name. Expected ${name}, found ${this.current.name}`);

        return this._stack.pop();
    }

    before({ name, func, timeout }) {
        if (this.current.started)
            throw new Error('Actions have already started, cannot add more hooks at this point');

        this.current.before.push({ name, func, timeout });
    }
    beforeEach({ name, func, timeout }) {
        if (this.current.started)
            throw new Error('Actions have already started, cannot add more hooks at this point');

        this.current.beforeEach.push({ name, func, timeout });
    }
    describe(options) {
        const { name, func, only, skip, timeoutDefault, timeoutDescribe } = Object.assign({}, this.current.options, options);
        const timeout = typeof timeoutDescribe === 'number'
            ? timeoutDescribe
            : timeoutDefault;

        if (this.current.options.nest === false)
            throw new Error('Cannot nest here');

        if (only) {
            if (this.current.started && !this.current.only)
                throw new Error('Actions have already started, can not use .only at this point');

            this.current.only = only;
        }

        this.current.actions = this.current.actions.then(async () => {
            const current = this.current;
            const me = this.push(name, Object.assign({}, this.current.options, options, { nest: true }));

            try {
                if (this.current.canceled) {
                    await this._reporter.on({ entry: 'describe', context: me.context, event: EVENTS.ABORT });
                    return;
                }

                if (!skip && (!current.only || only)) {
                    await this._before(current);

                    current.started = true;
                    await this._beforeEach(current);

                    await this._reporter.on({ entry: 'describe', context: me.context, event: EVENTS.ENTER });

                    const runner = async () => {
                        await func.call(me.context, me.context);
                        await this._reporter.on({entry: 'describe', context: me.context, event: EVENTS.SUCCESS});

                        await me.actions;
                    };

                    const contestants = [
                        runner()
                    ];

                    if (timeout) {
                        contestants.push(
                            new Promise((resolve, reject) => {
                                setTimeout(() => reject(new Error('Timeout')), timeout);
                            })
                        );
                    }

                    try {
                        const res = await Promise.race(contestants);
                    }
                    catch (ex) {
                        if (ex.message === 'Timeout') {
                            for (let actionContext of this._stack.slice().reverse()) {
                                if (actionContext.context.cancel)
                                    actionContext.context.cancel(actionContext.context);
                                actionContext.canceled = true;

                                if (actionContext === me)
                                    break;
                            }
                        }

                        await me.actions;

                        await this._reporter.on({
                            entry: 'describe',
                            context: me.context,
                            event: ex.message === 'Timeout' ? EVENTS.TIMEOUT : EVENTS.FAILURE,
                            ex
                        });

                        throw ex;
                    }
                    finally {
                        await this._reporter.on({ entry: 'describe', context: me.context, event: EVENTS.LEAVE });
                    }

                    if (me.started)
                        await this._after(me);


                    await this._afterEach(current);

                } else {
                    await this._reporter.on({ entry:'describe', context: me.context, event: EVENTS.SKIP} );
                }
            }
            finally {
                this.pop(name);
            }
        });

        return this.current.actions;
    }
    test(options) {
        const { name, func, only, skip, timeoutDefault, timeoutTest } = Object.assign({}, this.current.options, options);
        const timeout = typeof timeoutTest === 'number'
            ? timeoutTest
            : timeoutDefault;

        if (this.current.options.nest === false)
            throw new Error('Cannot nest here');

        if (only) {
            if (this.current.started && !this.current.only)
                throw new Error('Actions have already started, can not use .only at this point');

            this.current.only = only;
        }

        this.current.actions = this.current.actions.then(async () => {
            const current = this.current;
            const me = this.push(name, Object.assign({}, this.current.options, options, { nest: false }));

            try {
                if (this.current.canceled) {
                    await this._reporter.on({ entry: 'test', context: me.context, event: EVENTS.ABORT });
                    return;
                }

                if (!skip && (!current.only || only)) {
                    await this._before(current);

                    current.started = true;
                    await this._beforeEach(current);

                    await this._reporter.on({ entry: 'test', context: me.context, event: EVENTS.ENTER });

                    try {
                        const contestants = [
                            func.call(me.context, me.context)
                        ];

                        if (timeout) {
                            contestants.push(new Promise((resolve, reject) => {
                                setTimeout(() => reject(new Error('Timeout')), timeout);
                            }));
                        }

                        await Promise.race(contestants);

                        await this._reporter.on({ entry: 'test', context: me.context, event: EVENTS.SUCCESS });
                    } catch (ex) {
                        // Needs to be called before any other async await gets a chance to operate
                        if (ex.message === 'Timeout' && me.context.cancel) {
                            me.context.cancel(me.context);
                            me.canceled = true;
                        }

                        await this._reporter.on({ entry: 'test', context: me.context, event: ex.message === 'Timeout' ? EVENTS.TIMEOUT : EVENTS.FAILURE, ex });
                    } finally {
                        await this._reporter.on({ entry: 'test', context: me.context, event: EVENTS.LEAVE });
                    }

                    await this._afterEach(current);
                } else {
                    await this._reporter.on({ entry: 'test', context: me.context, event: EVENTS.SKIP });
                }
            }
            finally {
                this.pop(name);
            }
        });

        return this.current.actions;
    }
    afterEach({ name, func, timeout }) {
        if (this.current.started)
            throw new Error('Actions have already started, cannot add more hooks at this point');

        this.current.afterEach.push({ name, func, timeout });
    }
    after({ name, func, timeout }) {
        if (this.current.started)
            throw new Error('Actions have already started, cannot add more hooks at this point');

        this.current.after.push({ name, func, timeout });
    }

    async _runHooks(item, entry) {
        const actions = item[entry];
        for (let action of actions) {
            await this._reporter.on({ entry, context: item.context, event: EVENTS.ENTER });

            try {
                const competitors = [
                    action.func.call(item.context, item.context)
                ];

                if (action.timeout) {
                    competitors.push(new Promise((resolve, reject) => {
                        setTimeout(() => reject(new Error('Timeout')), action.timeout);
                    }))
                }

                await Promise.race(competitors);

                await this._reporter.on({ entry, context: item.context, event: EVENTS.SUCCESS });
            }
            catch (ex) {
                // Needs to be called before any other async await gets a chance to operate
                if (ex.message === 'Timeout' && item.context.cancel)
                    item.context.cancel(item.context);

                await this._reporter.on({ entry, context: item.context, event: ex.message === 'Timeout' ? EVENTS.TIMEOUT : EVENTS.FAILURE, ex });
                throw ex;
            }
            finally {
                await this._reporter.on({ entry, context: item.context, event: EVENTS.LEAVE });
            }
        }
    }

    async _before(item) {
        if (item.started)
            return;

        return this._runHooks(item, 'before');
    }

    _beforeEach(item) {
        return this._runHooks(item, 'beforeEach');
    }

    _afterEach(item) {
        return this._runHooks(item, 'afterEach');
    }

    _after(item) {
        return this._runHooks(item, 'after');
    }
}

module.exports = State;