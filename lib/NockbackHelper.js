class NockbackHelper {
    constructor(nock, passthroughLocalCall = true) {
        this.nock = nock;
        this._nockBack = nock.back;
        this.mode = 'wild';
        this.fixtureDirectory = undefined;
        this.passthroughLocalCall = passthroughLocalCall
    }

    /**
     *
     * @param {string} pathToFixture
     * @param {object} optionsOverride
     * @param {function} callback - can be sync or async
     * @returns {Promise<any>} - value returned by callback
     */
    nockBack(pathToFixture, optionsOverride, callback) {
        if (callback === undefined) {
            callback = optionsOverride
        }

        const DEFAULT_OPTIONS = {
            // on 'lockdown' mode, 'after' is called after lockdown disables all net.
            after: () => this.nock.enableNetConnect(['localhost', '127.0.0.1']),
            // on 'record' I had to filter requests to localhost.
            afterRecord: outputs => outputs.filter(o => {
                !o.scope.match(/localhost/)
                && !o.scope.match(/127\.0\.0\.1/)
            })
        }

        this._nockBack.fixtures = this.fixtureDirectory
        this._nockBack.setMode(this.mode);

        return new Promise((resolve, reject) => {
            const options = this.passthroughLocalCall ? DEFAULT_OPTIONS: {};

            this._nockBack(pathToFixture, {...options, ...optionsOverride}, async (nockDone) => {
                try {
                    const result = await callback();
                    nockDone()
                    resolve(result)
                } catch (err) {
                    reject(err)
                }
            })
        })
    }

    setFixtureDirectory(fixtureDirectory) {
        this.fixtureDirectory = fixtureDirectory
    }

    setMode(mode) {
        this.mode = mode
    }

}

