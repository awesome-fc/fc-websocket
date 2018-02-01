'use strict';

const BUCKET = '<bucket>';
const WORK_DIR = 'fc-chat/';
const AG_NOTIFY_URL = '<url>';
const AG_APP_KEY = '<app key>';
const AG_APP_SECRET = '<app secret>';

var co = require('co');
var OSS = require('ali-oss');
var AG = require('aliyun-api-gateway').Client;

exports.register = function(event, context, callback) {
  console.log('event: %s', event);
  var evt = JSON.parse(event);

  var deviceId = evt['headers']['x-ca-deviceid'];
  var docId = evt['queryParameters']['id'];
  var ossClient = getOSSClient(context);

  var resp = {
    'isBase64Encoded': 'false',
    'statusCode': '200',
    'body': {
      'deviceId': deviceId,
      'docId': docId,
    },
  };

  co(function* () {
    var onlineUsers = yield getOnlineUsers(ossClient, docId);
    console.log('online users: %j', onlineUsers);
    onlineUsers[deviceId] = 'online';
    yield setOnlineUsers(ossClient, docId, onlineUsers);
    console.log('set online users: %j', onlineUsers);

    callback(null, resp);
  }).catch(function(err) {
    console.error(err);
    callback(err);
  });
};

exports.send = function(event, context, callback) {
  console.log('event: %s', event);
  var evt = JSON.parse(event);

  var deviceId = evt['queryParameters']['deviceid'];
  var docId = evt['queryParameters']['id'];
  var message = evt['queryParameters']['msg'];
  var agClient = new AG(AG_APP_KEY, AG_APP_SECRET);
  var ossClient = getOSSClient(context);

  var resp = {
    'isBase64Encoded': 'false',
    'statusCode': '200',
    'body': {
      'deviceId': deviceId,
      'docId': docId,
    },
  };

  co(function* () {
    var onlineUsers = yield getOnlineUsers(ossClient, docId);
    console.log('online users: %j', onlineUsers);

    var keys = Object.keys(onlineUsers);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] != deviceId) {
        var succ = yield notify(agClient, keys[i], deviceId, message);
        if (!succ) {
          delete onlineUsers[keys[i]];
        }
      }
    }
    yield setOnlineUsers(ossClient, docId, onlineUsers);
    callback(null, resp);
  }).catch(function(err) {
    console.error(err);
    callback(err);
  });
};

var getOnlineUsers = function* (ossClient, docId) {
  var usersKey = WORK_DIR + docId + '.json';
  var users = {};
  try {
    var resp = yield ossClient.get(usersKey);
    return JSON.parse(resp.content.toString());
  } catch (err) {
    // pass
  }

  return users;
};

var setOnlineUsers = function* (ossClient, docId, users) {
  var usersKey = WORK_DIR + docId + '.json';
  yield ossClient.put(usersKey, new Buffer(JSON.stringify(users)));
};

var notify = function* (agClient, deviceId, from, message) {
  try {
    var r = yield agClient.post(AG_NOTIFY_URL, {
      data: {
        from: from,
        message: message,
      },
      headers: {
        'x-ca-deviceid': deviceId,
      },
    });

    console.log('notify resp: %j', r);
  } catch (err) {
    console.log('notify error: %j', err);
    return false;
  }
  return true;
};

var getOSSClient = function(context) {
  return new OSS({
    accessKeyId: context.credentials.accessKeyId,
    accessKeySecret: context.credentials.accessKeySecret,
    stsToken: context.credentials.securityToken,
    region: 'oss-'+context.region,
    internal: true,
    secure: true,
    bucket: BUCKET,
  });
};
