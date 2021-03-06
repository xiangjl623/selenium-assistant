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

const chalk = require('chalk');

const application = require('./application-state.js');
const browserManager = require('./browser-manager.js');
const downloadManager = require('./download-manager.js');

/**
 * SeleniumAssistant is a class that makes
 * it easier to download, interegate and launch a browser
 * for running tests with selenium.
 *
 * @example <caption>Usage in Node</caption>
 * const seleniumAssistant = require('selenium-assistant');
 * seleniumAssistant.printAvailableBrowserInfo();
 *
 * const browsers = seleniumAssistant.getLocalBrowsers();
 * browsers.forEach(browser => {
 *   console.log(browsers.getPrettyName());
 *   console.log(browsers.getReleaseName());
 * });
 */
class SeleniumAssistant {

  /**
   * This returns the path of where browsers are downloaded to.
   * @return {String} Path of downloaded browsers
   */
  getBrowserInstallDir() {
    return application.getInstallDirectory();
  }

  /**
   * To change where browsers are downloaded to, call this method
   * before calling {@link downloadLocalBrowser} and
   * {@link getLocalBrowsers}.
   *
   * By default, this will install under `.selenium-assistant` in
   * your home directory on OS X and Linux, or just `selenium-assistant`
   * in your home directory on Windows.
   *
   * @param {String} newInstallDir Path to download browsers to. Pass in
   *                               null to use default path.
   */
  setBrowserInstallDir(newInstallDir) {
    application.setInstallDirectory(newInstallDir);
  }

  /**
   * <p>The downloadLocalBrowser() function is a helper method what will
   * grab a browser on a specific release channel.</p>
   *
   * <p>If the request browser is already installed, it will resolve
   * the promise and not download anything.</p>
   *
   * <p>This is somewhat experimental, so be prepared for issues.</p>
   *
   * @param  {String} browserId The selenium id of the browser you wish
   *                            to download.
   * @param  {String} release   String of the release channel, can be
   *                            'stable', 'beta' or 'unstable'
   * @param  {int} [expirationInHours=24] This is how long until a browser
   *                             download is regarded as expired and Should
   *                             be updated. A value of 0 will force a download.
   * @return {Promise}          A promise is returned which resolves
   *                            once the browser has been downloaded.
   */
  downloadLocalBrowser(browserId, release, expirationInHours) {
    return downloadManager.downloadLocalBrowser(
      browserId, release, expirationInHours);
  }

  /**
   * If you want a specific browser you can use to retrieve although
   * you should use {@link WebDriverBrowser#isValid} to check if the
   * browser is available in the current environment.
   *
   * @param  {String} browserId The selenium id of the browser you want.
   * @param  {String} release   The release of the browser you want. Either
   *                            'stable', 'beta' or 'unstable.'
   * @return {WebDriverBrowser} The WebDriverBrowser instance that represents
   *                            your request.
   */
  getLocalBrowser(browserId, release) {
    return browserManager.getLocalBrowser(browserId, release);
  }

  /**
   * <p>This method returns a list of discovered browsers in the current
   * environment.</p>
   *
   * <p>This method will throw an error if run on a platform other than
   * OS X and Linux.</p>
   *
   * @return {Array<WebDriverBrowser>} Array of browsers discovered in the
   * current environment.
   */
  getLocalBrowsers() {
    if (process.platform !== 'darwin' && process.platform !== 'linux') {
      throw new Error('Sorry this library only supports OS X and Linux.');
    }

    let webdriveBrowsers = browserManager.getSupportedBrowsers();
    webdriveBrowsers = webdriveBrowsers.filter((webdriverBrowser) => {
      return webdriverBrowser.isValid();
    });

    return webdriveBrowsers;
  }

