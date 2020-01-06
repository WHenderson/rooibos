import { before, beforeEach, describe, test, afterEach, after } from '../../src/ts/fluid';
import { strict as assert } from 'assert';

before('my-before', async () => {
});

beforeEach('my-beforeEach', async () => {
});

afterEach('my-afterEach', async () => {
});

after('my-after', async () => {
});

describe('outer', async () => {
    let x = 0;

    before('my-inner-before', async () => {
    });

    beforeEach('my-inner-beforeEach', async () => {
    });

    afterEach('my-inner-afterEach', async () => {
    });

    after('my-inner-after', async () => {
    });


    assert.equal(x, 0);

    test('a', async () => {
        x = 1;
    });

    assert.equal(x, 0);

    await test('b', async () => {
        x = 2;
    });

    assert.equal(x, 2);

    test('c', async () => {
        x = 3;
    });

    //assert.equal(x, 2);
});