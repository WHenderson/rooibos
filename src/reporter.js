const EVENTS = require('./events');

class Reporter {
    constructor() {
    }

    async on({ entry, context, event, ex }) {
        const namespace = context.parents.map(c => c.name).concat(context.name).join('/');

        const symbol = (() => {
            switch (event) {
                case EVENTS.EVENT_ENTER:
                    return '>';
                case EVENTS.EVENT_FAILURE:
                    return 'x';
                case EVENTS.EVENT_SUCCESS:
                    return '✓';
                case EVENTS.EVENT_LEAVE:
                    return '<';
                case EVENTS.EVENT_SKIP:
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