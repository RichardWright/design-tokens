'use strict';

const console = require('console');
const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');

const getTokenList = require('./getTokenList');
const defineVersion = require('./defineVersion');
const installPackages = require('./installPackages');
const versionAddCommitTagPackage = require('./versionAddCommitTagPackage');
const publishPackage = require('./publishPackage');
const pushChanges = require('./pushChanges');

const root = path.join(__dirname, '../../../');
const latestTemp = path.join(__dirname, './tempNpm');

const run = doPublish => {
  const published = [];

  return new Promise((resolvePublish, rejectPublish) => {
    getTokenList(root).then(tokens => {
      installPackages(tokens, latestTemp)
        .then(installed =>
          Promise.mapSeries(installed, ({ pkg, success }) => {
            const newPackage = { diff: null, version: 'major' };
            const { diff, version } = success
              ? defineVersion(pkg, root, latestTemp)
              : newPackage;

            const printDiff = () =>
              console.log(
                `${diff ||
                  '<DIFF NOT AVAILABLE>'}\n--------------------------------`
              );

            if (!version) {
              return Promise.resolve();
            }

            if (doPublish) {
              printDiff();
              return versionAddCommitTagPackage({ pkg, version, root })
                .then(publishPackage)
                .then(pkg => {
                  published.push(pkg);
                  return Promise.resolve(pkg);
                });
            } else {
              console.log(`TEST: "Should publish ${pkg} as ${version}"`);
              printDiff();
              return Promise.resolve(pkg);
            }
          })
        )
        .then(
          () =>
            doPublish && published.length
              ? pushChanges(root)
              : Promise.resolve()
        )
        .then(() => {
          fs.removeSync(latestTemp);
          resolvePublish(
            `Automatic release ${doPublish ? '' : 'test'} successful`
          );
        })
        .catch(err => {
          fs.removeSync(latestTemp);
          rejectPublish(
            `Automatic release ${
              doPublish ? '' : 'test'
            } failed with err ${err}`
          );
        });
    });
  });
};

module.exports = run;
