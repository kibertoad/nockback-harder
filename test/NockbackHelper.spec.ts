import { NockbackHelper } from '../index'
import * as nock from 'nock'
import request from 'superagent'
import express from 'express'
import rimraf from 'rimraf'

describe('NockbackHelper', () => {
  it('block unmocked external call', async done => {
    const helper = new NockbackHelper(nock, __dirname + '/nock-fixtures', true)
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
    const helper = new NockbackHelper(nock, __dirname + '/nock-fixtures', true)
    helper.startLockdown()

    await helper.nockBack('google.com-GET.json', async () => {
      const response = await request.get('www.google.com')
      expect(response.status).toBe(200)
      expect(response.text).toMatchSnapshot()
    })
  })

  it('bypass local', async () => {
    rimraf.sync(__dirname + '/nock-fixtures/local-GET.json')
    const helper = new NockbackHelper(nock, __dirname + '/nock-fixtures', true)
    helper.startRecording()
    const app = express()
    // @ts-ignore
    app.get('/', (req: express.Response, res: express.Response) => {
      res.status(200).send({ status: 'ok' })
    })
    const server = app.listen(4000)

    await helper.nockBack('local-GET.json', async () => {
      const response = await request.get('localhost:4000')
      expect(response.body).toMatchSnapshot()
    })

    server.close()

    const local = require('./nock-fixtures/local-GET.json')
    expect(local).toEqual([])
  })
})
