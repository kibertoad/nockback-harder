import { NockBack, NockBackMode, NockBackOptions } from 'nock'

export class NockbackHelper {
  private readonly nock: any
  private readonly _nockBack: NockBack
  private mode: NockBackMode
  private fixtureDirectory: string | undefined
  private readonly passthroughLocalCall: boolean

  constructor(nock: any, fixtureDirectory?: string, passthroughLocalCall: boolean = true) {
    this.nock = nock
    this._nockBack = nock.back
    this.mode = 'wild'
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
  nockBack(
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

    const DEFAULT_OPTIONS: NockBackOptions = {
      // on 'lockdown' mode, 'after' is called after lockdown disables all net.
      after: () =>
        this.nock.enableNetConnect({
          test: localUrlMatcher
        }),
      // on 'record' I had to filter requests to localhost.
      afterRecord: (outputs: any[]) =>
        outputs.filter(o => {
          return localUrlMatcher(o.scope)
        })
    }

    this._nockBack.fixtures = this.fixtureDirectory!
    this._nockBack.setMode(this.mode)

    return new Promise((resolve, reject) => {
      const options = this.passthroughLocalCall ? DEFAULT_OPTIONS : {}
      const mergedOptions: NockBackOptions = {
        ...options,
        ...optionsOverride
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

  setFixtureDirectory(fixtureDirectory: string) {
    this.fixtureDirectory = fixtureDirectory
  }

  setMode(mode: NockBackMode) {
    this.mode = mode
  }
}

function localUrlMatcher(url: string): boolean {
  if (!url.match(/localhost/) && !url.match(/127\.0\.0\.1/)) {
    return true
  }
  return false
}
