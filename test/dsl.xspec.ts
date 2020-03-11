import { testish, JsonReporter, PipeReporter, VerboseReporter } from "../src";
import {Event, EventType} from "../src/Reporters/Reporter";
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {EnumNodeEntry} from "../src/dsl/EntryType";

chai.use(chaiAsPromised);
const should = chai.should;
const expect = chai.expect;

function createApi(options = {}) {
    const jsonReporter = new JsonReporter();
    const api = testish(Object.assign(
        {
            reporter: new PipeReporter([
                jsonReporter,
                new VerboseReporter()
            ])
        },
        options
    ));

    return { events: jsonReporter.events, api };
}

function simplifyEvents(events : Event[]) {
    return events.map(({name, entry, type, exception}) => {
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
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
            ])
        });

        it('describe (failure)', async () => {
            const { api, events } = createApi();
            const EX = new Error();

            const run = api.describe('a', async () => {
                throw EX;
            });

            await expect(run).to.eventually.be.rejectedWith(EX);

            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.FAILURE, exception: EX },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
            ])
        });

        it('describe (skip)', async () => {
            const { api, events } = createApi();
            const EX = new Error();

            await api.describe.skip('a', async () => {
                throw EX;
            });

            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.SKIPPED },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
            ])
        });

        it('describe (only)', async () => {
            const { api, events } = createApi({ filter: true });
            const EX = new Error();

            api.describe('a', async () => {
                api.it('x', async () => {
                    throw EX;
                })
            });
            await api.describe.only('b', async () => {
                api.it('y', async () => {
                })
            });

            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'x', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'x', entry: EnumNodeEntry.it, type: EventType.SKIPPED },
                { name: 'x', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
                { name: 'b', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'y', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'y', entry: EnumNodeEntry.it, type: EventType.SUCCESS },
                { name: 'y', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'b', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'b', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
            ])
        });
    });
    describe('it', () => {
        it('it (success)', async () => {
            const { api, events } = createApi();

            await api.it('a', async () => {
            });

            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'a', entry: EnumNodeEntry.it, type: EventType.SUCCESS },
                { name: 'a', entry: EnumNodeEntry.it, type: EventType.LEAVE },
            ])
        });

        it('it (failure)', async () => {
            const { api, events } = createApi();
            const EX = new Error();

            await api.it('a', async () => {
                throw EX;
            });

            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'a', entry: EnumNodeEntry.it, type: EventType.FAILURE, exception: EX },
                { name: 'a', entry: EnumNodeEntry.it, type: EventType.LEAVE },
            ])
        });

        it('it (skip)', async () => {
            const { api, events } = createApi();
            const EX = new Error();

            await api.it.skip('a', async () => {
                throw EX;
            });

            expect(simplifyEvents(events)).to.deep.equal([
                { name: 'a', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'a', entry: EnumNodeEntry.it, type: EventType.SKIPPED },
                { name: 'a', entry: EnumNodeEntry.it, type: EventType.LEAVE },
            ])
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
                { name: 'a', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'a', entry: EnumNodeEntry.it, type: EventType.SKIPPED },
                { name: 'a', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'b', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'b', entry: EnumNodeEntry.it, type: EventType.SUCCESS },
                { name: 'b', entry: EnumNodeEntry.it, type: EventType.LEAVE },
            ])
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
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'b', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'b', entry: EnumNodeEntry.it, type: EventType.SUCCESS },
                { name: 'b', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'c', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'c', entry: EnumNodeEntry.it, type: EventType.SUCCESS },
                { name: 'c', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
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
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'b', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'b', entry: EnumNodeEntry.it, type: EventType.SKIPPED },
                { name: 'b', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'c', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'c', entry: EnumNodeEntry.it, type: EventType.SUCCESS },
                { name: 'c', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
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
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'b', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'b', entry: EnumNodeEntry.it, type: EventType.SKIPPED },
                { name: 'b', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'c', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'c', entry: EnumNodeEntry.it, type: EventType.SUCCESS },
                { name: 'c', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
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
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'b', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'x', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'x', entry: EnumNodeEntry.it, type: EventType.SUCCESS },
                { name: 'x', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'b', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'b', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
                { name: 'c', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'y', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'y', entry: EnumNodeEntry.it, type: EventType.SUCCESS },
                { name: 'y', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'c', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'c', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
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
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'b', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'x', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'x', entry: EnumNodeEntry.it, type: EventType.SKIPPED },
                { name: 'x', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'b', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'b', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
                { name: 'c', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'y', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'y', entry: EnumNodeEntry.it, type: EventType.SUCCESS },
                { name: 'y', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'c', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'c', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
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
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'b', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'x', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'x', entry: EnumNodeEntry.it, type: EventType.SKIPPED },
                { name: 'x', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'b', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'b', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
                { name: 'c', entry: EnumNodeEntry.describe, type: EventType.ENTER },
                { name: 'y', entry: EnumNodeEntry.it, type: EventType.ENTER },
                { name: 'y', entry: EnumNodeEntry.it, type: EventType.SUCCESS },
                { name: 'y', entry: EnumNodeEntry.it, type: EventType.LEAVE },
                { name: 'c', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'c', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.SUCCESS },
                { name: 'a', entry: EnumNodeEntry.describe, type: EventType.LEAVE },
            ]);
        });
    });
});