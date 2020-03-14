import {Testish} from "../src/Testish";
import {JsonReporter, PipeReporter, VerboseReporter} from "../src/Reporters";
import {Timeout} from 'advanced-promises';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {BlockType, Event, EventType, HookDepth, HookWhen} from "../src/types";
import {Guid} from "guid-typescript";

chai.use(chaiAsPromised);
const should = chai.should;
const expect = chai.expect;

function createApi(options = {}) {
    const jsonReporter = new JsonReporter();
    const api = new Testish(Object.assign(
        {
            reporter: new PipeReporter([
                jsonReporter,
                new VerboseReporter({ indent: true })
            ])
        },
        options
    ));

    return { events: jsonReporter.events, api };
}

function simplifyEvents(events : Event[]) {
    return events.map((event) => {
        const obj : any = { description: event.description, blockType: event.blockType, eventType: event.eventType };
        if (event.exception)
            obj.exception = event.exception;
        if (event.value)
            obj.value = event.value;
        if (event.id)
            obj.id = event.id;
        if (event.blockType === BlockType.HOOK) {
            obj.when = event.hookOptions.when;
            obj.target = event.context.description;
        }

        return obj;
    });
}

function simplifyEventsEx(events : Event[]) {
    return simplifyEvents(events).map(event => event.exception ? Object.assign({}, event, { exception: event.exception.message }) : event);
}

function getEx(cb: () => void) : Error {
    let exception : Error = undefined;
    try {
        cb();
    }
    catch (ex) {
        exception = ex;
    }
    return exception;
}

