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
var client = require('phonegap-build-api');
var messages = require('./messages');

//denodeify
var auth = q.denodeify(client.auth);

// Get information about user
//
// key - String, authentication token
exports.me = function (key) {
    return auth({token: key}).then(function (api) {
        var get = q.denodeify(api.get);
        return get('/me');
    }).fail(function (err) {
        return q.reject(messages.convertPhonegapError(err));
    });
};