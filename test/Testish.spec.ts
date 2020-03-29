import {Testish} from "../src/Testish";
import {JsonReporter, PipeReporter, VerboseReporter} from "../src/Reporters";
import {Timeout} from 'advanced-promises';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {BlockType, EventStatusType, EventType, HookDepth, HookWhen} from "../src/types";
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

function mutatingMerge(expected, actual) {
    if (!expected || typeof expected !== 'object' || expected instanceof Error)
        return;
    if (!actual || typeof actual !== 'object' || actual instanceof Error)
        return;

    if (Array.isArray(expected)) {
        expected.forEach((val, idx) => {
           mutatingMerge(val, actual[idx]);
        });
        return expected;
    }

    Object.entries(actual).forEach(([key, val]) => {
        if ({}.hasOwnProperty.call(expected, key)) {
            if (val && val instanceof Error && typeof expected[key] === 'string')
                actual[key] = val.message;
            else
                mutatingMerge(expected[key], val);
        }
        else {
            delete actual[key];
            //expected[key] = val;
        }
    });

    return expected;
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

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));
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

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));
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

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'd', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'd', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));
        });
        it('exceptions should be reported in order', async () => {
            const { api, events } = createApi();

            const EX = new Error('my error');

            api.describe('a', () => {
                throw EX;
            });

            await expect(api.done()).to.eventually.be.rejectedWith(EX);

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
            ], events));
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

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS },
                { description: 'd', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
            ], events));
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

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS, exception: EX },
                { description: 'd', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS, exception: EX },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: 'e', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS, exception: EX },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
            ], events));
        });
    });

    describe('it', () => {
        it('single test', async () => {
            const { api, events } = createApi();

            api.it('a', () => {
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));
        });
        it('should fail without throwing', async () => {
            const { api, events } = createApi();

            const EX = new Error('my error');

            api.it('a', () => {
                throw EX;
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.IT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: 'a', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));
        });
        it('should fail from chai', async () => {
            const { api, events } = createApi();

            const EX = getEx(() => expect(false).to.be.true);

            api.it('a', () => {
                expect(false).to.be.true;
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.IT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: 'a', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));
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

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.IT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: 'x', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'y', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'y', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'z', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'z', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));
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

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.TIMEOUT, exception: EX.message },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.TIMEOUT, exception: EX.message },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX.message },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX.message },
            ], events));
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

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.TIMEOUT, exception: EX.message },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.TIMEOUT, exception: EX.message },
                { description: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS, exception: EX.message },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX.message },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX.message },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX.message },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX.message },
            ], events));
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

           expect(events).to.deep.equal(mutatingMerge([
               { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
               { description: 'global note', blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: id, value: 'my value' },
               { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
               { description: 'describe note', blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: id, value: 'my value' },
               { description: 'b', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
               { description: 'it note', blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: id, value: 'my value' },
               { description: 'b', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
               { description: 'describe note after', blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: id, value: 'my value' },
               { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
               { description: 'global note after', blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: id, value: 'my value' },
               { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
           ], events));
       });
    });

    describe('hook', () => {
        it('should run before each', async () => {
            const { api, events } = createApi();

            api.hook('x', () => {
            }, { depth: HookDepth.ALL, when: HookWhen.BEFORE_EACH, blockTypes: [BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
            api.describe('a', () => {
                api.describe('b', () => {
                });
                api.it('1', () => {
                });
            });
            api.it('2', () => {
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'a' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'a' } } },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'b' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'b' } } },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '1' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '1' } } },
                { description: '1', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '1', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '2' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '2' } } },
                { description: '2', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '2', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));

       });
        it('should run after each', async () => {
            const { api, events } = createApi();

            api.hook('x', () => {
            }, { depth: HookDepth.ALL, when: HookWhen.AFTER_EACH, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
            api.describe('a', () => {
                api.describe('b', () => {
                });
                api.it('1', () => {
                });
            });
            api.it('2', () => {
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'b' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'b' } } },
                { description: '1', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '1', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '1' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '1' } } },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'a' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'a' } } },
                { description: '2', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '2', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '2' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '2' } } },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));

        });
        it('should run in order', async () => {
            const { api, events } = createApi();

            api.hook('x', () => {
            }, { depth: HookDepth.ALL, when: HookWhen.BEFORE_EACH, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
            api.describe('a', () => {
                api.hook('y', () => {
                }, { depth: HookDepth.ALL, when: HookWhen.BEFORE_EACH, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
                api.describe('b', () => {
                    api.hook('z', () => {
                    }, { depth: HookDepth.ALL, when: HookWhen.BEFORE_EACH, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
                    api.it('1', () => {
                    });
                });
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'a' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'a' } } },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'b' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'b' } } },
                { description: 'y', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'b' } } },
                { description: 'y', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'b' } } },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '1' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '1' } } },
                { description: 'y', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '1' } } },
                { description: 'y', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '1' } } },
                { description: 'z', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '1' } } },
                { description: 'z', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '1' } } },
                { description: '1', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '1', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));

        });
        it('should run only on deep blocks', async () => {
            const { api, events } = createApi();

            api.hook('x', () => {
            }, { depth: HookDepth.DEEP, when: HookWhen.BEFORE_EACH, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
            api.describe('a', () => {
                api.describe('b', () => {
                    api.it('1', () => {
                    });
                });
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'b' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'b' } } },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '1' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '1' } } },
                { description: '1', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '1', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));

        });
        it('should run only on shallow blocks', async () => {
            const { api, events } = createApi();

            api.hook('x', () => {
            }, { depth: HookDepth.SHALLOW, when: HookWhen.BEFORE_EACH, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
            api.describe('a', () => {
                api.describe('b', () => {
                    api.it('1', () => {
                    });
                });
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'a' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'a' } } },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '1', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '1', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));

        });
        it('should run before', async () => {
            const { api, events } = createApi();

            api.hook('x', () => {
            }, { depth: HookDepth.ALL, when: HookWhen.BEFORE_ONCE, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
            api.describe('a', () => {
                api.describe('b', () => {
                });
                api.it('1', () => {
                });
            });
            api.it('2', () => {
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'a' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'a' } } },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: '1', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '1', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: '2', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '2', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));

        });
        it('should run after', async () => {
            const { api, events } = createApi();

            api.describe('a', () => {
                api.hook('x', () => {
                }, { depth: HookDepth.ALL, when: HookWhen.AFTER_ONCE, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
                api.describe('b', () => {
                });
                api.it('1', () => {
                });
            });
            api.it('2', () => {
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: '1', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '1', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '1' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '1' } } },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: '2', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '2', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));

        });
        it('should run first', async () => {
            const { api, events } = createApi();

            api.hook('x', () => {
            }, { depth: HookDepth.ALL, when: HookWhen.BEFORE_ONCE, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
            api.describe('a', () => {
                api.describe('b', () => {
                });
                api.it('1', () => {
                });
            });
            api.it('2', () => {
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'a' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: 'a' } } },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: '1', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '1', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: '2', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '2', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));

        });
        it('should run last', async () => {
            const { api, events } = createApi();

            api.hook('x', () => {
            }, { depth: HookDepth.ALL, when: HookWhen.AFTER_ONCE, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
            api.describe('a', () => {
                api.describe('b', () => {
                });
                api.it('1', () => {
                });
            });
            api.it('2', () => {
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: '1', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '1', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: '2', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: '2', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '2' } } },
                { description: 'x', blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, context: { trigger: { description: '2' } } },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));

        });
    });
});
