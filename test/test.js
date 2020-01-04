const { describe, test, before, after, beforeEach, afterEach, testish } = require('../src');

testish({ timeout: 100 }).before(async () => {
    await new Promise(resolve => {
        setTimeout(resolve, 100)
    })
});
after(() => console.log('after root'));


describe('a', async () => {
    describe('ax', async () => {
        before(function myBefore() {
            console.log('before!');
        });
        beforeEach(() => console.log('beforeEach'));
        afterEach(() => console.log('afterEach'));
        after(() => console.log('after'));

        test.skip('ax1', async () => {

        });
        test.only('ax2', async () => {
            await new Promise(resolve => {
                setTimeout(resolve, 100)
            })
        });
        test.only('ax3', async () => {

        });
    });
    describe('ay', async () => {
        test('ay1', async () => {

        });
        console.log('hmm');
        await new Promise(resolve => {
            setTimeout(resolve, 100)
        });
        test('ay2', async () => {
            throw new Error('my fail');
        });
        test('ay3', async () => {

        });
    });
    testish({ timeout: 100 }).describe('az', async () => {
        test('az1', async () => {
            await new Promise(resolve => {
                setTimeout(resolve, 200);
            })
        });
        test('az2', async () => {

        });
        test('az3', async () => {

        });
    });
});