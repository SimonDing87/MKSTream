angular.module('utils.webRTC', ['utils.fileReader'])

.factory('webRTC', ['$http', 'fileReader', function($http, fileReader) {
  /**
   * user uploaded file
   * retrieve file & convert it to binary
   **/
  var webRTCObj = {};

  webRTCObj.createPeer = function() {
    var peer = new Peer({　
      host: 'mkstream.herokuapp.com',
      secure: true,
      port: 443,
      config: {
        'iceServers': [
          {url: 'stun:stun01.sipphone.com'}, 
          {url: 'stun:stun.ekiga.net'}, 
          {url: 'stun:stun.fwdnet.net'}, 
          {url: 'stun:stun.ideasip.com'}, 
          {url: 'stun:stun.iptel.org'}, 
          {url: 'stun:stun.rixtelecom.se'}, 
          {url: 'stun:stun.schlund.de'}, 
          {url: 'stun:stun.l.google.com:19302'}, 
          {url: 'stun:stun1.l.google.com:19302'}, 
          {url: 'stun:stun2.l.google.com:19302'}, 
          {url: 'stun:stun3.l.google.com:19302'}, 
          {url: 'stun:stun4.l.google.com:19302'}, 
          {url: 'stun:stunserver.org'}, 
          {url: 'stun:stun.softjoys.com'}, 
          {url: 'stun:stun.voiparound.com'}, 
          {url: 'stun:stun.voipbuster.com'}, 
          {url: 'stun:stun.voipstunt.com'}, 
          {url: 'stun:stun.voxgratia.org'}, 
          {url: 'stun:stun.xten.com'}
          ]
      },
      debug: 3
    });

    webRTCObj.heartBeat(peer);

    return peer;

  };

  webRTCObj.heartBeat = function(peer) {
    var alive = true;
    var makeHeartbeat = function() {
      if (alive) {
        setTimeout(makeHeartbeat, 20000);
        if (peer.socket._wsOpen()) {
          peer.socket.send({type: 'HEARTBEAT'});
        }
      }
    };
    makeHeartbeat();
    return {
      start: function() {
        alive = true;
        makeHeartbeat();
      },
      stop: function() {
        alive = false;
      }
    };
  };


  webRTCObj.getUsers = function() {
    return $http({
      method: 'GET',
      url: '/api/webrtc/users'
    });
  };
  //TODO:need an event listener for every time a file is added to send that file

  webRTCObj.connectToPeer = function(caller, targetId) {
    var conn = caller.connect(targetId);
    return conn;
  };

  webRTCObj.sendData = function(conn, obj) {
    conn.send(obj);
  };

  webRTCObj.sendDataInChunks = function(conn, obj) {
    console.log('preparing send');
    var chunker = function(details, name) {
      console.log('starting chunker');
      var chunkSize = 16384;
      var slice = details.file.slice(details.offset, details.offset + chunkSize);
      fileReader.readAsArrayBuffer(slice, details.scopeRef)
        .then(function(buff) {
          var packet = {
            chunk: buff,
            type: 'file-chunk',
            count: details.count,
            id: details.id
          };
          if (details.count === 0) {
            packet.name = name;
            packet.size = details.size;
          } else if (details.offset + chunkSize > details.size) {
            packet.last = true;
          }
          details.conn.send(packet);
          console.log('chunk sent');
          details.count++;
          if (details.size > details.offset + chunkSize) {
            details.offset += chunkSize;
            window.setTimeout(function(details) {
              chunker(details);
            }, 0, details);
          } else {
            console.log('File finished sending!');
          }
        });
    };
    chunker({
      id: obj.id,
      count: 0,
      offset: 0,
      size: obj.size,
      conn: conn,
      file: obj.file,
      scopeRef: obj.scopeRef
    }, obj.name);
  };

  webRTCObj.clearQueue = function(files, conn){
    for(var i = 0; i < files.length; i++){
      files[i].beenSent = true;
      conn.send({
        name: files[i].name,
        size: files[i].size,
        type: 'file-offer'
      });
    }
  }

  return webRTCObj;

}]);