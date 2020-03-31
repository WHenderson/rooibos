# testish
Async testing framework

TODO:
- [x] Core API
- [x] User API
- [x] Reorganise types into separate files
- [x] Standardise type name order - i.e. WhatItIs_WhatItsFor (validate it will do a better job)
- [x] Move description outside of State?
- [x] Create timeout and abort extensions to Error
- [x] Use new Error types
- [ ] Rename variables to match new type names
- [ ] Extend context to include user options
- [ ] Create steps for SCRIPT block
- [ ] Remove description from Event
- [ ] Filter keys in UserOptions/Context to only valid options (hide internal workings)
- [ ] Replace note implementation with standard stepCallback? (need to determine timeouts)
- [ ] Add context to errors
- [ ] Add tests for abort api
- [ ] Determine good name for groups [it, describe, note, script], [hook]?
- [ ] Add tag API
- [ ] Add timeouts for notes
- [ ] Freeze context (aside from .data)
- [ ] Finish test cases for remaining user API
- [ ] Test and correct nesting things in hooks
- [ ] Create bin scripts
- [ ] Release advance-promise library
- [ ] Release this library
- [ ] Add documentation
