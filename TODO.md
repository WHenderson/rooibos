# rooibos
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
- [x] Remove description from Event
- [x] Test note timeouts
- [x] Test it timeouts
- [x] Test hook timeouts
- [x] Validate ErrorTimeout context
- [x] Add tests for abort api
- [x] Move before/after blocks to the appropriate location? (yes they are)
- [x] Fix constructor and add 'start' method
- [x] Add tests for using await vs no await
- [ ] Validate ErrorAbort context
- [ ] Validate ErrorNotJson context
- [ ] Filter keys in UserOptions/Context to only valid options (hide internal workings)
- [ ] Rename variables to match new type names
- [ ] Reorder methods
- [ ] Freeze context (aside from .data)
- [ ] Finish test cases for remaining user API
- [ ] Test and correct nesting things in hooks/notes (i.e. make sure they chain off of the correct state... what /is/ the correct state?)
- [ ] Create bin scripts
- [ ] Move exception out of Event and into Context? - may be useful for children? will cause circular dependency since exceptions contain context
- [ ] Add .only semantics - should filter _just_ `it` blocks. Check what mocha does for mixing describe and it blocks
- [ ] Add tag API
- [ ] Add documentation
- [ ] Release advance-promise library
- [ ] Release this library
- [ ] Determine how to handle standard output/error output capture

# .only semantics
* Commandline or Configuration filter (command line overrides configuration)
* Filter only filters it blocks

# CLI
* Specify reporter as 
  1) A named standard reporter
  2) A script which exports a Reporter as a Default which inherits from the reporter base?
* Specify root scripts which are run in the global context rather than their own individual script block
* Specify scripts which are each run within their own script block
* Script name is given relative to the configuration file dirname, or the cwd

