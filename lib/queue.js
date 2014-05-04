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

var amqp = require('amqp');
var config = require('../config');
var q = require('q');
var domain = require('domain');
var mongo = require('./mongo');
var client = require('phonegap-build-api');
var auth = q.denodeify(client.auth);
var _ = require('lodash');
var messages = require('./messages');

var connection = null;
var exchange = null;

function processMessage(msg) {
    var user = msg.user;
    var project = msg.project;
    var key = msg.key;
    var uid = msg.uid;
    var appId;
    return mongo.findProject(user, project, uid).then(function (data) {
        if (!data || !data.data || !data.data.id) {
            return q.reject('Not found');
        }
        appId = data.data.id;
        return auth({token: key});
    }).then(function (api) {
        var get = q.denodeify(api.get);
        return get('/apps/' + appId);
    }).then(function (data) {
        var hasPending = false;
        _.each(data.status, function (status, key) {
            if (status === 'pending') {
                hasPending = true;
            }
        });
        if (hasPending) {
            exports.publishTask(user, project, key, uid);
        }
        return mongo.saveProject(user, project, uid, data);
    }).fail(function (err) {
        var msg = messages.convertPhonegapError(err);
        mongo.saveProject(user, project, uid, {error: msg});
        return q.reject(msg);
    });
}

function initQueues(connenction) {
    var optsTask = config.rabbitmq.tasks;
    connenction.queue(optsTask.name, optsTask, function (queue) {
        queue.subscribe({
            ack: true,
            prefetchCount: 10
        }, function (msgs, headers, deliveryInfo, ack) {
            var d = domain.create();
            var done = function () {
                done = function () {};
                ack.acknowledge(false);
                d.dispose();
            };
            d.on('error', done);
            d.run(function () {
                processMessage(msgs).fin(done);
            });
        });
    });

    var def = q.defer();
    exchange = def.promise;
    var optsAutoTask = config.rabbitmq.autoTasks;
    connenction.exchange(optsAutoTask.name, optsAutoTask, function (ex) {
        def.resolve(ex);
    });
}

exports.publishTask = function (user, project, key, uid) {
    exchange.then(function (ex) {
        var msg = {
            uid: uid,
            user: user,
            project: project,
            key: key
        };
        ex.publish('#', msg, {contentType: 'application/json'});
    });
};

exports.start = function () {
    var def = q.defer();
    connection = def.promise;
    var conn = amqp.createConnection(config.rabbitmq)
        .once('ready', function () {
            initQueues(conn);
            def.resolve(conn);
        }).once('error', def.reject);
};