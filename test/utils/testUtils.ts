import { NockbackHelper } from '../../lib/NockbackHelper'
import express from 'express'
import * as nock from 'nock'
import { Server } from 'net'
import fs from 'fs'

export function initHelper(dirname: string, passthroughLocalCall: boolean = true): NockbackHelper {
  return new NockbackHelper(nock, dirname + '/nock-fixtures', passthroughLocalCall)
}

export function runSimpleApp(): Server {
  const app = express()
  // @ts-ignore
  app.get('/', (req: express.Response, res: express.Response) => {
    res.status(200).send({ status: 'ok' })
  })
  return app.listen(4000)
}

export function loadJSON(path: string): any {
  return JSON.parse(fs.readFileSync(path, 'utf8'))
}

export function saveJSON(json: any, path: string): any {
  fs.writeFileSync(path, JSON.stringify(json), 'utf8')
}
