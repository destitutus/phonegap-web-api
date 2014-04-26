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

var _ = require('lodash');
var uuid = require('node-uuid');
var config = require('../config');

var template = module.exports.template = function (text, data) {
    return _.template(text, data, {
        interpolate: /{{([\s\S]+?)}}/g
    });
};

exports.escape = function (value) {
    return (value || '').replace(/[^a-z0-9]/gi, '-').toLowerCase();
};

exports.projectPath = function (user, project) {
    user = exports.escape(user);
    project = exports.escape(project);
    var params = {
        user: user,
        project: project
    };
    return template(config.fs.project, params);
};

exports.tmp = function () {
    var params = {
        file: uuid.v4()
    };
    return template(config.fs.tmp, params);
};