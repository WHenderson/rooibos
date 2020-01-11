import {Reporter} from '../reporter';
import {EntryType, Event, EventType} from "../events";

const mapType2Symbol = {};
mapType2Symbol[EventType.ENTER] = '>';
mapType2Symbol[EventType.SKIP] = '🚫';
mapType2Symbol[EventType.PENDING] = '…';
mapType2Symbol[EventType.SUCCESS] = '✓';
mapType2Symbol[EventType.FAILURE] = '✗';
mapType2Symbol[EventType.TIMEOUT] = '⏰';
mapType2Symbol[EventType.ABORT] = '🛑';
mapType2Symbol[EventType.LEAVE] = '<';

const maxEntryLength = Math.max(...Object.keys(EntryType).map(entry => entry.length));

export class VerboseReporter implements Reporter {
    async on(event : Event) {
        //if (event.event == EventType.ENTER || event.event === EventType.LEAVE)
        //    return;

        const indent = ' '.repeat(
            event.context.parents.length -
            (
                event.entry === EntryType.afterEach ||
                event.entry === EntryType.beforeEach ||
                (event.entry === EntryType.describe && event.event !== EventType.PENDING) ||
                (event.entry === EntryType.test)
                ? 1 : 0
            )
        );
        const entry = event.entry + ' '.repeat(maxEntryLength - event.entry.length);
        const symbol = mapType2Symbol[event.event] || '?';
        const exception = event.exception ? ` !${event.exception.message}` : '';

        console.log(`:${indent}${entry} ${symbol} ${event.name}${exception} (${event.context.name})`);
        if (event.exception)
            console.error(event.exception);
    }
}