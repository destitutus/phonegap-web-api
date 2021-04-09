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

var amqp = require('amqplib');
const util = require('util');
var config = require('../config');
var q = require('q');
var mongo = require('./mongo');
var client = require('phonegap-build-api');
var auth = util.promisify(client.auth);
var _ = require('lodash');
var log = require('./logger')('queue');

var exchange = null;

// process queue message
//
// msg - Object, message
async function processMessage(msg) {
    var user = msg.user;
    var project = msg.project;
    var key = msg.key;
    var uid = msg.uid;
    log.trace('processMessage', user, project, uid);
    const currentData = await mongo.findProject(user, project, uid)
    if (!currentData || !currentData.data || !currentData.data.id) {
        throw new Error('Not found');
    }
    const appId = currentData.data.id;
    // try {
        const api = await auth({token: key});
        log.trace('processMessage:get info', user, project, uid);
        var get = util.promisify(api.get);
        log.trace(`processMessage1 /apps/${appId}`);
        const data = await get(`/apps/${appId}`);
        log.trace('processMessage2', user, project, uid);
        var hasPending = false;
        _.each(data.status, function (status) {
            if (status === 'pending') {
                hasPending = true;
            }
        });
        log.trace('processMessage3', user, project, uid);
        if (hasPending) {
            // has pending builds, publish task again
            exports.publishTask(user, project, key, uid);
        }
        log.trace('processMessage4', user, project, uid);
        log.trace('processMessage:save data', user, project, uid);
        await mongo.saveProject(user, project, uid, data);
    // } catch (err) {
    //     log.trace('processMessage:error', user, project, uid, err.message);
    //     // save error state
    //     var msg = messages.convertPhonegapError(err.message);
    //     await mongo.saveProject(user, project, uid, {error: msg, id: appId})
    //     throw new Error(msg);
    // }
}

// Init queues
//
// connection - Object, active rmq connection
function initQueues(connection) {
    var optsTask = config.rabbitmq.tasks;
    var optsAutoTask = config.rabbitmq.autoTasks;
    log.debug('initQueues')
    var def = q.defer();
    exchange = def.promise;

    connection.createChannel().then(function (ch) {
        async function phonegapMessages(msg) {
            try {
                var message = JSON.parse(msg.content.toString());
                await processMessage(message);
            } catch (err) {
                log.error(`can't process ${err.message}`)
            }
            ch.ack(msg);
        }
        var ok = ch.assertQueue(optsTask.name, optsTask);
        ok = ok.then(function (qok) {
            return ch.prefetch(30).then(function () {
                return qok.queue;
            });
        });
        ok = ok.then(function (queue) {
            return ch.consume(queue, phonegapMessages, {noAck: false});
        });
    });

    connection.createChannel().then(function (ch) {
        var ok = ch.assertExchange(optsAutoTask.name, optsAutoTask.type, optsAutoTask);
        ch.on('close', function () {
            def.reject();
        });
        return ok.then(function () {
            def.resolve(ch);
        });
    });
}

// Publish delayed task
//
// user - String, user name
// project - String, project name
// key - String, authentication token
// uid - String, current user uid
exports.publishTask = function (user, project, key, uid) {
    log.debug(`publishTask ${user}, ${project}`)
    exchange.then(function (ex) {
        var optsAutoTask = config.rabbitmq.autoTasks;
        var msg = {
            uid: uid,
            user: user,
            project: project,
            key: key
        };
        ex.publish(optsAutoTask.name, '#', new Buffer(JSON.stringify(msg)), {contentType: 'application/json'});
    });
};

function makeAmqpUri(options) {
    const protocol = options.ssl ? 'amqps://' : 'amqp://';
    return [protocol, encodeURIComponent(options.login), ':', encodeURIComponent(options.password), '@',
        encodeURIComponent(options.host), ':', options.port, '/', encodeURIComponent(options.vhost),
        '?heartbeat=', options.heartbeat
    ].join('');
}

// Start listen queue for process delayed messages
exports.start = async function () {

    function reconnect(msg) {
        log.warn('reconnect', msg);
        setTimeout(function () {
            exports.start();
        }, 5000);
    }

    var uri = makeAmqpUri(config.rabbitmq);
    log.debug(uri)
    try {
        const conn = await amqp.connect(uri);
        log.debug('connect!');
        conn.on('close', function () {});
        conn.on('error', reconnect);
        return initQueues(conn);
    } catch (err) {
        reconnect(err.message)
        return
    }
};