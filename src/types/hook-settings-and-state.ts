import {HookSettings} from "./hook-settings";
import {State} from "./state";

export interface HookSettingsAndState {
    settings: HookSettings;
    creationState: State;
}
