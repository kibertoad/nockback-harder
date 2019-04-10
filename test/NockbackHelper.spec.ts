import { NockbackHelper } from '../index-ts'
import * as nock from 'nock'
import request from 'superagent'
import express from 'express'
import rimraf from 'rimraf'

describe('NockbackHelper', () => {
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
      await request.get('localhost:4000')
    })

    server.close()

    const local = require('./nock-fixtures/local-GET.json')
    expect(local).toEqual([])
  })
})
