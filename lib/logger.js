/**
 * Copyright Suchkov Dmitrii
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var log4js = require('log4js');
var config = require('../config');

var logFolder = __dirname + '/../logs';
log4js.configure(config.log4js, {cwd: logFolder});

// get logger for module
//
// name - String, logger name
module.exports = function getLogger(name) {
    return log4js.getLogger(name);
};
