# nockback-harder

Wrapper that makes testing using Nock mock record/replay functionality easier. 
By default does not create mocks for local calls (localhost/127.0.0.1) when recording, allows and passes through local calls when replaying.

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
  [![Linux Build][travis-image]][travis-url]

## Install

```sh
$ npm install --save-dev nockback-harder
```


## Example usage

### Basic usage

```
import { NockbackHelper } from 'nockback-harder'
import nock from 'nock'

  const helper = new NockbackHelper(nock, __dirname + '/nock-fixtures')

  // This will result in calls being recorded when there are no recorded mocks yet, and mocks being replayed if there are any. 
  // It is a good mode for development (although you might use `startRecordingOverwrite` when calls you are making are changing a lot),
  // but you might want to commit code with `startLockdown` mode to ensure no unmocked calls are ever recorded.
  helper.startRecordingNew()

  await helper.nockBack('google.com-GET.json', async () => {
    // External call will be recorded
    const response = await request.get('www.google.com')
    expect(response.status).toBe(200)
    expect(response.text).toMatchSnapshot()
    
    // Local call will not be recorded. But if handler for this request makes additional external calls, they will be recorded.
    const responseLocal = await request.get('localhost:4000')
    expect(responseLocal.status).toBe(200)
    expect(responseLocal.body).toMatchSnapshot()
  })
```

### Recording calls to other local services

```
import { NockbackHelper } from 'nockback-harder'
import nock from 'nock'

const OTHER_LOCAL_SERVICE_PORT = 8087

  const helper = new NockbackHelper(nock, __dirname + '/nock-fixtures')
  helper.startRecordingNew()

  await helper.nockBack('google.com-GET.json', { passthroughPortWhitelist: OTHER_LOCAL_SERVICE_PORT] }, async () => {
    // Local call will not be recorded. But calls from request handler to localhost:8087 will be recorded.
    const responseLocal = await request.get('localhost:4000')
    expect(responseLocal.status).toBe(200)
    expect(responseLocal.body).toMatchSnapshot()
  })
```

### Executing tests in CI

```
import { NockbackHelper } from 'nockback-harder'
import nock from 'nock'

  const helper = new NockbackHelper(nock, __dirname + '/nock-fixtures')
  
  // This will cause test to fail when unexpected calls are being made, instead of recording them. 
  // This is the mode with which you should be committing your tests.
  helper.startLockdown()  

  await helper.nockBack('google.com-GET.json', async () => {
    /* actual test */
  })
```

## Configuration

NockbackHelper constructor accepts following parameters:

* nock -> instance of nock. Usually retrieved by calling `import * as nock from 'nock'` or `'const nock = require('nock)'`
* fixtureDirectory?: string -> base directory, relative to which path to fixtures will be resolved
* config?: NockbackHelperConfig -> optional helper configuration

NockbackHelperConfig parameters:

* passThroughLocalCall: boolean = true -> do not create or replay mocks for local calls (localhost or 127.0.0.1), execute actual calls instead.

nockBack execution method accepts following parameters:

* pathToFixture: string -> relative path to a file which will be used for recording and replaying call mocks.
* callbackOrConfig: NockbackExecutionConfig | Function -> either optional config parameter, or function that will be executed within the current Nockback context. Mocks for HTTP calls within this function (including nested calls) will be recorded/replayed to/from file specified in `pathToFixture`.
* callback?: Function -> function that will be executed within the current Nockback context. Should only be set if optional config parameter is passed.

NockbackExecutionConfig parameters:

* passthroughLocalCall?: boolean -> override for helper-wide passthrough parameter.
* passthroughPortWhitelist? number[] -> enable creating and replaying mocks for local calls on specific ports.
* doNotOverwrite?: boolean -> if set to true, this execution will not overwrite mocks even startRecordingOverwrite() was invoked. Used to preserve manually crafted mocks.
* nockOptionsOverride?: NockBackOptions -> used to override Nockback options

## Supported helper modes

* startRecordingNew() -> Use recorded mocks, record if there are none, throw an error if mocks exist but none of them match request being sent
* startRecordingOverwrite() -> Delete recorded mocks if they exist, record new mocks
* startLockdown() -> Use recorded mocks, throw an error on missing and unused ones. Never records anything. Meant to be used for CI

## Helper methods

NockbackHelper provides following helper methods:

* expectNoPendingMocks() -> throw an error if nock instance used by helper still has recorded mocks that were never used during test execution.
* disableExternalCalls() -> make nock instance used by helper throw an error if external call not covered by existing mocks is made.

[npm-image]: https://img.shields.io/npm/v/nockback-harder.svg
[npm-url]: https://npmjs.org/package/nockback-harder
[downloads-image]: https://img.shields.io/npm/dm/nockback-harder.svg
[downloads-url]: https://npmjs.org/package/nockback-harder
[travis-image]: https://img.shields.io/travis/kibertoad/nockback-harder/master.svg?label=linux
[travis-url]: https://travis-ci.org/kibertoad/nockback-harder
