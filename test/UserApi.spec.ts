import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {createApi, mutatingMerge} from "./_util";
import {rooibos} from "../src";
import {Guid} from "guid-typescript";
import {BlockType, EventStatusType, EventType, HookDepth, HookWhen} from "../src/types";

chai.use(chaiAsPromised);
const should = chai.should;
const expect = chai.expect;

describe('user api', () => {
    describe('hooks', () => {
        it('basic api', async () => {
            const { api: iapi, events } = createApi();
            const api = rooibos(iapi);

            api.before('before', () => {});
            api.before(function testBefore() {});
            api.beforeEach('beforeEach', () => {});
            api.beforeEach(function testBeforeEach() {});
            api.afterEach('afterEach', () => {});
            api.afterEach(function testAfterEach() {});
            api.after('after', () => {});
            api.after(function testAfter() {});


            await iapi.done();

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'before' }, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.ALL, blockTypes: [BlockType.SCRIPT, BlockType.DESCRIBE, BlockType.IT] }  },
                { context: { description: 'testBefore' }, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.ALL, blockTypes: [BlockType.SCRIPT, BlockType.DESCRIBE, BlockType.IT] }  },
                { context: { description: 'beforeEach' }, hookOptions: { when: HookWhen.BEFORE_EACH, depth: HookDepth.ALL, blockTypes: [BlockType.SCRIPT, BlockType.DESCRIBE, BlockType.IT] }  },
                { context: { description: 'testBeforeEach' }, hookOptions: { when: HookWhen.BEFORE_EACH, depth: HookDepth.ALL, blockTypes: [BlockType.SCRIPT, BlockType.DESCRIBE, BlockType.IT] }  },
                { context: { description: 'afterEach' }, hookOptions: { when: HookWhen.AFTER_EACH, depth: HookDepth.ALL, blockTypes: [BlockType.SCRIPT, BlockType.DESCRIBE, BlockType.IT] }  },
                { context: { description: 'testAfterEach' }, hookOptions: { when: HookWhen.AFTER_EACH, depth: HookDepth.ALL, blockTypes: [BlockType.SCRIPT, BlockType.DESCRIBE, BlockType.IT] }  },
                { context: { description: 'after' }, hookOptions: { when: HookWhen.AFTER_ONCE, depth: HookDepth.ALL, blockTypes: [BlockType.SCRIPT, BlockType.DESCRIBE, BlockType.IT] }  },
                { context: { description: 'testAfter' }, hookOptions: { when: HookWhen.AFTER_ONCE, depth: HookDepth.ALL, blockTypes: [BlockType.SCRIPT, BlockType.DESCRIBE, BlockType.IT] }  },

                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));

        });
        it('fluent api', async () => {
            const { api: iapi, events } = createApi();
            const api = rooibos(iapi);

            api.before(() => {});
            api.before.it(() => {});
            api.before.describe(() => {});
            api.before.deep(() => {});
            api.before.shallow(() => {});
            api.before.deep.it(() => {});
            api.before.deep.describe(() => {});
            api.before.shallow.it(() => {});
            api.before.shallow.describe(() => {});

            await iapi.done();

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: undefined }, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.ALL, blockTypes: [BlockType.SCRIPT, BlockType.DESCRIBE, BlockType.IT] }  },
                { context: { description: undefined }, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.ALL, blockTypes: [BlockType.IT] }  },
                { context: { description: undefined }, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.ALL, blockTypes: [BlockType.DESCRIBE] }  },
                { context: { description: undefined }, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.DEEP, blockTypes: [BlockType.SCRIPT, BlockType.DESCRIBE, BlockType.IT] }  },
                { context: { description: undefined }, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.SHALLOW, blockTypes: [BlockType.SCRIPT, BlockType.DESCRIBE, BlockType.IT] }  },
                { context: { description: undefined }, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.DEEP, blockTypes: [BlockType.IT] }  },
                { context: { description: undefined }, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.DEEP, blockTypes: [BlockType.DESCRIBE] }  },
                { context: { description: undefined }, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.SHALLOW, blockTypes: [BlockType.IT] }  },
                { context: { description: undefined }, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.SHALLOW, blockTypes: [BlockType.DESCRIBE] }  },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));

        });
    });
    describe('blocks', () => {
        it('basic api', async () => {
            const { api: iapi, events } = createApi();
            const api = rooibos(iapi);

            api.describe('describe', () => {});
            api.describe(function testDescribe() {});

            api.it('it', () => {});
            api.it(function testIt() {});


            api.note(Guid.createEmpty(), 'note', 'value' );
            api.note(Guid.createEmpty(), 'note', () => 'value' );
            api.note(Guid.createEmpty(), 'value' );
            api.note(Guid.createEmpty(), function testNote() { return 'value'; });

            await iapi.done();

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { description: 'describe' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'describe' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'testDescribe' }, blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'testDescribe' }, blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'it' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'it' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'testIt' }, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'testIt' }, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                { context: { description: 'note' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'note' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: Guid.createEmpty(), value: 'value' },
                { context: { description: 'note' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                { context: { description: 'note' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'note' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: Guid.createEmpty(), value: 'value' },
                { context: { description: 'note' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                { context: { description: undefined }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: undefined }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: Guid.createEmpty(), value: 'value' },
                { context: { description: undefined }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                { context: { description: 'testNote' }, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: 'testNote' }, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: Guid.createEmpty(), value: 'value' },
                { context: { description: 'testNote' }, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));
        });
    });
    describe('options', () => {
        it('tag', async () => {
            const { api: iapi, events } = createApi();
            const api = rooibos(iapi);

            api.tag('a').tag('b', 'c').tag(['d','e']).tag('f',['g']).it(() => {
            });

            await iapi.done();

            expect(events).to.deep.equal(mutatingMerge([
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { context: { tags: ['a','b','c','d','e','f','g']}, blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { context: { tags: ['a','b','c','d','e','f','g']}, blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { context: { description: undefined }, blockType: BlockType.ROOIBOS, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));
        })
    });
});