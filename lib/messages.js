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

exports.error = function (error) {
    var msg = JSON.stringify(error);
    if (msg.indexOf('"') === 0) {
        msg = msg.substring(1, msg.length - 1);
    }
    return JSON.stringify({code: 0, message: msg});
};

exports.success = function (data) {
    return JSON.stringify({code: 1, result: data});
};

exports.convertPhonegapError = function (error) {
    var err = error.message ? error.message : error;
    try {
        var msg = JSON.parse(err);
        return msg.error;
    }
    catch (e) {
        return err;
    }
};