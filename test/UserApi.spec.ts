import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {createApi, mutatingMerge} from "./_util";
import {testish} from "../src";
import {Guid} from "guid-typescript";
import {BlockType, EventStatusType, EventType, HookDepth, HookWhen} from "../src/types";

chai.use(chaiAsPromised);
const should = chai.should;
const expect = chai.expect;

describe('user api', () => {
    describe('hooks', () => {
        it('basic api', async () => {
            const { api: iapi, events } = createApi();
            const api = testish(iapi);

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
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'before', hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.ALL, blockTypes: [BlockType.IT, BlockType.DESCRIBE] }  },
                { description: 'testBefore', hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.ALL, blockTypes: [BlockType.IT, BlockType.DESCRIBE] }  },
                { description: 'beforeEach', hookOptions: { when: HookWhen.BEFORE_EACH, depth: HookDepth.ALL, blockTypes: [BlockType.IT, BlockType.DESCRIBE] }  },
                { description: 'testBeforeEach', hookOptions: { when: HookWhen.BEFORE_EACH, depth: HookDepth.ALL, blockTypes: [BlockType.IT, BlockType.DESCRIBE] }  },
                { description: 'afterEach', hookOptions: { when: HookWhen.AFTER_EACH, depth: HookDepth.ALL, blockTypes: [BlockType.IT, BlockType.DESCRIBE] }  },
                { description: 'testAfterEach', hookOptions: { when: HookWhen.AFTER_EACH, depth: HookDepth.ALL, blockTypes: [BlockType.IT, BlockType.DESCRIBE] }  },
                { description: 'after', hookOptions: { when: HookWhen.AFTER_ONCE, depth: HookDepth.ALL, blockTypes: [BlockType.IT, BlockType.DESCRIBE] }  },
                { description: 'testAfter', hookOptions: { when: HookWhen.AFTER_ONCE, depth: HookDepth.ALL, blockTypes: [BlockType.IT, BlockType.DESCRIBE] }  },

                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));

        });
        it('fluent api', async () => {
            const { api: iapi, events } = createApi();
            const api = testish(iapi);

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
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: undefined, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.ALL, blockTypes: [BlockType.IT, BlockType.DESCRIBE] }  },
                { description: undefined, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.ALL, blockTypes: [BlockType.IT] }  },
                { description: undefined, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.ALL, blockTypes: [BlockType.DESCRIBE] }  },
                { description: undefined, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.DEEP, blockTypes: [BlockType.IT, BlockType.DESCRIBE] }  },
                { description: undefined, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.SHALLOW, blockTypes: [BlockType.IT, BlockType.DESCRIBE] }  },
                { description: undefined, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.DEEP, blockTypes: [BlockType.IT] }  },
                { description: undefined, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.DEEP, blockTypes: [BlockType.DESCRIBE] }  },
                { description: undefined, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.SHALLOW, blockTypes: [BlockType.IT] }  },
                { description: undefined, hookOptions: { when: HookWhen.BEFORE_ONCE, depth: HookDepth.SHALLOW, blockTypes: [BlockType.DESCRIBE] }  },
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));

        });
    });
    describe('blocks', () => {
        it('basic api', async () => {
            const { api: iapi, events } = createApi();
            const api = testish(iapi);

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
                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS},
                { description: 'describe', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'describe', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'testDescribe', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'testDescribe', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'it', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'it', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },
                { description: 'testIt', blockType: BlockType.IT, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'testIt', blockType: BlockType.IT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                { description: 'note', blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'note', blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: Guid.createEmpty(), value: 'value' },
                { description: 'note', blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                { description: 'note', blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'note', blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: Guid.createEmpty(), value: 'value' },
                { description: 'note', blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                { description: undefined, blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: undefined, blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: Guid.createEmpty(), value: 'value' },
                { description: undefined, blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                { description: 'testNote', blockType: BlockType.NOTE, eventType: EventType.ENTER, eventStatusType: EventStatusType.SUCCESS },
                { description: 'testNote', blockType: BlockType.NOTE, eventType: EventType.NOTE, eventStatusType: EventStatusType.SUCCESS, id: Guid.createEmpty(), value: 'value' },
                { description: 'testNote', blockType: BlockType.NOTE, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS },

                { description: undefined, blockType: BlockType.SCRIPT, eventType: EventType.LEAVE, eventStatusType: EventStatusType.SUCCESS},
            ], events));
        });
    });
});