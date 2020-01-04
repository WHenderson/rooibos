const EVENTS = require('./events');

class Reporter {
    constructor() {
    }

    async on({ entry, context, event, ex }) {
        const namespace = context.parents.map(c => c.name).concat(context.name).join('/');

        const symbol = (() => {
            switch (event) {
                case EVENTS.ENTER:
                    return '>';
                case EVENTS.SUCCESS:
                    return '✓';
                case EVENTS.FAILURE:
                    return '✗';
                case EVENTS.TIMEOUT:
                    return '⏰';
                case EVENTS.LEAVE:
                    return '<';
                case EVENTS.SKIP:
                    return '🚫';
                default:
                    return event;
            }
        })();

        const indent = ' '.repeat(context.parent && context.parent.parents.length || 0);

        const text = (() => {
            switch (entry) {
                case 'describe':
                case 'test':
                    return `${indent}${symbol} ${namespace}`;
                default:
                    return `${indent}${entry} ${symbol} ${namespace}`;
            }
        })();

        console.log(':', text);
    }
}

module.exports = Reporter;