  /**
   * <p>This method prints out a table of info for all available browsers
   * on the current environment.</p>
   *
   * <p>Useful if you are testing on travis and want to see what tests
   * should be running.</p>
   *
   * @param {Boolean} [printToConsole=true] - If you wish to prevent
   * the table being printed to the console, you can suppress it by
   * passing in false and simply use the string response.
   * @return {String} Returns table of information as a string.
   */
  printAvailableBrowserInfo(printToConsole) {
    if (typeof printToConsole === 'undefined') {
      printToConsole = true;
    }

    const rows = [];
    rows.push([
      'Browser Name',
      'Browser Version',
      'Path',
    ]);

    const browsers = this.getLocalBrowsers();
    browsers.forEach((browser) => {
      rows.push([
        browser.getPrettyName(),
        browser.getVersionNumber().toString(),
        browser.getExecutablePath(),
      ]);
    });

    const noOfColumns = rows[0].length;
    const rowLengths = [];
    for (let i = 0; i < noOfColumns; i++) {
      let currentRowMaxLength = 0;
      rows.forEach((row) => {
        currentRowMaxLength = Math.max(
          currentRowMaxLength, row[i].length);
      });
      rowLengths[i] = currentRowMaxLength;
    }

    let totalRowLength = rowLengths.reduce((a, b) => a + b, 0);

    // Account for spaces and markers
    totalRowLength += (noOfColumns * 3) + 1;

    let outputString = chalk.gray('-'.repeat(totalRowLength)) + '\n';
    rows.forEach((row, rowIndex) => {
      const color = rowIndex === 0 ? chalk.bold : chalk.blue;
      let coloredRows = row.map((column, columnIndex) => {
        const padding = rowLengths[columnIndex] - column.length;
        if (padding > 0) {
          return color(column) + ' '.repeat(padding);
        }
        return color(column);
      });

      let rowString = coloredRows.join(' | ');

      outputString += '| ' + rowString + ' |\n';
    });

    outputString += chalk.gray('-'.repeat(totalRowLength)) + '\n';

    if (printToConsole) {
      /* eslint-disable no-console */
      console.log(outputString);
      /* eslint-enable no-console */
    }

    return outputString;
  }

  /**
   * The Saucelabs details to be used by Saucelab browsers.
   * @param {string} username The Saucelabs username.
   * @param {string} accessKey The Saucelabs access key.
   */
  setSaucelabsDetails(username, accessKey) {
    application.setSaucelabsDetails(username, accessKey);
  }

  /**
   * Get a Saucelab browser for a particular browser ID and a particular
   * browser version.
   * @param {string} browserId The selenium browser ID.
   * @param {string} browserVersion This is a Saucelabs browser version like
   * "latest" or "latest-2".
   * @param {Object} options The options to set for saucelabs.
   * @return {WebDriverBrowser} A selenium-assistant web driver instance.
   */
  getSaucelabsBrowser(browserId, browserVersion, options) {
    if (!options.saucelabs || !options.saucelabs.username ||
      !options.saucelabs.accessKey) {
      options.saucelabs = application.getSaucelabsDetails();
    }

    return browserManager.getSaucelabsBrowser(browserId, browserVersion,
      options);
  }

  /**
   * This will enable the saucelabs connect proxy.
   * @return {Promise} Returns a promise that resolves once the proxy is
   * set up.
   */
  enableSaucelabsConnect() {
    return application.enableSaucelabsConnect();
  }

  /**
   * This will disable the saucelabs connect proxy.
   * @return {Promise} Returns a promise that resolves once the proxy is closed.
   */
  disableSaucelabsConnect() {
    return application.disableSaucelabsConnect();
  }

  /**
   * <p>Once a web driver is no longer needed call this method to kill it. The
   * promise resolves once the browser is closed and clean up has been done.</p>
   *
   * <p>This is a basic helper that adds a timeout to the end of killling
   * driver to account for shutdown time and the issues that can cause.</p>
   *
   * @param  {WebDriver} driver Instance of a {@link http://selenium.googlecode.com/git/docs/api/javascript/class_webdriver_WebDriver.html | WebDriver}
   * @return {Promise}          Promise that resolves once the browser is
   * killed.
   */
  killWebDriver(driver) {
    if (typeof driver === 'undefined' || driver === null) {
      return Promise.resolve();
    }

    if (!driver.quit || typeof driver.quit !== 'function') {
      return Promise.reject(new Error('Unable to find a quit method on the ' +
        'web driver.'));
    }

    // Sometimes calling driver.quit() on Chrome, doesn't work,
    // so this timeout offers a semi-decent fallback
    let quitTimeout;
    return new Promise((resolve) => {
      quitTimeout = setTimeout(resolve, 2000);

      driver.quit()
      .then(resolve, resolve);
    })
    .then(() => {
      clearTimeout(quitTimeout);

      return new Promise((resolve, reject) => {
        setTimeout(resolve, 2000);
      });
    });
  }
}

module.exports = new SeleniumAssistant();
