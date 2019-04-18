# nockback-harder

Wrapper that makes testing using Nock mock replay functionality easier. 
Does not create mocks for local calls (localhost/127.0.0.1) when recording, allows and passes through local calls when replaying.

## Example usage

```
import { NockbackHelper } from 'nockback-harder'
import nock from 'nock'

  const helper = new NockbackHelper(nock, __dirname + '/nock-fixtures', true)
  helper.startRecording()

  await helper.nockBack('google.com-GET.json', async () => {
    // Will be recorded
    const response = await request.get('www.google.com')
    expect(response.status).toBe(200)
    expect(response.text).toMatchSnapshot()
    
    // Will not be recorded
    const responseLocal = await request.get('localhost:4000')
    expect(responseLocal.status).toBe(200)
    expect(responseLocal.body).toMatchSnapshot()
  })
```

  For CommonJS version call `const { NockbackHelper } = require('nockback-harder')`
