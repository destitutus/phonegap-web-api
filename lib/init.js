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

var q = require('q');
var fs = require('fs');
var utils = require('./utils');
var childProcess = require('child_process');
var log = require('./logger')('init');

//denodeify
var exists = q.denodeify(fs.exists);
var exec = q.denodeify(childProcess.exec);

// Unpacking standalone app to user directory
//
// path - String, path for unpacking
function init(path) {
    var res = __dirname + '/../resources/phonegap.tar';
    var cmd = 'tar xfk ' + res;
    return exec(cmd, { cwd: path}).then(function () {
        return q.resolve(true);
    });
}

// Init application
//
// user - String, user name
// project - String, project name
exports.init = function (user, project) {
    log.trace('init', user, project);
    var path = utils.projectPath(user, project);
    return exists(path).then(function () {
        return q.reject('Project not found');
    }, function () {
        return init(path);
    });
};