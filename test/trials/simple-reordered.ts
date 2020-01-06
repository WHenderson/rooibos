import { before, beforeEach, describe, test, afterEach, after } from '../../src/ts/fluid';

before('my-before', async () => {
    console.log('execute before');
});

beforeEach('my-beforeEach', async () => {
    console.log('execute beforeEach');
});

afterEach('my-afterEach', async () => {
    console.log('execute afterEach');
});

after('my-after', async () => {
    console.log('execute after');
});

describe('my-root', async () => {
    console.log('execute my-root begin');

    describe('my-first-child', async () => {
       test('my-test', async () => {
           console.log('execute test');
       })
    });

    describe('my-second-child', async () => {
        test('my-test', async () => {
            console.log('execute test');
        })
    });

    console.log('execute my-root end');
});


