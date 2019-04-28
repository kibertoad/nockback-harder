import request from 'superagent'
import express from 'express'
import rimraf from 'rimraf'
import { initHelper, runSimpleApp, loadJSON, saveJSON } from './utils/testUtils'

describe('NockbackHelper', () => {
  it('block unmocked external call', async done => {
    const helper = initHelper(__dirname)
    helper.startLockdown()

    await helper.nockBack('microsoft.com-GET.json', async () => {
      try {
        await request.get('www.microsoft.com')
      } catch (err) {
        expect(err.message).toMatch('Disallowed net connect')
        done()
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

  it('bypass local', async () => {
    rimraf.sync(getFixturePath('local-GET.json'))
    const helper = initHelper(__dirname)
    helper.startRecording()
    const server = runSimpleApp()

    await helper.nockBack('local-GET.json', async () => {
      const response = await request.get('localhost:4000')
      expect(response.body).toMatchSnapshot()
    })

    server.close()

    const local = loadJSON(getFixturePath('local-GET.json'))
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
