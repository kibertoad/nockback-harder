import { NockbackHelper } from '../../lib/NockbackHelper'
import express from 'express'
import * as nock from 'nock'
import { Server } from 'net'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'

export function rmSyncRecursive(rmPath: string) {
  if (existsSync(rmPath)) {
    unlinkSync(rmPath)
  }
}

export function initHelper(dirname: string, passThroughLocalCall = true): NockbackHelper {
  return new NockbackHelper(nock, dirname + '/nock-fixtures', { passThroughLocalCall })
}

export function runSimpleApp(port = 4000): Server {
  const app = express()
  app.get('/', (_req: express.Request, res: express.Response) => {
    res.status(200).send({ status: 'ok' })
  })
  return app.listen(port)
}

export function loadJSON(path: string): any {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function saveJSON(json: any, path: string): any {
  writeFileSync(path, JSON.stringify(json), 'utf8')
}
