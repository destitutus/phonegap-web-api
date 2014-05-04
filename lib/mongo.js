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

var MongoClient = require('mongodb').MongoClient;
var q = require('q');
var config = require('../config');
var log = require('./logger')('mongo');
var _ = require('lodash');

var connection = null;
var pgpc = null;

exports.findProject = function (user, project, uid) {
    return phonegapProjectsCollection().then(function (projects) {
        var findOne = q.denodeify(projects.findOne.bind(projects));
        return findOne({user: user, project: project, uid: uid});
    });
};

exports.saveProject = function (user, project, uid, data) {
    return phonegapProjectsCollection().then(function (projects) {
        _.each(data.status, function (status, key) {
            if (status === null) {
                data.status[key] = 'error';
                data.error[key] = 'You must provide a signing key, first.';
            }
        });
        var update = q.denodeify(projects.update.bind(projects));
        return update({
            user: user, project: project, uid: uid
        }, {
            user: user, project: project, uid: uid, data: data
        }, {upsert: true}).then(function () {
            return data;
        });
    });
};

function phonegapProjectsCollection() {
    if (pgpc !== null) {
        return pgpc;
    }
    var deferred = q.defer();
    getDBConnection().then(function (db) {
        db.collection('phonegap_projects', function (err, collection) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(collection);
            }
        });
    });
    return pgpc = deferred.promise;
}

function getDBConnection() {
    if (connection !== null) {
        return connection;
    }
    var deferred = q.defer();
    MongoClient.connect(config.database.connection, function (err, db) {
        if (err || !db) {
            connection = null;
            pgpc = null;
            log.error('Connect to mongo failed: ', err);
            deferred.reject(err);
            return;
        }
        log.trace('Connect to mongo done');
        db.on('close', function () {
            log.debug('on mongo conn close');
            connection = null;
            pgpc = null;
        });
        deferred.resolve(db);
    });
    return connection = deferred.promise;
}
