import { Testish } from "../src/Testish";
import { VerboseReporter, PipeReporter, JsonReporter } from "../src/Reporters";
import {Timeout} from 'advanced-promises';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {BlockType, Event, EventType} from "../src/types";

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
    return events.map(({blockType, eventType, context, exception}) => {
        if (exception)
            return { name: context.description, blockType, eventType, exception };
        else
            return { name: context.description, blockType, eventType };
    });
}

function simplifyEventsEx(events : Event[]) {
    return events.map(({blockType, eventType, context, exception}) => {
        if (exception)
            return { name: context.description, blockType, eventType, exception: exception.message };
        else
            return { name: context.description, blockType, eventType };
    });
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
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
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
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { name: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { name: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
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
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { name: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'd', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'd', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { name: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
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
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.EXCEPTION, exception: EX },
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_EXCEPTION, exception: EX },
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
                throw EX;
            });

            await expect(api.done()).to.eventually.be.rejectedWith(EX);

            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.EXCEPTION, exception: EX },
                { name: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP },
                { name: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP },
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_EXCEPTION, exception: EX },
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
            });

            await expect(api.done()).to.eventually.be.rejectedWith(EX);

            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.EXCEPTION, exception: EX },
                { name: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_EXCEPTION, exception: EX },
                { name: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, exception: EX },
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.EXCEPTION, exception: EX },
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_EXCEPTION, exception: EX },
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
                { name: 'a', blockType: BlockType.IT, eventType: EventType.ENTER },
                { name: 'a', blockType: BlockType.IT, eventType: EventType.LEAVE_SUCCESS },
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
                { name: 'a', blockType: BlockType.IT, eventType: EventType.ENTER },
                { name: 'a', blockType: BlockType.IT, eventType: EventType.EXCEPTION, exception: EX },
                { name: 'a', blockType: BlockType.IT, eventType: EventType.LEAVE_EXCEPTION, exception: EX },
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
                { name: 'a', blockType: BlockType.IT, eventType: EventType.ENTER },
                { name: 'a', blockType: BlockType.IT, eventType: EventType.EXCEPTION, exception: EX },
                { name: 'a', blockType: BlockType.IT, eventType: EventType.LEAVE_EXCEPTION, exception: EX },
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
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'x', blockType: BlockType.IT, eventType: EventType.ENTER },
                { name: 'x', blockType: BlockType.IT, eventType: EventType.EXCEPTION, exception: EX },
                { name: 'x', blockType: BlockType.IT, eventType: EventType.LEAVE_EXCEPTION, exception: EX },
                { name: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'y', blockType: BlockType.IT, eventType: EventType.ENTER },
                { name: 'y', blockType: BlockType.IT, eventType: EventType.LEAVE_SUCCESS },
                { name: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
                { name: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'z', blockType: BlockType.IT, eventType: EventType.ENTER },
                { name: 'z', blockType: BlockType.IT, eventType: EventType.LEAVE_SUCCESS },
                { name: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
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
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.TIMEOUT, exception: EX.message },
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_TIMEOUT, exception: EX.message },
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
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
                { name: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.TIMEOUT, exception: EX.message },
                { name: 'b', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_TIMEOUT, exception: EX.message },
                { name: 'c', blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, exception: EX.message },
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.EXCEPTION, exception: EX.message },
                { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_EXCEPTION, exception: EX.message },
            ]);
        });

    })
});