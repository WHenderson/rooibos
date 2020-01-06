export interface Cancel {
    (this: Context, context: Context) : Promise<void> | void;
}

export interface Context {
    name: string;
    parents: Context[];

    cancel?: Cancel;
}
