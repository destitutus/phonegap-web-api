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

var _ = require('lodash');
var uuid = require('node-uuid');
var config = require('../config');

// make string form template
// text - String, template string
// data - Object, template parameters
var template = module.exports.template = function (text, data) {
    return _.template(text, data, {
        interpolate: /{{([\s\S]+?)}}/g
    });
};

// Escape names
//
// value - String, data for escape
exports.escape = function (value) {
    return (value || '').replace(/[^a-z0-9]/gi, '-').toLowerCase();
};

// Get project path
// user - String, user name
// project - String, project name
// fs - String, file server for lxc project type
exports.projectPath = function (user, project, fs) {
    user = exports.escape(user);
    project = exports.escape(project);
    var params = {
        user: user,
        project: project,
        fs: fs
    };
    if (fs && fs !== 'old') {
        return template(config.fs.lxcProject, params);
    } else {
        return template(config.fs.project, params);
    }
};

// Get tmp file path
exports.tmp = function () {
    var params = {
        file: uuid.v4()
    };
    return template(config.fs.tmp, params);
};