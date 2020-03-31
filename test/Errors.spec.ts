import * as chai from 'chai';
const should = chai.should;
const expect = chai.expect;


describe.only('error types', () => {
    it('should looks a lot like a standard error', () => {

        class ErrorTimeout extends Error {
            constructor(message = 'Timeout') {
                super(message);
            }
        }
        Object.defineProperty(ErrorTimeout.prototype, 'name', {
            enumerable: false, // this is the default
            configurable: true,
            value: ErrorTimeout.name,
            writable: true
        });

        const error = new Error('my-message');
        const timeout = new ErrorTimeout();

        const props = ['name', 'stack', 'message'];

        expect(timeout.name).to.equal(ErrorTimeout.name);
        expect(Object.keys(error)).to.deep.equal(Object.keys(timeout));
        expect(timeout.message).to.equal('Timeout');
        expect(props.map(key => typeof timeout[key])).to.deep.equal(props.map(key => typeof error[key]));
    });
});