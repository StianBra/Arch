// jscs:disable validateIndentation
(function(scope) {
    "use strict";


    var RtcSessionEventHandler = function (callManagerCall, rtcSession) {
        this.call = callManagerCall;
        this.rtcSession = rtcSession;
    };

    /**
     *
     * @param {SessionState} sessionState
     */
    RtcSessionEventHandler.prototype.onStateChange = function (sessionState) {
        // unused
    };

    RtcSessionEventHandler.prototype.onDestroy = function () {
        // unused
    };

    RtcSessionEventHandler.prototype.onRemoteStreamAdded = function (stream) {
        /* The peer will send a stream
         to us on that stream object. You can obtain the stream URL via
         window.URL.createObjectURL(stream) or you can attach the player via the
         attachToStream() polyfill function
         stream - the stream object to which a player should be attached
         */
        this.call.onRemoteStreamAdded(this.rtcSession, stream);
    };

    RtcSessionEventHandler.prototype.onRemoteStreamRemoved = function () {
        //  The peer's stream is about to be removed.
        this.call.onRemoteStreamRemoved(this.rtcSession);
    };

    RtcSessionEventHandler.prototype.onRemoteMute = function (stream) {
        this.call.onRemoteMute();
    };

    /**
     *  Called when network quality for this session changes.
     *
     * @param {Number} q
     */
    RtcSessionEventHandler.prototype.onPeerNetworkQualityChange = function(q) {
        var sess = this.rtcSession;
        var peerId = base64urlencode(sess.peer);
        var clientId = base64urlencode(sess.peerClient);
        var sid = base64urlencode(sess.sid);
        var idx = peerId + ":" + clientId + ":" + sid;
        var call = this.call;
        if (call && (call.peerQuality[idx] !== q)) {
            call.peerQuality[idx] = q;
            call.room.trackDataChange();
        }
    };

    /**
     * Called on level change of the remote audio level.
     *
     * @param {Number} level 0-100
     */
    RtcSessionEventHandler.prototype.onAudioLevelChange = function(level) {
        var sess = this.rtcSession;
        var peerId = base64urlencode(sess.peer);
        var clientId = base64urlencode(sess.peerClient);
        var sid = base64urlencode(sess.sid);
        var idx = peerId + ":" + clientId + ":" + sid;

        if (this.call) {
            // call ended?
            call.trigger('onAudioLevelChange', [idx, level]);
        }
    };

    var RtcGlobalEventHandler = function (megaChat) {
        var self = this;
        self.megaChat = megaChat;
    };

    var webrtcCalculateSharedKey = function webrtcCalculateSharedKey(peer) {
        var pubKey = pubCu25519[base64urlencode(peer)];
        if (!pubKey) {
            throw new Error("webrtcCalculateSharedKey: pubCu25519 key not loaded for user", base64urlencode(peer));
        }
        var sharedSecret = nacl.scalarMult(
            asmCrypto.string_to_bytes(u_privCu25519),
            asmCrypto.string_to_bytes(pubKey)
        );

        // Taken from strongvelope deriveSharedKey()
        // Equivalent to first block of HKDF, see RFC 5869.
        var hmac = asmCrypto.HMAC_SHA256.bytes;
        return asmCrypto.string_to_bytes(
            asmCrypto.bytes_to_string(
                hmac("webrtc pairwise key\x01", hmac(sharedSecret, ''))
            ).substring(0, 16));
    };

    RtcGlobalEventHandler.CRYPTO_HELPERS = {
        encryptNonceTo: function (peerHandle, nonce256) {
            assert(nonce256 && nonce256.length === 32, "encryptNonceTo: nonce length is not 256 bits");
            var key = webrtcCalculateSharedKey(peerHandle);
            var clearText = asmCrypto.string_to_bytes(nonce256);
            return asmCrypto.bytes_to_string(
                asmCrypto.AES_ECB.encrypt(clearText, key, false));
        },
        decryptNonceFrom: function (peerHandle, encNonce256) {
            assert(encNonce256 && encNonce256.length === 32, "decryptNonceFrom: encrypted nonce is not 256 bits");
            var key = webrtcCalculateSharedKey(peerHandle);
            var cipherData = asmCrypto.string_to_bytes(encNonce256);
            return asmCrypto.bytes_to_string(
                asmCrypto.AES_ECB.decrypt(cipherData, key, false));
        },
        mac: function (msg, key) {
            // use the SDK's base64 alphabet, it is also safer for using in URLs
            return asmCrypto.bytes_to_string(asmCrypto.HMAC_SHA256.bytes(msg, key));
        },
        random: function (count) {
            var array = new Uint8Array(count);
            var result = '';
            window.crypto.getRandomValues(array);
            for (var i = 0; i < count; i++) {
                result += String.fromCharCode(array[i]);
            }
            return result;
        },
        ownAnonId: function () {
            var H = asmCrypto.SHA256.bytes;
            return asmCrypto.bytes_to_string(H(u_handle + H(u_privk + "webrtc stats collection"))).substr(0, 8);
        }
    };

    /**
     * called when an incoming call request is received,
     *
     * @param {Call} call
     * @param {String} fromUser base64urldecoded user handle of the call initiator
     * @returns {RtcCallEventHandler}
     */
    RtcGlobalEventHandler.prototype.onCallIncoming = function (call, fromUser, replacedCall, avAutoAnswer) {
        var callManager = this.megaChat.plugins.callManager;
        var chatRoom = self.megaChat.getChatById(base64urlencode(call.chatid));
        if (!chatRoom) {
            if (d) {
                console.error("Can't find chat for incoming call: ", call);
                return false;
            }
        }

        var callManagerCall = callManager.registerCall(chatRoom, call, fromUser);
        callManagerCall.setState(CallManagerCall.STATE.WAITING_RESPONSE_INCOMING);

        if (avAutoAnswer != null) {
            return callManagerCall;
        }
        callManager.trigger('WaitingResponseIncoming', [callManagerCall]);
        return callManagerCall;
    };

    RtcGlobalEventHandler.prototype.isGroupChat = function(chatId) {
        var chatRoom = this.megaChat.getChatById(base64urlencode(chatId));
        assert(chatRoom, "RtcGlobalEventHandles.isGroupChat: chatroom with specified chatid not found,",
            "this should never happen");
        return (chatRoom.type === "group" || chatRoom.type === "public");
    };
    RtcGlobalEventHandler.prototype.get1on1RoomPeer = function(chatid) {
        chatid = base64urlencode(chatid);
        var room = megaChat.getChatById(chatid);
        if (!room) {
            throw new Exception('Chatroom with id', chatid, 'not found');
        }
        return base64urldecode(room.getParticipantsExceptMe()[0]);
    };

    RtcGlobalEventHandler.prototype.onClientJoinedCall = function(chatId, userid, clientid) {
        var self = this;
        var chatRoom = self.megaChat.getChatById(base64urlencode(chatId));
        if (chatRoom) {
            chatRoom.trigger(
                'onCallParticipantsUpdated',
                [
                    base64urlencode(userid),
                    base64urlencode(clientid)
                ]
            );
            chatRoom.trigger('onClientJoinedCall', {userId: userid, clientId: clientid});
        }
    };

    RtcGlobalEventHandler.prototype.onClientLeftCall = function(chatId, userid, clientid) {
        var self = this;
        var chatRoom = self.megaChat.getChatById(base64urlencode(chatId));
        if (chatRoom) {
            chatRoom.trigger(
                'onCallParticipantsUpdated',
                [
                    base64urlencode(userid),
                    base64urlencode(clientid)
                ]
            );
            chatRoom.trigger('onClientLeftCall', {userId: userid, clientId: clientid});
        }
    };
    RtcGlobalEventHandler.prototype.onClientAvChange = function() {};

    RtcGlobalEventHandler.prototype.onOwnNetworkQualityChange = function(quality) {
        this.megaChat.networkQuality = quality;
        if (this.megaChat.activeCallManagerCall) {
            this.megaChat.activeCallManagerCall.room.trackDataChange();
        }
    };

    /**
     * Called if there is no audio for > 10s after the call had started.
     */
    RtcGlobalEventHandler.prototype.onNoInputAudioDetected = function() {
        showToast("warning", "We'd detected that your audio is not working. Please check your mic.");
    };


    scope.RtcGlobalEventHandler = RtcGlobalEventHandler;
    scope.RtcSessionEventHandler = RtcSessionEventHandler;
})(window);
