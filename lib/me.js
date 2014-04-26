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
var client = require('phonegap-build-api');
var messages = require('./messages');

exports.me = function (key) {
    var deferred = q.defer();
    client.auth({ token: key }, function(e, api) {
        if (e) {
            deferred.reject(messages.convertPhonegapError(e));
        } else {
            api.get('/me', function(e, data) {
                if (e) {
                    deferred.reject(messages.convertPhonegapError(e));
                } else {
                    deferred.resolve(data);
                }
            });
        }
    });
    return deferred.promise;
};