import * as chai from 'chai';
import {Context, ErrorAbort, ErrorNotJson, ErrorTimeout} from "../src/types";
const should = chai.should;
const expect = chai.expect;


describe('error types', () => {
    describe('ErrorTimeout', () => {
        it('should match Error interface', () => {
            const error = new Error('my-message');
            const context = {} as Context;
            const timeout = new ErrorTimeout(context);

            const props = ['name', 'stack', 'message'];

            expect(timeout.name).to.equal(ErrorTimeout.name);
            expect(timeout.message).to.equal('Timeout');
            expect(timeout.context).to.equal(context);
            expect(props.map(key => typeof (timeout as any)[key])).to.deep.equal(props.map(key => typeof (error as any)[key]));
        });
    });
    describe('ErrorAbort', () => {
        it('should match Error interface', () => {
            const error = new Error('my-message');
            const context = {} as Context;
            const abort = new ErrorAbort(context);

            const props = ['name', 'stack', 'message'];

            expect(abort.name).to.equal(ErrorAbort.name);
            expect(abort.message).to.equal('Abort');
            expect(abort.context).to.equal(context);
            expect(props.map(key => typeof (abort as any)[key])).to.deep.equal(props.map(key => typeof (error as any)[key]));
        });
    });
    describe('ErrorNotJson', () => {
        it('should match Error interface', () => {
            const error = new Error('my-message');
            const context = {} as Context;
            const value = { x: '' };
            const abort = new ErrorNotJson(context, value);

            const props = ['name', 'stack', 'message'];

            expect(abort.name).to.equal(ErrorNotJson.name);
            expect(abort.message).to.equal('Not Json');
            expect(abort.context).to.equal(context);
            expect(abort.value).to.equal(value);
            expect(props.map(key => typeof (abort as any)[key])).to.deep.equal(props.map(key => typeof (error as any)[key]));
        });
    });
});