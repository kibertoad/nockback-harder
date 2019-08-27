import request from 'superagent'
import express from 'express'
import rimraf from 'rimraf'
import { initHelper, runSimpleApp, loadJSON, saveJSON } from './utils/testUtils'

describe('NockbackHelper', () => {
  it('block unmocked external call', async () => {
    const helper = initHelper(__dirname)
    helper.startLockdown()
    expect.hasAssertions()

    await helper.nockBack('microsoft.com-GET.json', async () => {
      try {
        await request.get('www.microsoft.com')
      } catch (err) {
        expect(err.message).toMatch('Disallowed net connect')
      }
    })
  })

  it('replay', async () => {
    const helper = initHelper(__dirname)
    helper.startLockdown()

    await helper.nockBack('google.com-GET.json', async () => {
      const response = await request.get('www.google.com')
      expect(response.status).toBe(200)
      expect(response.text).toMatchSnapshot()
    })
  })

  it('replay existing mock but throw on unexpected one', async () => {
    rimraf.sync(getFixturePath('google.com-GET-append.json'))
    const helper = initHelper(__dirname)
    helper.startRecordingNew()
    await helper.nockBack('google.com-GET-append.json', async () => {
      await request.get('www.google.com')
    })

    expect.assertions(1)
    try {
      await helper.nockBack('google.com-GET-append.json', async () => {
        await request.get('www.google.com')
        await request.get('www.microsoft.com')
      })
    } catch (err) {
      expect(err.message).toMatchSnapshot()
    }
  })

  it('can overwrite existing mocks', async () => {
    const fixturePath = getFixturePath('local-GET-overwrite.json')
    const helper = initHelper(__dirname, false)
    helper.startRecordingOverwrite()
    const server = runSimpleApp()
    const [originalMock] = loadJSON(fixturePath)
    expect(originalMock.path).toEqual('/?dummy=value')

    await helper.nockBack('local-GET-overwrite.json', async () => {
      await request.get('localhost:4000').query({
        dummy2: 'value'
      })
    })

    server.close()

    const [updatedMock] = loadJSON(fixturePath)
    expect(updatedMock.path).toEqual('/?dummy2=value')
    saveJSON([originalMock], fixturePath)
  })

  it('can overwrite existing empty mocks', async () => {
    const fixturePath = getFixturePath('local-GET-empty-overwrite.json')
    const helper = initHelper(__dirname, false)
    helper.startRecordingOverwrite()
    const server = runSimpleApp()

    await helper.nockBack('local-GET-empty-overwrite.json', async () => {
      await request.get('localhost:4000').query({
        dummy2: 'value'
      })
    })

    server.close()

    const [updatedMock] = loadJSON(fixturePath)
    expect(updatedMock.path).toEqual('/?dummy2=value')
    saveJSON([], fixturePath)
  })

  it('does not overwrite existing mocks when doNotOverwrite flag is set', async () => {
    const fixturePath = getFixturePath('local-GET-do-not-overwrite.json')
    const helper = initHelper(__dirname, false)
    helper.startRecordingOverwrite()
    expect.hasAssertions()
    const server = runSimpleApp()
    const [originalMock] = loadJSON(fixturePath)
    expect(originalMock.path).toEqual('/?dummy=value')

    await helper.nockBack('local-GET-do-not-overwrite.json', { doNotOverwrite: true }, async () => {
      try {
        await request.get('localhost:4000').query({
          dummy2: 'value'
        })
      } catch (err) {
        expect(err.message).toMatch('No match for request')
      }
    })

    server.close()

    const [updatedMock] = loadJSON(fixturePath)
    expect(updatedMock.path).toEqual('/?dummy=value')
    saveJSON([originalMock], fixturePath)
  })

  it('bypass local', async () => {
    rimraf.sync(getFixturePath('local-GET.json'))
    const helper = initHelper(__dirname)
    helper.startRecordingNew()
    const server = runSimpleApp()

    await helper.nockBack('local-GET.json', async () => {
      const response = await request.get('localhost:4000')
      expect(response.body).toMatchSnapshot()
    })

    server.close()

    const local = loadJSON(getFixturePath('local-GET.json'))
    expect(local).toEqual([])
  })

  it('do not bypass local if whitelisted', async () => {
    rimraf.sync(getFixturePath('local-GET-whitelist.json'))
    const helper = initHelper(__dirname)
    helper.startRecordingOverwrite()
    const server = runSimpleApp()
    const server2 = runSimpleApp(4001)

    await helper.nockBack(
      'local-GET-whitelist.json',
      { passthroughPortWhitelist: [4000] },
      async () => {
        const response = await request.get('localhost:4000')
        expect(response.body).toMatchSnapshot()

        const response2 = await request.get('localhost:4001')
        expect(response2.body).toMatchSnapshot()
      }
    )

    server.close()
    server2.close()

    const local = loadJSON(getFixturePath('local-GET-whitelist.json'))
    expect(local.length).toEqual(1)
    expect(local[0].scope).toEqual('http://localhost:4000')
    rimraf.sync(getFixturePath('local-GET-whitelist.json'))
  })

  it('bypass local when recording on top of empty mocks', async () => {
    const fixturePath = getFixturePath('local-GET-empty-record.json')
    rimraf.sync(fixturePath)
    saveJSON([], fixturePath)

    const helper = initHelper(__dirname)
    helper.startRecordingNew()
    const server = runSimpleApp()

    await helper.nockBack('local-GET-empty-record.json', async () => {
      const response = await request.get('localhost:4000')
      expect(response.body).toMatchSnapshot()
    })

    server.close()

    const local = loadJSON(getFixturePath('local-GET-empty-record.json'))
    expect(local).toEqual([])
  })

  it('bypassing local works with lockdown', async () => {
    const helper = initHelper(__dirname)
    helper.startLockdown()
    const app = express()
    // @ts-ignore
    app.get('/', (req: express.Response, res: express.Response) => {
      res.status(200).send({ status: 'ok' })
    })
    const server = app.listen(4000)

    await helper.nockBack('local-GET-lockdown.json', async () => {
      const response = await request.get('localhost:4000')
      expect(response.body).toMatchSnapshot()
    })

    server.close()
  })

  it('bypassing local works with lockdown and correctly fails on unexpected external calls', async () => {
    jest.setTimeout(3000000)
    const helper = initHelper(__dirname)
    helper.startLockdown()
    const app = express()
    // @ts-ignore
    app.get('/', (req: express.Response, res: express.Response) => {
      res.status(200).send({ status: 'ok' })
    })
    const server = app.listen(4000)

    try {
      expect.assertions(1)
      await helper.nockBack('local-GET-lockdown.json', async () => {
        await request.get('localhost:4000')
        await request.get('www.microsoft.com')
      })
    } catch (err) {
      expect(err.message).toEqual('Nock: Disallowed net connect for "www.microsoft.com:80/"')
    } finally {
      server.close()
    }
  })
})

function getFixturePath(fixtureName: string) {
  return __dirname + '/nock-fixtures/' + fixtureName
}
