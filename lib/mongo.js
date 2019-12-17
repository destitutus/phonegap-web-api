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

var MongoClient = require('mongodb').MongoClient;
var config = require('../config');
var log = require('./logger')('mongo');
var _ = require('lodash');

var connection = null;

// get active database connection
async function getDBConnection() {
    if (connection === null) {
        try {
            const db = await MongoClient.connect(config.database.connection)
            const dbo = db.db('acv2');
            log.trace('Connect to mongo done');
            connection = dbo
            db.on('close', function () {
                log.debug('on mongo conn close');
                connection = null;
            });
        } catch (err) {
            connection = null;
            log.error('Connect to mongo failed: ', err);
            throw err
        }
    }
    return connection;
}

// get phonegap project collection
async function phonegapProjectsCollection() {
    const db = await getDBConnection()
    return db.collection('phonegap_projects')
}

// Search project in database
//
// user - String, user name
// project - String, project name
// uid - String, current user uid
exports.findProject = async function (user, project, uid) {
    const projects = await phonegapProjectsCollection();
    return projects.findOne({ user: user, project: project, uid: uid });
};

// Remove project from database
//
// user - String, user name
// project - String, project name
// uid - String, current user uid
exports.removeProject = async function (user, project, uid) {
    const projects = await phonegapProjectsCollection();
    return projects.remove({ user: user, project: project, uid: uid });
};

// Save project data to database
//
// user - String, user name
// project - String, project name
// uid - String, current user uid
// data - Object, data for save
exports.saveProject = async function (user, project, uid, data) {
    const projects = await phonegapProjectsCollection();
    _.each(data.status, function (status, key) {
        if (status === null) {
            data.status[key] = 'error';
            data.error[key] = 'You must provide a signing key, first.';
        }
    });
    await projects.updateOne({ user: user, project: project, uid: uid },
        {'$set':
            {
                user: user, project: project, uid: uid, data: data
            }
        },
        { upsert: true }
    );
    return data;
};
