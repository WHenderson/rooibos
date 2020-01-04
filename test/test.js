const { describe, test, before, after, beforeEach, afterEach } = require('../src/testish');


before(() => console.log('before root'));
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

        });
        test('ay3', async () => {

        });
    });
    describe('az', async () => {
        test('az1', async () => {

        });
        test('az2', async () => {

        });
        test('az3', async () => {

        });
    });
});