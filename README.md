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
- [x] Extend context to include user options
- [x] Replace note implementation with standard stepCallback
- [x] Move note reporting to avoid incorrect timeouts
- [x] Trial notes with data that has a .then value
- [x] Throw exception for invalid data? (i.e., not JSON)
- [x] Add context to custom errors
- [x] Add timeouts for notes
- [ ] Remove description from Event
- [ ] Test note timeouts
- [ ] Validate error context
- [ ] Filter keys in UserOptions/Context to only valid options (hide internal workings)
- [ ] Rename variables to match new type names
- [ ] Reorder methods
- [ ] Add tests for abort api
- [ ] Freeze context (aside from .data)
- [ ] Add tag API
- [ ] Finish test cases for remaining user API
- [ ] Test and correct nesting things in hooks
- [ ] Create bin scripts
- [ ] Release advance-promise library
- [ ] Release this library
- [ ] Add documentation
