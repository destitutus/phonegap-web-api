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
var client = require('phonegap-build-api');
var messages = require('./messages');
var queue = require('./queue');
var mongo = require('./mongo');
var _ = require('lodash');
var log = require('./logger')('build');

//denodeify
var exists = q.denodeify(fs.exists);
var exec = q.denodeify(childProcess.exec);
var auth = q.denodeify(client.auth);

// Save data to mongo and publish task
//
// data - Object, phonegap application data
// key - String, authentication token
// user - String, user name
// project - String, project name
// uid - String, current user uid
function saveToMongo(data, key, user, project, uid) {
    log.trace('saveToMongo', user, project, uid);
    if (!_.isString(data.error)) {
        queue.publishTask(user, project, key, uid);
    }
    return mongo.saveProject(user, project, uid, data);
}

// Get build options
//
// file, String, path to tar
// params, Object, build options { keys: { platforms keys},
// options: { phonegap options } }
//
function getOptions(file, params) {
    var keys = {};
    // phonegap do not build app if empty id will be passed
    _.each(params.keys, function (item, platform) {
        if (item.id) {
            keys[platform] = item;
        }
    });
    return {
        form: {
            data: {
                title: 'My App',
                'create_method': 'file',
                private: params.options.private,
                debug: params.options.debug,
                hydrates: params.options.hydrates,
                keys: keys
            },
            file: file
        }
    };
}

// Upload tarbar to phonegap and build
//
// key - String, authentication token
// file, String, path to application tar
// user - String, user name
// project - String, project name
// uid - String, current user uid
// params - Object, build options
function uploadToPhonegap(key, file, user, project, uid, params) {
    log.trace('uploadToPhonegap:start', user, project, uid);
    var appId;
    var api;
    var url = '/apps';
    return mongo.findProject(user, project, uid).then(function (item) {
        // search prev app
        appId = item && item.data && item.data.id ? item.data.id : null;
        log.trace('uploadToPhonegap:findProject', user, project, uid, 'appId', appId);
        return auth({token: key});
    }).then(function (_api) {
        api = _api;
        if (appId) {
            // remove old app (current pg build has problem with update current app)
            var del = q.denodeify(api.del);
            return del(url + '/' + appId).fail(function (e) {
                return 0;
            });
        } else {
            return 0;
        }
    }).then(function () {
        log.trace('uploadToPhonegap:create', user, project, uid);
        // create new app
        var method = q.denodeify(api.post);
        return method(url, getOptions(file, params));
    }).then(function (data) {
        return saveToMongo(data, key, user, project, uid);
    }, function (err) {
        log.error('uploadToPhonegap:error', user, project, uid, err);
        return q.reject(messages.convertPhonegapError(err));
    });
}

// Make tarbar
//
// key - String, authentication token
// path, String, path to temporary file
// user - String, user name
// project - String, project name
// uid - String, current user uid
// params - Object, build options
function makeTar(key, path, user, project, uid, params) {
    log.trace('makeTar', user, project, uid);
    var tmp = utils.tmp() + '.tar.gz';
    var cmd = 'tar czf ' + tmp + ' *';
    return exec(cmd, { cwd: path}).then(function () {
        return uploadToPhonegap(key, tmp, user, project, uid, params).fin(function () {
            fs.unlink(tmp);
        });
    }, function (err) {
        log.error('makeTar:error', user, project, uid, err);
        fs.unlink(tmp);
        return q.reject(err);
    });
}

// Get application information
//
// user - String, user name
// project - String, project name
// fs - String, file server for lxc project type
// uid - String, current user uid
exports.buildInfo = function (user, project, fs, uid) {
    log.trace('buildInfo', user, project, uid);
    var path = utils.projectPath(user, project, fs);
    return exists(path).then(function () {
        return q.reject('Project not found');
    }, function () {
        return mongo.findProject(user, project, uid);
    }).then(function (data) {
        if (!data) {
            return q.reject('No build information found');
        }
        return data.data;
    });
};

// Remove build information
//
// user - String, user name
// project - String, project name
// uid - String, current user uid
exports.removeBuild = function (user, project, uid) {
    log.trace('removeBuild', user, project, uid);
    return mongo.removeProject(user, project, uid);
};

// Build application
//
// user - String, user name
// project - String, project name
// fs - String, file server for lxc project type
// uid - String, current user uid
// key - String, authentication token
// params - Object, build options
exports.build = function (user, project, fs, uid, key, params) {
    log.trace('build', user, fs, project, uid);
    var path = utils.projectPath(user, project, fs);
    return exists(path).then(function () {
        return q.reject('Project not found');
    }, function () {
        return makeTar(key, path, user, project, uid, params);
    }).fail(function (err) {
        log.error('build:error', user, project, uid, err);
        // save error to mongo
        saveToMongo({error: err}, key, user, project, uid);
        return q.reject(err);
    });
};