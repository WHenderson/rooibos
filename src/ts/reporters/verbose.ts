import { Reporter } from '../reporter';
import {Event, EventType, EntryType } from "../events";

const mapType2Symbol = {};
mapType2Symbol[EventType.ENTER ] = '>';
mapType2Symbol[EventType.SKIP ] = '🚫';
mapType2Symbol[EventType.SUCCESS ] = '✓';
mapType2Symbol[EventType.FAILURE ] = '✗';
mapType2Symbol[EventType.TIMEOUT ] = '⏰';
mapType2Symbol[EventType.ABORT ] = '🛑';
mapType2Symbol[EventType.LEAVE ] = '<';

const maxEntryLength = Math.max(...Object.keys(EntryType).map(entry => entry.length));

export class VerboseReporter {
    async on(event : Event) {
        const indent = ' '.repeat(Math.max(0, event.context.parents.length - 1));
        const entry = event.entry + ' '.repeat(event.entry.length - maxEntryLength);
        const symbol = mapType2Symbol[event.event] || '?';
        console.log(`${indent}${event.entry} ${symbol} ${event.context.name}`);
    }
}