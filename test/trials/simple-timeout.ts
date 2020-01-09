import { before, beforeEach, describe, test, afterEach, after, testish } from '../../src/ts/fluid';
import { strict as assert } from 'assert';

before('my-before', async () => {
});

beforeEach('my-beforeEach', async () => {
});

afterEach('my-afterEach', async () => {
});

after('my-after', async () => {
});

testish({ timeoutDescribe: 500 }).describe('outer', async () => {
    let x = 0;

    before('my-inner-before', async () => {
    });

    beforeEach('my-inner-beforeEach', async () => {
    });

    afterEach('my-inner-afterEach', async () => {
    });

    after('my-inner-after', async () => {
    });

    test('a', async () => {
        console.log('1');
    });

    test('b', async (context) => {

        await new Promise((resolve, reject) => {
            const id = setTimeout(resolve, 500);
            context.cancel = () => {
                clearTimeout(id);
                //reject(new Error('hmm'));
            }
        });

        console.log('2');
    });

    test('c', async (context) => {

        await new Promise((resolve, reject) => {
            const id = setTimeout(resolve, 500);
            context.cancel = () => {
                clearTimeout(id);
            }
        });

        console.log('3');
    });

    describe('nest', () => {
        test('x', () => {

        });
        test('y', () => {

        });
    })

});