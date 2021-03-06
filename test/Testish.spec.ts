// Empty Blocks used for testing reporting:
// tslint:disable:no-empty
// Chai assertions:
// tslint:disable:no-unused-expression
// These are just tests:
// tslint:disable:object-literal-shorthand

import {Rooibos} from "../src/Rooibos";
import {Timeout} from 'advanced-promises';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {
    BlockType, Context,
    ErrorAbort,
    ErrorNotJson,
    ErrorTimeout,
    EventStatusType,
    EventType,
    HookDepth,
    HookOnceWhen,
    HookWhen,
    ResultAbort
} from "../src/types";
import {Guid} from "guid-typescript";
import {createApi, getEx, mutatingMerge} from "./_util";

chai.use(chaiAsPromised);
const should = chai.should;
const expect = chai.expect;


describe('Rooibos', () => {
    describe('rooibos', () => {
       it('empty rooibos should not stall', async () => {
           const { api, events } = createApi();

           await api.done();

           expect(events).to.deep.equal(mutatingMerge([
               { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
               { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
           ], events));
       });
    });

    describe('script', () => {
        it('single script', async () => {
            const { api, events } = createApi();

            api.script('a', () => {
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));
        });
        it('script block should execute in order', async () => {
            const { api, events } = createApi();

            api.script('a', () => {
            });
            api.script('b', () => {
            });
            api.script('c', () => {
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'c' }, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'c' }, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));
        });
        it('script blocks should execute depth first', async () => {
            const { api, events } = createApi();

            api.script('a', () => {
                api.script('b', () => {
                });
            });
            api.script('c', () => {
                api.script('d', () => {
                });
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'c' }, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'd' }, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'd' }, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'c' }, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));
        });
        it('exceptions should be reported in order', async () => {
            const { api, events } = createApi();

            const EX = new Error('my error');

            api.script('a', () => {
                throw EX;
            });

            await expect(api.done()).to.eventually.be.rejectedWith(EX);

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
            ], events));
        });
        it('script should skip after exception', async () => {
            const { api, events } = createApi();

            const EX = new Error('my error');

            api.script('a', () => {
                api.script('b', () => {
                });
                api.script('c', () => {
                });
                api.script('d', () => {
                });
                throw EX;
            });

            await expect(api.done()).to.eventually.be.rejectedWith(EX);

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'b' }, blockType: BlockType.SCRIPT, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'c' }, blockType: BlockType.SCRIPT, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'd' }, blockType: BlockType.SCRIPT, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
            ], events));
        });
        it('exceptions should skip siblings and be passed along during reporting', async () => {
            const { api, events } = createApi();

            const EX = new Error('my error');
            const EX2 = new Error('another error');

            api.script('a', async () => {
                api.script('b', () => {
                    throw EX;
                });
                api.script('c', () => {
                });
                api.script('d', () => {
                });
            });
            api.script('e', () => {
            });
            await expect(api.done()).to.eventually.be.rejectedWith(EX);

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.SCRIPT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'b' }, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'c' }, blockType: BlockType.SCRIPT, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS, exception: EX },
                { context: { description: 'd' }, blockType: BlockType.SCRIPT, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS, exception: EX },
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'a' }, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'e' }, blockType: BlockType.SCRIPT, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
            ], events));
        });
    });

    describe('describe', () => {
        it('single describe', async () => {
            const { api, events } = createApi();

            api.describe('a', () => {
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
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
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'c' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'c' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
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
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'c' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'd' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'd' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'c' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
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
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
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
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'c' }, blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'd' }, blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
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
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'c' }, blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS, exception: EX },
                { context: { description: 'd' }, blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS, exception: EX },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'e' }, blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
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
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
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
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.IT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'a' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
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
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.IT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'a' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
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
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'x' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'x' }, blockType: BlockType.IT, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'x' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'y' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'y' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'c' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'z' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'z' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'c' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));
        });
    });

    describe('timeout', () => {
        it('describe should time out', async () => {
            const { api, events } = createApi();

            const EX = { name: 'ErrorTimeout', message: 'Timeout', context: undefined as Context};

            api.describe('a', async (context) => {
                EX.context = context;
                await new Timeout(50);
            }, { timeout: 10 });

            await expect(api.done()).to.eventually.be.rejectedWith(ErrorTimeout, 'Timeout');

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.TIMEOUT, exception: EX },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.TIMEOUT, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
            ], events));
        });
        it('it should time out and not propagate', async () => {
            const { api, events } = createApi();

            const EX = { name: 'ErrorTimeout', message: 'Timeout', context: undefined as Context };

            api.it('a', async (context) => {
                EX.context = context;
                await new Timeout(50);
            }, { timeout: 10 });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.IT, eventType: EventType.NOTE, eventStatusType: EventStatusType.TIMEOUT, exception: EX },
                { context: { description: 'a' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.TIMEOUT, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
            ], events));
        });
        it('note should time out', async () => {
            const { api, events } = createApi();

            const EX = { name: 'ErrorTimeout', message: 'Timeout', context: undefined as Context };

            api.note(Guid.createEmpty(),'a', async (context) => {
                EX.context = context;
                await new Timeout(50);
                return {};
            }, { timeout: 10 });

            await expect(api.done()).to.eventually.be.rejectedWith(ErrorTimeout, 'Timeout');

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.TIMEOUT, exception: EX },
                { context: { description: 'a' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.TIMEOUT, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
            ], events));
        });
        it('hook should time out', async () => {
            const { api, events } = createApi();

            const EX = { name: 'ErrorTimeout', message: 'Timeout', context: undefined as Context };

            api.hook('x', async (context) => {
                EX.context = context;
                await new Timeout(50);
            }, { when: HookOnceWhen.BEFORE_ONCE, depth: HookDepth.SHALLOW, blockTypes: [BlockType.DESCRIBE], timeout: 10 });

            api.describe('a', () => {});

            await expect(api.done()).to.eventually.be.rejectedWith(ErrorTimeout, 'Timeout');

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'x' }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'x' }, blockType: BlockType.HOOK, eventType: EventType.NOTE, eventStatusType: EventStatusType.TIMEOUT, exception: EX },
                { context: { description: 'x' }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.TIMEOUT, exception: EX },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
            ], events));
        });
        it('timeout should propagate like an exception', async () => {
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
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.TIMEOUT, exception: EX.message },
                { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.TIMEOUT, exception: EX.message },
                { context: { description: 'c' }, blockType: BlockType.DESCRIBE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS, exception: EX.message },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX.message },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX.message },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX.message },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX.message },
            ], events));
        });
    });

    describe('abort', () => {
        it('describe should be abortable', async () => {
            const { api, events } = createApi();

            const EX = { name: 'ErrorAbort', message: 'Abort', context: undefined as Context };
            let res = EventStatusType.UNUSED;

            api.describe('a', async (context) => {
                EX.context = context;

                // abort after 10ms
                new Timeout(10).then(async () => {
                    // wait for abort to finish and stash the result
                    res = (await context.abort() as ResultAbort).status;
                });

                api.note(Guid.createEmpty(), 'not yet aborted', undefined);
                // wait until aborted
                await new Timeout(Timeout.INF).withAutoAbort(context.aapi);
                api.note(Guid.createEmpty(), 'should be skipped', undefined);
            });

            await expect(api.done()).to.eventually.be.rejectedWith(ErrorAbort, 'Abort');

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },

                { context: { description: 'not yet aborted' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'not yet aborted' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'not yet aborted' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.NOTE, eventStatusType: EventStatusType.ABORT, exception: EX },

                { context: { description: 'should be skipped', parent: { exception: EX }}, blockType: BlockType.NOTE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.ABORT, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
            ], events));

        });
        it('it should be abortable', async () => {
            const { api, events } = createApi();

            const EX = { name: 'ErrorAbort', message: 'Abort', context: undefined as Context };
            let res = EventStatusType.UNUSED;

            api.it('a', async (context) => {
                EX.context = context;

                // abort after 10ms
                new Timeout(10).then(async () => {
                    // wait for abort to finish and stash the result
                    res = (await context.abort() as ResultAbort).status;
                });

                api.note(Guid.createEmpty(), 'not yet aborted', undefined);
                // wait until aborted
                await new Timeout(Timeout.INF).withAutoAbort(context.aapi);
                api.note(Guid.createEmpty(), 'should be skipped', undefined);
            });

            await api.done();

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },

                { context: { description: 'not yet aborted' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'not yet aborted' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'not yet aborted' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                { context: { description: 'a' }, blockType: BlockType.IT, eventType: EventType.NOTE, eventStatusType: EventStatusType.ABORT, exception: EX },

                { context: { description: 'should be skipped', parent: { exception: EX }}, blockType: BlockType.NOTE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.ABORT, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
            ], events));

        });
        it('note should be abortable', async () => {
            const { api, events } = createApi();

            const EX = { name: 'ErrorAbort', message: 'Abort', context: undefined as Context };
            let res = EventStatusType.UNUSED;

            api.note(Guid.createEmpty(), 'a', async (context) => {
                EX.context = context;

                // abort after 10ms
                new Timeout(10).then(async () => {
                    // wait for abort to finish and stash the result
                    res = (await context.abort() as ResultAbort).status;
                });

                await new Timeout(Timeout.INF).withAutoAbort(context.aapi);

                return 'should be aborted';
            });

            await expect(api.done()).to.eventually.be.rejectedWith(ErrorAbort, 'Abort');

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'a' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'a' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.ABORT, exception: EX },
                { context: { description: 'a' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.ABORT, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: EX },
            ], events));

        });
    });

    describe('note', () => {
       it('should run in order', async () => {
           const { api, events } = createApi();

           const id = Guid.createEmpty();

           api.note(id, 'global note', 'my value');
           api.describe('a', async () => {
               api.note(id, 'describe note', 'my value');
               api.it('b', async () => {
                   api.note(id, 'it note', 'my value');
               });
               api.note(id, 'describe note after', 'my value');
           });
           api.note(id, 'global note after', 'my value');

           await api.done();

           // TODO: Put notes into the queue to ensure they are executed in sibling order

           expect(events).to.deep.equal(mutatingMerge([
               { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
               { context: { description: 'global note' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, id: id },
               { context: { description: 'global note' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: id, value: 'my value' },
               { context: { description: 'global note' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, id: id },
               { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
               { context: { description: 'describe note' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, id: id },
               { context: { description: 'describe note' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: id, value: 'my value' },
               { context: { description: 'describe note' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, id: id },
               { context: { description: 'b' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
               { context: { description: 'it note' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, id: id },
               { context: { description: 'it note' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: id, value: 'my value' },
               { context: { description: 'it note' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, id: id },
               { context: { description: 'b' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
               { context: { description: 'describe note after' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, id: id },
               { context: { description: 'describe note after' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: id, value: 'my value' },
               { context: { description: 'describe note after' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, id: id },
               { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
               { context: { description: 'global note after' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, id: id },
               { context: { description: 'global note after' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: id, value: 'my value' },
               { context: { description: 'global note after' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, id: id },
               { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
           ], events));
       });
       it('should evaluate callback at execution time', async () => {
           const { api, events } = createApi();

           const id = Guid.createEmpty();

           let value = 'my initial value';
           api.note(id, 'global note', () => value);
           value = 'my final value';
           await api.done();

           expect(events).to.deep.equal(mutatingMerge([
               { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
               { context: { description: 'global note' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, id: id },
               { context: { description: 'global note' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: id, value: value },
               { context: { description: 'global note' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS, id: id },
               { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
           ], events));
       });
       it('should skip evaluation after error', async () => {
           const { api, events } = createApi();

           const id = Guid.createEmpty();

           const EX = new Error('my error');

           api.note(id, 'a', () => { throw EX });
           api.note(id, 'b', () => 'evaluated');
           api.note(id, 'c', 'direct');

           await expect(api.done()).to.eventually.be.rejectedWith(EX);

           expect(events).to.deep.equal(mutatingMerge([
               { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
               { context: { description: 'a' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, id: id, value: undefined },
               { context: { description: 'a' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, id: id, value: undefined, exception: EX },
               { context: { description: 'a' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, id: id, value: undefined, exception: EX },
               { context: { description: 'b' }, blockType: BlockType.NOTE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS, id: id, value: undefined, exception: EX },
               { context: { description: 'c' }, blockType: BlockType.NOTE, eventType: EventType.SKIP, eventStatusType: EventStatusType.SUCCESS, id: id, value: undefined, exception: EX },
               { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: EX},
               { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION},
           ], events));
       });
       it('should fail for non-json', async () => {
           const { api, events } = createApi();

           const id = Guid.createEmpty();

           const EX = new Error('my error');
           const NotJson = { value: undefined as undefined};

           api.note(id, 'a', NotJson);

           await expect(api.done()).to.eventually.be.rejectedWith(ErrorNotJson, 'Not Json');

           expect(events).to.deep.equal(mutatingMerge([
               { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
               { context: { description: 'a' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS, id: id, value: undefined },
               { context: { description: 'a' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, id: id, value: undefined, exception: { message: 'Not Json', value: NotJson } },
               { context: { description: 'a' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, id: id, value: undefined, exception: 'Not Json' },
               { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.NOTE, eventStatusType: EventStatusType.EXCEPTION, exception: 'Not Json'},
               { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.EXCEPTION, exception: 'Not Json'},
           ], events));
       })
    });

    describe('hook', () => {
        describe('beforeOnce', () => {
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
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'x', trigger: { description: 'a' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'a' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
            it('should run before', async () => {
                const { api, events } = createApi();

                api.describe('a', () => {
                    api.hook('x', () => {
                    }, { depth: HookDepth.ALL, when: HookWhen.BEFORE_ONCE, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
                    api.describe('b', () => {
                    });
                    api.it('1', () => {
                    });
                });
                api.it('2', () => {
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'b' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'b' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
            it('should run in order', async () => {
                const { api, events } = createApi();

                api.hook('x', () => {
                }, { depth: HookDepth.ALL, when: HookWhen.BEFORE_ONCE, blockTypes: [ BlockType.IT], timeout: undefined });
                api.describe('a', () => {
                    api.hook('y', () => {
                    }, { depth: HookDepth.ALL, when: HookWhen.BEFORE_ONCE, blockTypes: [ BlockType.IT], timeout: undefined });
                    api.describe('b', () => {
                        api.hook('z', () => {
                        }, { depth: HookDepth.ALL, when: HookWhen.BEFORE_ONCE, blockTypes: [ BlockType.IT], timeout: undefined });
                        api.it('1', () => {
                        });
                    });
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'z', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'z', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
            it('should ghost', async () => {
                const { api, events } = createApi();

                api.hook('x', () => {
                }, { depth: HookDepth.ALL, when: HookWhen.BEFORE_ONCE, blockTypes: [ BlockType.IT], timeout: undefined });
                api.describe('a', () => {
                    api.hook('y', () => {
                    }, { depth: HookDepth.ALL, when: HookWhen.BEFORE_ONCE, blockTypes: [ BlockType.IT], timeout: undefined });
                    api.describe('b', () => {
                    });
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: undefined }, blockType: BlockType.HOOK, eventType: EventType.SKIP, eventStatusType: EventStatusType.UNUSED },
                    { context: { description: 'a', trigger: undefined }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x' }, blockType: BlockType.HOOK, eventType: EventType.SKIP, eventStatusType: EventStatusType.UNUSED },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));
            });
            it('should only run shallow', async () => {
                const { api, events } = createApi();

                api.hook('x', () => {
                }, { depth: HookDepth.SHALLOW, when: HookWhen.BEFORE_ONCE, blockTypes: [ BlockType.IT], timeout: undefined });
                api.describe('a', () => {
                    api.hook('y', () => {
                    }, { depth: HookDepth.SHALLOW, when: HookWhen.BEFORE_ONCE, blockTypes: [ BlockType.IT], timeout: undefined });
                    api.describe('b', () => {
                        api.it('1', () => {
                        });
                    });
                    api.it('2', () => {
                    });
                });
                api.it('3', () => {
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '2' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '2' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '3' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '3' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '3' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '3' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
            it('should only run deep', async () => {
                const { api, events } = createApi();

                api.hook('x', () => {
                }, { depth: HookDepth.DEEP, when: HookWhen.BEFORE_ONCE, blockTypes: [ BlockType.IT ], timeout: undefined });
                api.describe('a', () => {
                    api.hook('y', () => {
                    }, { depth: HookDepth.DEEP, when: HookWhen.BEFORE_ONCE, blockTypes: [ BlockType.IT ], timeout: undefined });
                    api.describe('b', () => {
                        api.it('1', () => {
                        });
                    });
                    api.it('2', () => {
                    });
                });
                api.it('3', () => {
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '3' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '3' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
        });
        describe('afterOnce', () => {
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
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '2' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '2' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
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
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
            it('should run in order', async () => {
                const { api, events } = createApi();

                api.hook('x', () => {
                }, { depth: HookDepth.ALL, when: HookWhen.AFTER_ONCE, blockTypes: [ BlockType.IT], timeout: undefined });
                api.describe('a', () => {
                    api.hook('y', () => {
                    }, { depth: HookDepth.ALL, when: HookWhen.AFTER_ONCE, blockTypes: [ BlockType.IT], timeout: undefined });
                    api.describe('b', () => {
                        api.hook('z', () => {
                        }, { depth: HookDepth.ALL, when: HookWhen.AFTER_ONCE, blockTypes: [ BlockType.IT], timeout: undefined });
                        api.it('1', () => {
                        });
                    });
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },

                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'z', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'z', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
            it('should ghost', async () => {
                const { api, events } = createApi();

                api.hook('x', () => {
                }, { depth: HookDepth.ALL, when: HookWhen.AFTER_ONCE, blockTypes: [ BlockType.IT ], timeout: undefined });
                api.describe('a', () => {
                    api.hook('y', () => {
                    }, { depth: HookDepth.ALL, when: HookWhen.AFTER_ONCE, blockTypes: [ BlockType.IT ], timeout: undefined });
                    api.describe('b', () => {
                    });
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: undefined }, blockType: BlockType.HOOK, eventType: EventType.SKIP, eventStatusType: EventStatusType.UNUSED },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: undefined }, blockType: BlockType.HOOK, eventType: EventType.SKIP, eventStatusType: EventStatusType.UNUSED },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
            it('should only run shallow', async () => {
                const { api, events } = createApi();

                api.hook('x', () => {
                }, { depth: HookDepth.SHALLOW, when: HookWhen.AFTER_ONCE, blockTypes: [ BlockType.IT], timeout: undefined });
                api.it('1', () => {
                });
                api.describe('a', () => {
                    api.hook('y', () => {
                    }, { depth: HookDepth.SHALLOW, when: HookWhen.AFTER_ONCE, blockTypes: [ BlockType.IT], timeout: undefined });
                    api.it('2', () => {
                    });
                    api.describe('b', () => {
                        api.it('3', () => {
                        });
                    });
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '3' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '3' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '2' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '2' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
            it('should only run deep', async () => {
                const { api, events } = createApi();

                api.hook('x', () => {
                }, { depth: HookDepth.DEEP, when: HookWhen.AFTER_ONCE, blockTypes: [ BlockType.IT ], timeout: undefined });
                api.it('1', () => {
                });
                api.describe('a', () => {
                    api.hook('y', () => {
                    }, { depth: HookDepth.DEEP, when: HookWhen.AFTER_ONCE, blockTypes: [ BlockType.IT ], timeout: undefined });
                    api.it('2', () => {
                    });
                    api.describe('b', () => {
                        api.it('3', () => {
                        });
                    });
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '3' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '3' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '3' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '3' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '3' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '3' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
        });
        describe('beforeEach', () => {
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
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'x', trigger: { description: 'a' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'a' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'b' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'b' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '2' } }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '2' } }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
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
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'x', trigger: { description: 'a' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'a' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'b' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'b' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: 'b' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: 'b' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'z', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'z', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
            it('should ghost', async () => {
                const { api, events } = createApi();

                api.hook('x', () => {
                }, { depth: HookDepth.ALL, when: HookWhen.BEFORE_EACH, blockTypes: [BlockType.IT], timeout: undefined });
                api.describe('a', () => {
                    api.hook('y', () => {
                    }, { depth: HookDepth.ALL, when: HookWhen.BEFORE_EACH, blockTypes: [BlockType.IT], timeout: undefined });
                    api.describe('b', () => {
                    });
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: undefined  }, blockType: BlockType.HOOK, eventType: EventType.SKIP, eventStatusType: EventStatusType.UNUSED },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: undefined  }, blockType: BlockType.HOOK, eventType: EventType.SKIP, eventStatusType: EventStatusType.UNUSED },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
            it('should only run shallow', async () => {
                const { api, events } = createApi();

                api.hook('x', () => {
                }, { depth: HookDepth.SHALLOW, when: HookWhen.BEFORE_EACH, blockTypes: [ BlockType.IT ], timeout: undefined });
                api.describe('a', () => {
                    api.hook('y', () => {
                    }, { depth: HookDepth.SHALLOW, when: HookWhen.BEFORE_EACH, blockTypes: [ BlockType.IT ], timeout: undefined });
                    api.describe('b', () => {
                        api.it('1', () => {
                        });
                    });
                    api.it('2', () => {
                    });
                });
                api.it('3', () => {
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},

                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },

                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },

                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                    { context: { description: 'y', trigger: { description: '2' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '2' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                    { context: { description: 'x', trigger: { description: '3' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '3' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '3' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '3' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
        });
        describe('afterEach', () => {
            it('should run after each', async () => {
                const { api, events } = createApi();

                api.hook('x', () => {
                }, { depth: HookDepth.ALL, when: HookWhen.AFTER_EACH, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
                api.describe('a', () => {
                    api.hook('y', () => {
                    }, { depth: HookDepth.ALL, when: HookWhen.AFTER_EACH, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
                    api.describe('b', () => {
                    });
                    api.it('1', () => {
                    });
                });
                api.it('2', () => {
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: 'b' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: 'b' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'b' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'b' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'a' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'a' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '2' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '2' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
            it('should run in order', async () => {
                const { api, events } = createApi();

                api.hook('x', () => {
                }, { depth: HookDepth.ALL, when: HookWhen.AFTER_EACH, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
                api.describe('a', () => {
                    api.hook('y', () => {
                    }, { depth: HookDepth.ALL, when: HookWhen.AFTER_EACH, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
                    api.describe('b', () => {
                        api.hook('z', () => {
                        }, { depth: HookDepth.ALL, when: HookWhen.AFTER_EACH, blockTypes: [ BlockType.DESCRIBE, BlockType.IT], timeout: undefined });
                        api.it('1', () => {
                        });
                    });
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },

                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'z', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'z', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '1' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: 'b' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: 'b' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'b' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'b' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'a' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: 'a' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
            it('should ghost', async () => {
                const { api, events } = createApi();

                api.hook('x', () => {
                }, { depth: HookDepth.ALL, when: HookWhen.AFTER_EACH, blockTypes: [ BlockType.IT], timeout: undefined });
                api.describe('a', () => {
                    api.hook('y', () => {
                    }, { depth: HookDepth.ALL, when: HookWhen.AFTER_EACH, blockTypes: [ BlockType.IT], timeout: undefined });
                    api.describe('b', () => {
                    });
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: undefined  }, blockType: BlockType.HOOK, eventType: EventType.SKIP, eventStatusType: EventStatusType.UNUSED },
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: undefined  }, blockType: BlockType.HOOK, eventType: EventType.SKIP, eventStatusType: EventStatusType.UNUSED },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
            it('should only run shallow', async () => {
                const { api, events } = createApi();

                api.hook('x', () => {
                }, { depth: HookDepth.SHALLOW, when: HookWhen.AFTER_EACH, blockTypes: [ BlockType.IT ], timeout: undefined });
                api.describe('a', () => {
                    api.hook('y', () => {
                    }, { depth: HookDepth.SHALLOW, when: HookWhen.AFTER_EACH, blockTypes: [ BlockType.IT ], timeout: undefined });
                    api.describe('b', () => {
                        api.it('1', () => {
                        });
                    });
                    api.it('2', () => {
                    });
                });
                api.it('3', () => {
                });

                await api.done();

                expect(events).to.deep.equal(mutatingMerge([
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '1' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                    { context: { description: 'b' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '2' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                    { context: { description: 'y', trigger: { description: '2' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'y', trigger: { description: '2' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                    { context: { description: 'a' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                    { context: { description: '3' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: '3' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '3' }  }, blockType: BlockType.HOOK, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: 'x', trigger: { description: '3' }  }, blockType: BlockType.HOOK, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                    { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
                ], events));

            });
        });
    });

    describe('order', () => {
        it('await should not change order of describe', async () => {
            const { api, events } = createApi();

            api.describe('1', () => {

            });
            await api.describe('2', () => {
            });
            api.describe('3', () => {
            });

            await api.done();

            const filteredEvents = events.filter(event => event.blockType !== BlockType.ROOIBOS && event.eventType === EventType.ENTER);
            expect(filteredEvents).to.deep.equal(mutatingMerge([
                { context: { description: '1' } },
                { context: { description: '2' } },
                { context: { description: '3' } },
            ], filteredEvents));
        });
        it('await should not change order of it', async () => {
            const { api, events } = createApi();

            api.it('1', () => {

            });
            await api.it('2', () => {
            });
            api.it('3', () => {
            });

            await api.done();

            const filteredEvents = events.filter(event => event.blockType !== BlockType.ROOIBOS && event.eventType === EventType.ENTER);
            expect(filteredEvents).to.deep.equal(mutatingMerge([
                { context: { description: '1' } },
                { context: { description: '2' } },
                { context: { description: '3' } },
            ], filteredEvents));
        });
        it('await should not change order of note', async () => {
            const { api, events } = createApi();

            api.note(Guid.createEmpty(), '1', () => 'x');
            await api.note(Guid.createEmpty(), '2', () => 'x');
            api.note(Guid.createEmpty(), '3', () => 'x');

            await api.done();

            const filteredEvents = events.filter(event => event.blockType !== BlockType.ROOIBOS && event.eventType === EventType.ENTER);
            expect(filteredEvents).to.deep.equal(mutatingMerge([
                { context: { description: '1' } },
                { context: { description: '2' } },
                { context: { description: '3' } },
            ], filteredEvents));
        });
        it('await should not change order of describe when nested', async () => {
            const { api, events } = createApi();

            api.describe('0', async () => {
                api.describe('1', () => {
                });
                await api.describe('2', () => {
                });
                api.describe('3', () => {
                });
            });
            api.describe('4', async () => {});

            await api.done();

            const filteredEvents = events.filter(event => event.blockType !== BlockType.ROOIBOS && event.eventType === EventType.ENTER);
            expect(filteredEvents).to.deep.equal(mutatingMerge([
                { context: { description: '0' } },
                { context: { description: '1' } },
                { context: { description: '2' } },
                { context: { description: '3' } },
                { context: { description: '4' } },
            ], filteredEvents));
        });
        it('await should not change order of it when nested', async () => {
            const { api, events } = createApi();

            api.describe('0', async () => {
                api.it('1', () => {
                });
                await api.it('2', () => {
                });
                api.it('3', () => {
                });
            });
            api.describe('4', async () => {});

            await api.done();

            const filteredEvents = events.filter(event => event.blockType !== BlockType.ROOIBOS && event.eventType === EventType.ENTER);
            expect(filteredEvents).to.deep.equal(mutatingMerge([
                { context: { description: '0' } },
                { context: { description: '1' } },
                { context: { description: '2' } },
                { context: { description: '3' } },
                { context: { description: '4' } },
            ], filteredEvents));
        });
        it('await should not change order of note when nested', async () => {
            const { api, events } = createApi();

            api.describe('0', async () => {
                api.note(Guid.createEmpty(), '1', () => 'x');
                await api.note(Guid.createEmpty(),'2', () => 'x');
                api.note(Guid.createEmpty(),'3', () => 'x');
            });
            api.describe('4', async () => {});

            await api.done();

            const filteredEvents = events.filter(event => event.blockType !== BlockType.ROOIBOS && event.eventType === EventType.ENTER);
            expect(filteredEvents).to.deep.equal(mutatingMerge([
                { context: { description: '0' } },
                { context: { description: '1' } },
                { context: { description: '2' } },
                { context: { description: '3' } },
                { context: { description: '4' } },
            ], filteredEvents));
        });
    });
});
