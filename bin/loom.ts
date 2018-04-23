#! /usr/bin/env node
'use strict';

import * as loom from '../index';
import * as path from 'path';
import * as util from 'util';
import * as yargs from 'yargs';
import * as Loader from 'yaml-config-loader';

const loader = new Loader({stopOnError: true});

loader.on('error', function(error) {
  if (error.name === 'YAMLException') {
    console.error({err: error}, util.print('Error parsing YAML file `', error.filePath, '`:', error.reason));
  }
  throw error;
});

yargs
  .describe('port', 'The port to listen on.')
  .alias('port', 'p')
  .describe('config', 'A YAML config file or directory of yaml files to load, can be invoked multiple times and later files will override earlier.')
  .alias('config', 'c')
  .describe('help', 'Display this help message.')
  .alias('help', 'h');

const argv = yargs.argv;

if (argv.help) {
  yargs.showHelp();
  process.exit();
}

loader.addMapping({
  host: 'server.host',
  port: 'server.port',
  dbHost: 'db.host',
  dbPort: 'db.port',
  dbName: 'db.db',
  storageLogsTable: 'storage.logsTable',
  storageMetaTable: 'storage.metaTable',

  storageDataDir: 'storage.dataDir',
  storageTailTimeout: 'storage.tailTimeout',
  storageCompress: 'storage.compress',
});

const configKeys = [
  'server',
  'db',
  'storage',
  'tokens',
];

// When you use remapping, later mappings tend to replace the entire
// structure rather than overwriting the component key.
const loaderAddOptions = {
  deepMerge: configKeys
};

loader.add(path.resolve(path.join(process.env.PWD, 'defaults.yaml')), loaderAddOptions);
loader.addAndNormalizeObject(process.env, loaderAddOptions);

if (argv.config) {
  if (typeof argv.config === 'string') {
    argv.config = [argv.config];
  }

  for (let filePath of argv.config) {
    loader.add(path.resolve(filePath), loaderAddOptions);
  }
}

loader.addAndNormalizeObject(argv, loaderAddOptions);

let cachedConfig = null;
module.exports = {
  load: function(cb) {
    if (cachedConfig) {
      if (typeof cb == 'function') {
        cb(null, cachedConfig);
      }
      return cachedConfig;
    }
    else {
      loader.load(function(err, config) {
        cachedConfig = config;
        cb(err, config);
      });
    }
  },
};

if (!module.parent) {
  loader.load(function(error, config) {
    if (error) throw error;
    loom.run(config);
  });
}
