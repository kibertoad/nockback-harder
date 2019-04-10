# nockback-harder

Wrapper that makes testing using nock mock replay functionality sane. Ignores local calls when recording, passes through local calls when replaying.

## Example usage

```
import { NockbackHelper } from 'nockback-harder/index-ts'

  const helper = new NockbackHelper(nock, __dirname + '/nock-fixtures', true)
  helper.setMode('record')

  await helper.nockBack('google.com-GET.json', async () => {
    // Will be recorded
    const response = await request.get('www.google.com')
    expect(response.status).toBe(200)
    expect(response.text).toMatchSnapshot()
    
    // Will not be recorded
    const responseLocal = await request.get('localhost:4000')
    expect(responseLocal.status).toBe(200)
    expect(responseLocal.text).toMatchSnapshot()
  })
```

  If you want to access Typescript version of a library, call `import { NockbackHelper } from 'nockback-harder/index-ts'`
  For Javascript version call `const { NockbackHelper } = require('nockback-harder')`
