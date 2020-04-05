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
- [x] Remove description from Event
- [x] Test note timeouts
- [x] Test it timeouts
- [x] Test hook timeouts
- [x] Validate ErrorTimeout context
- [x] Add tests for abort api
- [x] Move before/after blocks to the appropriate location? (yes they are)
- [x] Fix constructor and add 'start' method
- [ ] Validate ErrorAbort context
- [ ] Validate ErrorNotJson context
- [ ] Add tests for using await vs no await
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

# .only semantics

note: the startup of this may be flawed

it.only
it.tag
tag().it
only(tags-or-predicate) // cumulative intersection of all .only calls // only works on .it blocks

.only would be retoactive/global. so anything not yet resolved will act as if the .only was done before it ran
thus

```
it 1
describe
    it 2
    it.only 3
    it 4
it 5
```

would only run 1 and 3... maybe too flawed?
or maybe just use .tag and make .only for adding predicates (defaults to tagged?)

```
only.tag()
it 1
describe
    it 2
    it.tag 3
    it 4
it 5
```

