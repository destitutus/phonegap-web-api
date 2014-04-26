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

var q = require('q');
var fs = require('fs');
var utils = require('./utils');
var child_process = require('child_process');
var client = require('phonegap-build-api');
var messages = require('./messages');
var queue = require('./queue');
var mongo = require('./mongo');

//denodeify
var exists = q.denodeify(fs.exists);
var exec = q.denodeify(child_process.exec);
var auth = q.denodeify(client.auth);

function saveToMongo(data, key, user, project) {
    queue.publishTask(user, project, key, 'check');
    return mongo.saveProject(user, project, data).then(function () {
        return data;
    });
}

function uploadToPhonegap(key, file, user, project) {
    console.log('uploadToPhonegap:1');
    var projectData;
    return mongo.findProject(user, project).then(function(item) {
        console.log('uploadToPhonegap:2');
        projectData = item;
        return auth({token: key});
    }).then(function (api) {
        console.log('uploadToPhonegap:3', projectData);
        var options = {
            form: {
                data: {
                    title: 'My App',
                    create_method: 'file',
                    private: false
                },
                file: file
            }
        };
        var appId = projectData && projectData.data && projectData.data.id ? projectData.data.id : null;
        var method;
        var url = '/apps';
        if (appId) {
            method = q.denodeify(api.put);
            url += '/' + appId;
        } else {
            method = q.denodeify(api.post);
        }
        console.log('appId', appId, 'url', url);
        return method(url, options).then(function (data) {
            return saveToMongo(data, key, user, project);
        }, function (e) {
            return q.reject(messages.convertPhonegapError(e));
        });
    }, function (e) {
        return q.reject(messages.convertPhonegapError(e));
    });
}

function makeTar(key, path, user, project) {
    var tmp = utils.tmp() + '.tar.gz';
    var cmd = 'tar czf ' + tmp + ' *';
    return exec(cmd, { cwd: path}).then(function () {
        return uploadToPhonegap(key, tmp, user, project).fin(function() {
            fs.unlink(tmp);
        });
    }, function (err) {
        fs.unlink(tmp);
        return q.reject(err);
    });
}

exports.build = function (user, project, key) {
    var path = utils.projectPath(user, project);
    return exists(path).then(function () {
        return q.reject('Project not found');
    }, function () {
        return makeTar(key, path, user, project);
    });
};