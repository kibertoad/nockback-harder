import fs from 'fs'
import path from 'path'
import { NockBack, NockBackMode, NockBackOptions } from 'nock'

export class NockbackHelper {
  private readonly nock: any
  private readonly _nockBack: NockBack
  private isOverwriting: boolean
  private mode: NockBackMode
  private fixtureDirectory: string | undefined
  private readonly passthroughLocalCall: boolean

  public constructor(nock: any, fixtureDirectory?: string, passthroughLocalCall: boolean = true) {
    this.nock = nock
    this._nockBack = nock.back
    this.mode = 'record'
    this.isOverwriting = false
    this.fixtureDirectory = fixtureDirectory
    this.passthroughLocalCall = passthroughLocalCall
  }

  /**
   *
   * @param {string} pathToFixture
   * @param {object|function} optionsOverride - options or callback
   * @param {function} callback - can be sync or async
   * @returns {Promise<any>} - value returned by callback
   */
  public nockBack(
    pathToFixture: string,
    optionsOverride: NockBackOptions | Function,
    callback?: Function
  ) {
    if (callback === undefined && typeof optionsOverride === 'function') {
      callback = optionsOverride
    }
    if (!callback) {
      throw new Error('No callback defined!')
    }

    this._nockBack.fixtures = this.fixtureDirectory!
    this._nockBack.setMode(this.mode)

    const hasExternalCalls = checkIfHasExternalCalls(this.fixtureDirectory || '', pathToFixture)
    if (!hasExternalCalls) {
      return this.executeWithoutMocks(callback)
    }

    const DEFAULT_OPTIONS: NockBackOptions = {
      // on 'lockdown' mode, 'after' is called after lockdown disables all net.
      after: () =>
        this.nock.enableNetConnect({
          test: localUrlMatcher
        }),
      // on 'record' I had to filter requests to localhost.
      afterRecord: (outputs: any[]) => {
        return outputs.filter(o => {
          return !localUrlMatcher(o.scope)
        })
      }
    }

    return new Promise((resolve, reject) => {
      const options = this.passthroughLocalCall ? DEFAULT_OPTIONS : {}
      const mergedOptions: NockBackOptions = {
        ...options,
        ...optionsOverride
      }
      if (this.isOverwriting) {
        deleteFixture(this.fixtureDirectory || '', pathToFixture)
      }

      this._nockBack(pathToFixture, mergedOptions, async (nockDone: Function) => {
        try {
          const result = await callback!()
          nockDone()
          resolve(result)
        } catch (err) {
          reject(err)
        }
      })
    })
  }

  public setFixtureDirectory(fixtureDirectory: string) {
    this.fixtureDirectory = fixtureDirectory
  }

  public setMode(mode: NockBackMode) {
    this.mode = mode
  }

  /**
   * Use recorded fixtures, record missing ones
   */
  public startRecording() {
    this.isOverwriting = false
    this.setMode('record')
  }

  /**
   * Record missing fixtures and overwrite existing ones
   */
  public startRecordingOverwrite() {
    this.isOverwriting = true
    this.setMode('record')
  }

  /**
   * Use recorded fixtures, throw an error on missing ones, don't record
   */
  public startLockdown() {
    this.isOverwriting = false
    this.setMode('lockdown')
  }

  public expectNoPendingMocks() {
    if (!this.nock.isDone()) {
      const errMsg = `There are unmet expectations: ${this.nock.pendingMocks()}`
      this.nock.cleanAll()
      throw new Error(errMsg)
    }
  }

  public disableExternalCalls() {
    this.nock.enableNetConnect({
      test: localUrlMatcher
    })
  }

  private async executeWithoutMocks(testFn: Function) {
    if (this.mode === 'lockdown') {
      this.disableExternalCalls()
    }
    return await testFn()
  }
}

function localUrlMatcher(url: string): boolean {
  if (url.match(/localhost/) || url.match(/127\.0\.0\.1/)) {
    return true
  }
  return false
}

/**
 * Returns true if there is no mock or if there are actual calls, returns false only if there is empty mock
 * @param directory
 * @param pathToFixture
 */
function checkIfHasExternalCalls(directory: string, pathToFixture: string): boolean {
  const resolvedPath = path.resolve(directory, pathToFixture)
  if (!fs.existsSync(resolvedPath)) {
    return true
  }
  const mocks = require(resolvedPath)

  if (Array.isArray(mocks) && mocks.length === 0) {
    return false
  }

  return true
}

/**
 *
 * @param directory
 * @param pathToFixture
 * @return true if fixture was deleted, false if there was no fixture to delete
 */
function deleteFixture(directory: string, pathToFixture: string): boolean {
  const resolvedPath = path.resolve(directory, pathToFixture)
  if (fs.existsSync(resolvedPath)) {
    fs.unlinkSync(resolvedPath)
    return true
  }
  return false
}
