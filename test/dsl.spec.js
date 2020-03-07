"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../src");
const Reporter_1 = require("../src/Reporters/Reporter");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const EntryType_1 = require("../src/dsl/EntryType");
chai.use(chaiAsPromised);
const should = chai.should;
const expect = chai.expect;
function createApi(options = {}) {
    const jsonReporter = new src_1.JsonReporter();
    const api = src_1.testish(Object.assign({
        reporter: new src_1.PipeReporter([
            jsonReporter,
            new src_1.VerboseReporter()
        ])
    }, options));
    return { events: jsonReporter.events, api };
}
function simplifyEvents(events) {
    return events.map(({ name, entry, type, exception }) => {
        if (exception)
            return { name, entry, type, exception };
        else
            return { name, entry, type };
    });
}
describe('dsl', () => {
    describe('describe', () => {
        it('describe (success)', async () => {
            const { api, events } = createApi();
            await api.describe('a', async () => {
            });
            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
            ]);
        });
        it('describe (failure)', async () => {
            const { api, events } = createApi();
            const EX = new Error();
            const run = api.describe('a', async () => {
                throw EX;
            });
            await expect(run).to.eventually.be.rejectedWith(EX);
            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.FAILURE, exception: EX },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
            ]);
        });
        it('describe (skip)', async () => {
            const { api, events } = createApi();
            const EX = new Error();
            await api.describe.skip('a', async () => {
                throw EX;
            });
            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SKIPPED },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
            ]);
        });
        it('describe (only)', async () => {
            const { api, events } = createApi({ filter: true });
            const EX = new Error();
            api.describe('a', async () => {
                api.it('x', async () => {
                    throw EX;
                });
            });
            await api.describe.only('b', async () => {
                api.it('y', async () => {
                });
            });
            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'x', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'x', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SKIPPED },
                { name: 'x', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'y', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'y', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SUCCESS },
                { name: 'y', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
            ]);
        });
    });
    describe('it', () => {
        it('it (success)', async () => {
            const { api, events } = createApi();
            await api.it('a', async () => {
            });
            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SUCCESS },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
            ]);
        });
        it('it (failure)', async () => {
            const { api, events } = createApi();
            const EX = new Error();
            await api.it('a', async () => {
                throw EX;
            });
            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.FAILURE, exception: EX },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
            ]);
        });
        it('it (skip)', async () => {
            const { api, events } = createApi();
            const EX = new Error();
            await api.it.skip('a', async () => {
                throw EX;
            });
            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SKIPPED },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
            ]);
        });
        it('it (only)', async () => {
            const { api, events } = createApi({ filter: true });
            const EX = new Error();
            api.it('a', async () => {
                throw EX;
            });
            await api.it.only('b', async () => {
            });
            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SKIPPED },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SUCCESS },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
            ]);
        });
    });
    describe('nesting', () => {
        it('plain', async () => {
            const { api, events } = createApi();
            await api.describe('a', async () => {
                api.it('b', async () => {
                });
                api.it('c', async () => {
                });
            });
            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SUCCESS },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SUCCESS },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
            ]);
        });
        it('.only', async () => {
            const { api, events } = createApi({ filter: true });
            await api.describe('a', async () => {
                api.it('b', async () => {
                });
                api.it.only('c', async () => {
                });
            });
            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SKIPPED },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SUCCESS },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
            ]);
        });
        it('.skip', async () => {
            const { api, events } = createApi();
            await api.describe('a', async () => {
                api.it.skip('b', async () => {
                });
                api.it('c', async () => {
                });
            });
            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SKIPPED },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SUCCESS },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
            ]);
        });
    });
    describe('deep nesting', () => {
        it('plain', async () => {
            const { api, events } = createApi();
            await api.describe('a', async () => {
                api.describe('b', async () => {
                    api.it('x', async () => {
                    });
                });
                api.describe('c', async () => {
                    api.it('y', async () => {
                    });
                });
            });
            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'x', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'x', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SUCCESS },
                { name: 'x', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'y', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'y', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SUCCESS },
                { name: 'y', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
            ]);
        });
        it('.only', async () => {
            const { api, events } = createApi({ filter: true });
            await api.describe('a', async () => {
                api.describe('b', async () => {
                    api.it('x', async () => {
                    });
                });
                api.describe('c', async () => {
                    api.it.only('y', async () => {
                    });
                });
            });
            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'x', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'x', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SKIPPED },
                { name: 'x', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'y', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'y', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SUCCESS },
                { name: 'y', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
            ]);
        });
        it('.skip', async () => {
            const { api, events } = createApi();
            await api.describe('a', async () => {
                api.describe('b', async () => {
                    api.it.skip('x', async () => {
                    });
                });
                api.describe('c', async () => {
                    api.it('y', async () => {
                    });
                });
            });
            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'x', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'x', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SKIPPED },
                { name: 'x', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'b', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.ENTER },
                { name: 'y', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.ENTER },
                { name: 'y', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.SUCCESS },
                { name: 'y', entry: EntryType_1.EnumNodeEntry.it, type: Reporter_1.EventType.LEAVE },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'c', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.SUCCESS },
                { name: 'a', entry: EntryType_1.EnumNodeEntry.describe, type: Reporter_1.EventType.LEAVE },
            ]);
        });
    });
});
//# sourceMappingURL=dsl.spec.js.map