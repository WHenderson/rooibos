import { Testish } from "../src/Testish";
import { VerboseReporter, PipeReporter, JsonReporter } from "../src/Reporters";
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

describe('Testish', () => {
    it('single describe', async () => {
        const { api, events } = createApi();

        await api.describe('a', () => {
        });

        expect(simplifyEvents(events)).to.deep.equal([
            { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.ENTER },
            { name: 'a', blockType: BlockType.DESCRIBE, eventType: EventType.LEAVE_SUCCESS },
        ]);
    });
    it('queue describe', async () => {
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
    it('nest describe', async () => {
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
    it('describe exception', async () => {
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
    it.only('describe should skip after exception', async () => {
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
});