'use strict';

const uuid = require('uuid');
const util = require('util');

const Prompt = 'fc@aliyun $ ';

var register = function(editor, docId, deviceId, userId, getOnlineUsers, updateOnlineUsers) {
  const ws = new WebSocket('ws://tl.mofangdegisn.cn:8080');
  var now = new Date();

  var reg = {
    method: 'GET',
    host: 'tl.mofangdegisn.cn:8080',
    querys: {
      'docId': docId,
      'userId': userId,
    },
    headers: {
      'x-ca-websocket_api_type': ['REGISTER'],
      'x-ca-seq': ['0'],
      'x-ca-nonce': [uuid.v4().toString()],
      'date': [now.toUTCString()],
      'x-ca-timestamp': [now.getTime().toString()],
      'CA_VERSION': ['1'],
    },
    path: '/r',
    body: '',
  };

  ws.onopen = function open() {
    console.log('open:');
    ws.send('RG#' + deviceId);
  };

  var registered = false;
  var registerResp = false;
  var hbStarted = false;

  ws.onmessage = function incoming(event) {
    console.log('data:', event.data);

    if (event.data.startsWith('NF#')) {
      var msg = JSON.parse(event.data.substr(3));
      editor.addHistory(
        util.format('%s (%s) %s',
                    Prompt, msg.from,
                    decodeURIComponent(msg.message.toString())));
      editor.setState({'prompt': Prompt});
      return;
    }

    if (!hbStarted && event.data.startsWith('RO#')) {
      console.log('login successfully');
      updateOnlineUsers(event.data.users);

      if (!registered) {
        registered = true;
        ws.send(JSON.stringify(reg));
      }

      hbStarted = true;
      setInterval(function() {
        ws.send('H1');
      }, 15*1000);

      setInterval(getOnlineUsers, 5*1000);
      return;
    }

    if (!registerResp) {
      registerResp = true;
      var msg = JSON.parse(event.data);
      msg = JSON.parse(msg.body);
      updateOnlineUsers(msg.users);
      return;
    }
  };

  ws.onclose = function(event) {
    console.log('ws closed:', event);
  };
};

module.exports = register;
