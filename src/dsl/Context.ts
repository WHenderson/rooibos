import { AbortApi } from 'advanced-promises';

// Context given to each entry
export interface Context {
    name: string;
    parents: Context[];

    aapi: AbortApi;
}