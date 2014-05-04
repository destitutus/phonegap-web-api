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

//denodeify
var exists = q.denodeify(fs.exists);
var exec = q.denodeify(childProcess.exec);
var auth = q.denodeify(client.auth);

function saveToMongo(data, key, user, project, uid) {
    queue.publishTask(user, project, key, uid);
    return mongo.saveProject(user, project, uid, data);
}

function getOptions(file, params) {
    var keys = {};
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

function uploadToPhonegap(key, file, user, project, uid, params) {
    var appId;
    var api;
    var url = '/apps';
    return mongo.findProject(user, project, uid).then(function (item) {
        appId = item && item.data && item.data.id ? item.data.id : null;
        return auth({token: key});
    }).then(function (_api) {
        api = _api;
        if (appId) {
            var del = q.denodeify(api.del);
            return del(url + '/' + appId).fail(function (e) {
                return 0;
            });
        } else {
            return 0;
        }
    }).then(function () {
        var method = q.denodeify(api.post);
        return method(url, getOptions(file, params));
    }).then(function (data) {
        return saveToMongo(data, key, user, project, uid);
    }, function (err) {
        return q.reject(messages.convertPhonegapError(err));
    });
}

function makeTar(key, path, user, project, uid, params) {
    var tmp = utils.tmp() + '.tar.gz';
    var cmd = 'tar czf ' + tmp + ' *';
    return exec(cmd, { cwd: path}).then(function () {
        return uploadToPhonegap(key, tmp, user, project, uid, params).fin(function () {
            fs.unlink(tmp);
        });
    }, function (err) {
        fs.unlink(tmp);
        return q.reject(err);
    });
}

exports.buildInfo = function (user, project, uid) {
    var path = utils.projectPath(user, project);
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

exports.build = function (user, project, uid, key, params) {
    var path = utils.projectPath(user, project);
    return exists(path).then(function () {
        return q.reject('Project not found');
    }, function () {
        return makeTar(key, path, user, project, uid, params);
    }).fail(function (err) {
        saveToMongo({error: err}, key, user, project, uid);
        return q.reject(err);
    });
};