describe('Testish', () => {
    describe('describe', () => {
        it('single describe', async () => {
            const { api, events } = createApi();

            api.describe('a', () => {
            });

            await api.done();

            expect(simplifyEvents(events)).to.deep.equal([
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
            ]);
        });
        it('describe block should execute in order', async () => {
            const { api, events } = createApi();

            api.describe('a', () => {
            });
            api.describe('b', () => {
            });
            api.describe('c', () => {
            });

            await api.done();

            expect(simplifyEvents(events)).to.deep.equal([
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
            ]);
        });
        it('describe blocks should execute depth first', async () => {
            const { api, events } = createApi();

            api.describe('a', () => {
                api.describe('b', () => {
                });
            });
            api.describe('c', () => {
                api.describe('d', () => {
                });
            });

            await api.done();

            expect(simplifyEvents(events)).to.deep.equal([
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'd', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'd', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
            ]);
        });
        it('exceptions should be reported in order', async () => {
            const { api, events } = createApi();

            const EX = new Error('my error');

            api.describe('a', () => {
                throw EX;
            });

            await expect(api.done()).to.eventually.be.rejectedWith(EX);

            expect(simplifyEvents(events)).to.deep.equal([
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.EXCEPTION, exception: EX },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_EXCEPTION, exception: EX },
            ]);
        });
        it('describe should skip after exception', async () => {
            const { api, events } = createApi();

            const EX = new Error('my error');

            api.describe('a', () => {
                api.describe('b', () => {
                });
                api.describe('c', () => {
                });
                api.describe('d', () => {
                });
                throw EX;
            });

            await expect(api.done()).to.eventually.be.rejectedWith(EX);

            expect(simplifyEvents(events)).to.deep.equal([
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.EXCEPTION, exception: EX },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP },
                { description: 'd', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_EXCEPTION, exception: EX },
            ]);
        });
        it('exceptions should skip siblings and be passed along during reporting', async () => {
            const { api, events } = createApi();

            const EX = new Error('my error');
            const EX2 = new Error('another error');

            api.describe('a', async () => {
                api.describe('b', () => {
                    throw EX;
                });
                api.describe('c', () => {
                });
                api.describe('d', () => {
                });
            });
            api.describe('e', () => {
            });
            await expect(api.done()).to.eventually.be.rejectedWith(EX);

            expect(simplifyEvents(events)).to.deep.equal([
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.EXCEPTION, exception: EX },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_EXCEPTION, exception: EX },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, exception: EX },
                { description: 'd', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, exception: EX },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.EXCEPTION, exception: EX },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_EXCEPTION, exception: EX },
                { description: 'e', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, exception: EX },
            ]);
        });
    });

    describe('it', () => {
        it('single test', async () => {
            const { api, events } = createApi();

            api.it('a', () => {
            });

            await api.done();

            expect(simplifyEvents(events)).to.deep.equal([
                { description: 'a', blockType: BlockType.IT, eventType: EventType.ENTER },
                { description: 'a', blockType: BlockType.IT, eventType: EventType.LEAVE_SUCCESS },
            ]);
        });

        it('should fail without throwing', async () => {
            const { api, events } = createApi();

            const EX = new Error('my error');

            api.it('a', () => {
                throw EX;
            });

            await api.done();

            expect(simplifyEvents(events)).to.deep.equal([
                { description: 'a', blockType: BlockType.IT, eventType: EventType.ENTER },
                { description: 'a', blockType: BlockType.IT, eventType: EventType.EXCEPTION, exception: EX },
                { description: 'a', blockType: BlockType.IT, eventType: EventType.LEAVE_EXCEPTION, exception: EX },
            ]);
        });

        it('should fail from chai', async () => {
            const { api, events } = createApi();

            const EX = getEx(() => expect(false).to.be.true);

            api.it('a', () => {
                expect(false).to.be.true;
            });

            await api.done();

            expect(simplifyEvents(events)).to.deep.equal([
                { description: 'a', blockType: BlockType.IT, eventType: EventType.ENTER },
                { description: 'a', blockType: BlockType.IT, eventType: EventType.EXCEPTION, exception: EX },
                { description: 'a', blockType: BlockType.IT, eventType: EventType.LEAVE_EXCEPTION, exception: EX },
            ]);
        });

        it('exceptions should not propagate', async () => {
            const { api, events } = createApi();

            const EX = new Error('my error');

            api.describe('a', async () => {
                api.it('x', () => {
                    throw EX;
                });
                api.describe('b', async () => {
                    api.it('y', () => {
                    });
                });
            });
            api.describe('c', async () => {
                api.it('z', () => {
                });
            });

            await api.done();

            expect(simplifyEvents(events)).to.deep.equal([
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'x', blockType: BlockType.IT, eventType: EventType.ENTER },
                { description: 'x', blockType: BlockType.IT, eventType: EventType.EXCEPTION, exception: EX },
                { description: 'x', blockType: BlockType.IT, eventType: EventType.LEAVE_EXCEPTION, exception: EX },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'y', blockType: BlockType.IT, eventType: EventType.ENTER },
                { description: 'y', blockType: BlockType.IT, eventType: EventType.LEAVE_SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'z', blockType: BlockType.IT, eventType: EventType.ENTER },
                { description: 'z', blockType: BlockType.IT, eventType: EventType.LEAVE_SUCCESS },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
            ]);
        });
    });

    describe('timeout', () => {
        it('should time out', async () => {
            const { api, events } = createApi();

            const EX = new Error('Timeout');

            api.describe('a', async () => {
                await new Timeout(50);
            }, { timeout: 10 });

            await expect(api.done()).to.eventually.be.rejectedWith(EX.constructor, 'Timeout');

            expect(simplifyEventsEx(events)).to.deep.equal([
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.TIMEOUT, exception: EX.message },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_TIMEOUT, exception: EX.message },
            ]);
        });

        it('timeout should propegate like an exception', async () => {
            const { api, events } = createApi();

            const EX = new Error('Timeout');

            api.describe('a', async () => {
                api.describe('b', async () => {
                   await new Timeout(50);
                }, { timeout: 10 });
                api.describe('c', () => {
                });
            });

            await expect(api.done()).to.eventually.be.rejectedWith(EX.constructor, 'Timeout');

            expect(simplifyEventsEx(events)).to.deep.equal([
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.TIMEOUT, exception: EX.message },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_TIMEOUT, exception: EX.message },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, exception: EX.message },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.EXCEPTION, exception: EX.message },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_EXCEPTION, exception: EX.message },
            ]);
        });

    });

    describe('note', () => {
       it('should work at each layer', async () => {
           const { api, events } = createApi();

           const id = Guid.createEmpty();

           await api.note(id, 'global note', 'my value');
           api.describe('a', async () => {
               await api.note(id, 'describe note', 'my value');
               api.it('b', async () => {
                   await api.note(id, 'it note', 'my value');
               });
               await api.note(id, 'describe note after', 'my value');
           });
           await api.note(id, 'global note after', 'my value');

           await api.done();

           // TODO: Put notes into the queue to ensure they are executed in sibling order

           expect(simplifyEvents(events)).to.deep.equal([
               { description: 'global note', blockType: BlockType.NOTE, eventType: EventType.NOTE, id: id, value: 'my value' },
               { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
               { description: 'describe note', blockType: BlockType.NOTE, eventType: EventType.NOTE, id: id, value: 'my value' },
               { description: 'b', blockType: BlockType.IT, eventType: EventType.ENTER },
               { description: 'it note', blockType: BlockType.NOTE, eventType: EventType.NOTE, id: id, value: 'my value' },
               { description: 'b', blockType: BlockType.IT, eventType: EventType.LEAVE_SUCCESS },
               { description: 'describe note after', blockType: BlockType.NOTE, eventType: EventType.NOTE, id: id, value: 'my value' },
               { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
               { description: 'global note after', blockType: BlockType.NOTE, eventType: EventType.NOTE, id: id, value: 'my value' },
           ]);
       });
    });

    describe('hook', () => {
        it('should run before each', async () => {
            const { api, events } = createApi();

            // TODO: work out before vs beforeEach. add an "each" flag?

            api.hook('x', () => {
            }, { depth: HookDepth.ALL, when: HookWhen.BEFORE });
            api.describe('a', () => {
                api.describe('b', () => {
                });
                api.it('1', () => {
                });
            });
            api.it('2', () => {
            });

            await api.done();

            expect(simplifyEvents(events)).to.deep.equal([
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, target: 'a', when: HookWhen.BEFORE },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE_SUCCESS, target: 'a', when: HookWhen.BEFORE },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, target: 'b', when: HookWhen.BEFORE },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE_SUCCESS, target: 'b', when: HookWhen.BEFORE },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, target: '1', when: HookWhen.BEFORE },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE_SUCCESS, target: '1', when: HookWhen.BEFORE },
                { description: '1', blockType: BlockType.IT, eventType: EventType.ENTER },
                { description: '1', blockType: BlockType.IT, eventType: EventType.LEAVE_SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, target: '2', when: HookWhen.BEFORE },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE_SUCCESS, target: '2', when: HookWhen.BEFORE },
                { description: '2', blockType: BlockType.IT, eventType: EventType.ENTER },
                { description: '2', blockType: BlockType.IT, eventType: EventType.LEAVE_SUCCESS },
            ]);

       });
    });
});