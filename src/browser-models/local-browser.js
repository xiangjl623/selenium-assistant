/*
  Copyright 2016 Google Inc. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

'use strict';

const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const Browser = require('./browser.js');

/**
 * Local browser is an abstract class with some implemented methods
 * and some methods that MUST be overriden.
 */
class LocalBrowser extends Browser {
  /**
   * Constructs new local browser.
   * @param {Object} config TODO This should be a shared webdriver config
   * class.
   * @param {string} release Release name must be 'stable', 'beta' or
   * 'unstable'.
   * @param {Object} blacklist This is a list of browser versions: driver
   * versions used to blacklist a browser.
   */
  constructor(config, release, blacklist) {
    super(config);

    if (typeof config._prettyName !== 'string' ||
      config._prettyName.length === 0) {
      throw new Error('Invalid prettyName value: ', config._prettyName);
    }

    if (release !== 'stable' && release !== 'beta' && release !== 'unstable') {
      throw new Error('Unexpected browser release given: ', release);
    }

    this._prettyName = `${config._prettyName}`;

    const releaseNames = this.constructor.getPrettyReleaseNames();
    if (releaseNames[release]) {
      this._prettyName += ` ${releaseNames[release]}`;
    }

    this._release = release;
    this._blacklist = blacklist;
  }
  /* eslint-disable valid-jsdoc */
  /**
   * To get the path of the browsers executable file, call this method.
   * @return {String} Path of the browsers executable file or null if
   * it can't be found.
   */
  getExecutablePath() {
    throw new Error('getExecutablePath() must be overriden by subclasses');
  }
  /* eslint-enable valid-jsdoc */

  /**
   * <p>This method returns true if the instance can be found and can create a
   * selenium driver that will launch the expected browser.</p>
   *
   * <p>A scenario where it will be unable to produce a valid selenium driver
   * is if the browsers executable path can't be found.</p>
   *
   * @return {Boolean} True if a selenium driver can be produced
   */
  isValid() {
    const executablePath = this.getExecutablePath();
    if (!executablePath) {
      return false;
    }

    try {
      // This will throw if it's not found
      fs.lstatSync(executablePath);

      const minVersion = this._getMinSupportedVersion();
      if (minVersion) {
        return this.getVersionNumber() >= minVersion;
      }

      if (this.isBlackListed()) {
        return false;
      }

      return true;
    } catch (error) {
      // NOOP
    }

    return false;
  }

  /**
   * @return {Boolean} Whether this browser is blacklisted or not.
   */
  isBlackListed() {
    return false;
  }

  /**
   * A user friendly name for the browser
   * @return {String} A user friendly name for the browser
   */
  getPrettyName() {
    return this._prettyName;
  }

  /**
   * If you need to identify a browser based on it's version number but
   * the high level version number isn't specific enough, you can use the
   * raw version string (this will be the result of calling the browser
   * executable with an appropriate flag to get the version)
   * @return {String} Raw string that identifies the browser
   */
  getRawVersionString() {
    if (this._rawVerstionString) {
      return this._rawVerstionString;
    }

    const executablePath = this.getExecutablePath();
    if (!executablePath) {
      return null;
    }

    this._rawVerstionString = null;

    try {
      this._rawVerstionString = execSync(`"${executablePath}" --version`)
        .toString();
    } catch (err) {
      // NOOP
    }

    return this._rawVerstionString;
  }

  /* eslint-disable valid-jsdoc */
  /**
   * <p>This method returns an integer if it can be determined from
   * the browser executable or -1 if the version is unknown.</p>
   *
   * <p>A scenario where it will be unable to produce a valid version
   * is if the browsers executable path can't be found.</p>
   *
   * @return {Integer} Version number if it can be found
   */
  getVersionNumber() {
    throw new Error('getVersionNumber() must be overriden by subclasses');
  }
  /* eslint-enable valid-jsdoc */

  /**
   * @private
   */
  getSeleniumDriverBuilder() {
    throw new Error('getSeleniumDriverBuilder() must be overriden by ' +
      'subclasses');
  }

  /**
   * <p>This method resolves to a webdriver instance of this browser i
   * nstance.</p>
   *
   * <p>For more info, see:
   * {@link http://selenium.googlecode.com/git/docs/api/javascript/class_webdriver_WebDriver.html | WebDriver Docs}</p>
   *
   * @return {Promise<WebDriver>} [description]
   */
  getSeleniumDriver() {
    if (this.getDriverModule()) {
      try {
        // This will require the necessary driver module that will add the
        // driver executable to the current path.
        const driverModule = require(this.getDriverModule());
        // The operadriver module DOESNT add the driver to the current path.
        if (this.getId() === 'opera') {
          // Operadriver.path includes the executable name which upsets
          // selenium and finding the operadriver executable.
          process.env.PATH += path.delimiter + path.dirname(driverModule.path);
        }
      } catch (err) {
        // NOOP
      }
    }

    try {
      const builder = this.getSeleniumDriverBuilder();
      const buildResult = builder.build();
      if (buildResult.then) {
        return buildResult;
      }
      return Promise.resolve(buildResult);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Get the minimum supported browser version for this browser.
   * @return {number} The minimum supported version number.
   */
  _getMinSupportedVersion() {
    return false;
  }

  /**
   * <p>The release name for this browser, either 'stable', 'beta',
   * 'unstable'.</p>
   *
   * <p>Useful if you only want to test <i>or</i> not test on a particular
   * release type.</p>
   * @return {String} Release name of browser. 'stable', 'beta' or 'unstable'
   */
  getReleaseName() {
    return this._release;
  }

  /**
   * @private
   */
  static getPrettyReleaseNames() {
    throw new Error('getPrettyReleaseNames() must be overriden by ' +
      'subclasses');
  }
}

module.exports = LocalBrowser;
