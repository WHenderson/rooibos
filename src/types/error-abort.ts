export class ErrorAbort extends Error {
    constructor(message = 'Abort') {
        super(message);
    }
}
Object.defineProperty(ErrorAbort.prototype, 'name', {
    enumerable: false, // this is the default
    configurable: true,
    value: ErrorAbort.name,
    writable: true
});
