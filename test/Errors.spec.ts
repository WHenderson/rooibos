import * as chai from 'chai';
import {ErrorAbort, ErrorTimeout} from "../src/types";
const should = chai.should;
const expect = chai.expect;


describe('error types', () => {
    describe('ErrorTimeout', () => {
        it('should match Error interface', () => {
            const error = new Error('my-message');
            const timeout = new ErrorTimeout();

            const props = ['name', 'stack', 'message'];

            expect(timeout.name).to.equal(ErrorTimeout.name);
            expect(Object.keys(error)).to.deep.equal(Object.keys(timeout));
            expect(timeout.message).to.equal('Timeout');
            expect(props.map(key => typeof timeout[key])).to.deep.equal(props.map(key => typeof error[key]));
        });
    });
    describe('ErrorAbort', () => {
        it('should match Error interface', () => {
            const error = new Error('my-message');
            const abort = new ErrorAbort();

            const props = ['name', 'stack', 'message'];

            expect(abort.name).to.equal(ErrorAbort.name);
            expect(Object.keys(error)).to.deep.equal(Object.keys(abort));
            expect(abort.message).to.equal('Abort');
            expect(props.map(key => typeof abort[key])).to.deep.equal(props.map(key => typeof error[key]));
        });
    });
});