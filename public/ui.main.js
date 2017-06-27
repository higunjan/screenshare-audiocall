function getElement(selector) {
    return document.querySelector(selector);
}

var main = getElement('.main');

function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
}

function addNewMessage(args) {
    var newMessageDIV = document.createElement('div');
    newMessageDIV.className = 'new-message';

    var userinfoDIV = document.createElement('div');
    userinfoDIV.className = 'user-info';
    userinfoDIV.innerHTML = args.userinfo || '<img src="images/user.png">';

    userinfoDIV.style.background = args.color || rtcMultiConnection.extra.color || getRandomColor();

    newMessageDIV.appendChild(userinfoDIV);

    var userActivityDIV = document.createElement('div');
    userActivityDIV.className = 'user-activity';

    userActivityDIV.innerHTML = '<h2 class="header">' + args.header + '</h2>';

    var p = document.createElement('p');
    p.className = 'message';
    userActivityDIV.appendChild(p);
    p.innerHTML = args.message;

    newMessageDIV.appendChild(userActivityDIV);

    main.insertBefore(newMessageDIV, main.firstChild);

    userinfoDIV.style.height = newMessageDIV.clientHeight + 'px';

    if (args.callback) {
        args.callback(newMessageDIV);
    }

    // document.querySelector('#message-sound').play();
}

main.querySelector('#your-name').onkeyup = function(e) {
    if (e.keyCode != 13) return;
    main.querySelector('#continue').onclick();
};

main.querySelector('#room-name').onkeyup = function(e) {
    if (e.keyCode != 13) return;
    main.querySelector('#continue').onclick();
};

main.querySelector('#room-name').value = (Math.random() * 1000).toString().replace('.', '');
if(localStorage.getItem('user-name')) {
    main.querySelector('#your-name').value = localStorage.getItem('user-name');
}

main.querySelector('#continue').onclick = function() {
    var yourName = this.parentNode.querySelector('#your-name');
    var roomName = this.parentNode.querySelector('#room-name');
    
    if(!roomName.value || !roomName.value.length) {
        roomName.focus();
        return alert('Your MUST Enter Room Name!');
    }
    
    localStorage.setItem('room-name', roomName.value);
    localStorage.setItem('user-name', yourName.value);
    
    yourName.disabled = roomName.disabled = this.disabled = true;

    var username = yourName.value || 'Anonymous';

    rtcMultiConnection.extra = {
        username: username,
        color: getRandomColor()
    };

    addNewMessage({
        header: username,
        message: 'Searching for existing rooms...',
        userinfo: '<img src="images/action-needed.png">'
    });
    
    var roomid = main.querySelector('#room-name').value;
    rtcMultiConnection.channel = roomid;

    var websocket = new WebSocket(SIGNALING_SERVER);
    websocket.onmessage = function(event) {
        var data = JSON.parse(event.data);
        console.log("websocket.onmessage", data);
        if (data.isChannelPresent == false) {
            addNewMessage({
                header: username,
                message: 'No room found. Creating new room...<br /><br />You can share following room-id with your friends: <input type=text value="' + roomid + '">',
                userinfo: '<img src="images/action-needed.png">'
            });

            rtcMultiConnection.userid = roomid;
            rtcMultiConnection.open({
                dontTransmit: true,
                sessionid: roomid
            });
        } else {
            addNewMessage({
                header: username,
                message: 'Room found. Joining the room...',
                userinfo: '<img src="images/action-needed.png">'
            });
            rtcMultiConnection.join({
                sessionid: roomid,
                userid: roomid,
                extra: {},
                session: rtcMultiConnection.session
            });
        }
    };
    websocket.onopen = function() {
        websocket.send(JSON.stringify({
            checkPresence: true,
            channel: roomid
        }));
    };
};

function getUserinfo(blobURL, imageURL) {
    return blobURL ? '<video src="' + blobURL + '" autoplay controls></video>' : '<img src="' + imageURL + '">';
}

var isShiftKeyPressed = false;

getElement('#allow-screen').onclick = function() {
    this.disabled = true;
    var session = { screen: true };

    rtcMultiConnection.captureUserMedia(function(stream) {
        var streamid = rtcMultiConnection.token();
        rtcMultiConnection.customStreams[streamid] = stream;

        rtcMultiConnection.sendMessage({
            hasScreen: true,
            streamid: streamid,
            session: session
        });
    }, session);

    var session1 = { audio: true };

    rtcMultiConnection.captureUserMedia(function(stream) {
        var streamid = rtcMultiConnection.token();
        rtcMultiConnection.customStreams[streamid] = stream;

        rtcMultiConnection.sendMessage({
            hasMic: true,
            streamid: streamid,
            session: session1
        });
    }, session1);
};
function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Bytes';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}
