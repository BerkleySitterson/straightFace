/**
 * @fileoverview This file contains the functions that handle the WebRTC functionality of the application.
 * 
 * @description Using the WebRTC API, users are able to connect and exchange data directly in the browser. They are guided through a series of offers and answers to establish
 * a peer connection. Once the connection is successfully made, the users are able to exchange data through a data channel. This includes audio, video, and chat messages.
 * 
 * @author Berkley Sitterson
 * 
 * @requires socket.io.js - https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.0/socket.io.js
 * 
 */

/**
 * @description Emits a socket event to send data to the signaling server on the backend.
 * @param {Object} msg - The message to be sent to the signaling server
 * @param {string} msg.name - The sender's ID
 * @param {string} msg.target - The target's ID
 * @param {string} msg.type - The type of message being sent (e.g., video-offer, video-answer, new-ice-candidate)
 * @param {RTCSessionDescription} msg.sdp - The session description protocol
 */
function sendToServer(msg) {
    socket.emit("data", msg);
}


/**
 * @description Once users have been paired, sets the current user ID, target ID, and creates a peer connection.
 * @param {Object} data - The data received from the signaling server
 * @param {string} data.myID - The current user's session ID
 * @param {string} data.targetID - The matched user's session ID
 */
function handlePairing(data) {
    myID = data['myID'];
    targetID = data['targetID'];

    createPeerConnection();
    localStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, localStream));
}

socket.on("users_paired", function(data) {
    handlePairing(data);
});


/**
 * @description Creates the peer connection and sets all needed event listeners (e.g. ICE candidates, negotiation, and data channels). The peer connection is created 
 * using the RTCPeerConnection API. The ICE servers are set to connect through a free Xirsys turn server. The data channel is created and event listeners are set for 
 * the data channel. The event listeners include: onicecandidate, onnegotiationneeded, ontrack, onopen, onmessage, and onerror.
 * @throws {Error} Throws an error if the peer connection cannot be created.
 */
function createPeerConnection() {

    console.log("Creating Peer Connection");
    myPeerConnection = new RTCPeerConnection({
        iceServers: [{
            urls: [ "stun:us-turn8.xirsys.com" ]
            }, {
            username: "VcPom22kSQlvPJ1FRMjb5qXw8-sSdYPFdhiLq3NMGzc-imBAUGSNLKmGhYnbKf_eAAAAAGTbqk9FcGlwaG9uZTE5OTY=",
            credential: "565fb534-3b8a-11ee-a7b9-0242ac140004",
            urls: [
            "turn:us-turn8.xirsys.com:80?transport=udp",
            "turn:us-turn8.xirsys.com:3478?transport=udp",
            "turn:us-turn8.xirsys.com:80?transport=tcp",
            "turn:us-turn8.xirsys.com:3478?transport=tcp",
            "turns:us-turn8.xirsys.com:443?transport=tcp",
            "turns:us-turn8.xirsys.com:5349?transport=tcp"
            ]
            }
        ],
    });

    const dataChannel = myPeerConnection.createDataChannel("chat");

    console.log(dataChannel.readyState);

    myPeerConnection.onicecandidate = handleICECandidateEvent;
    myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;

    myPeerConnection.addEventListener('track', async (event) => {

        let [remoteStream] = event.streams;
        tracksReceieved++;

        if (role === "funny") {
            seriousVideo.srcObject = remoteStream;
        } else {
            funnyVideo.srcObject = remoteStream;
            if (tracksReceieved === 2) {
                socket.emit("startingRound", room);
            }
        }
    });
} 


/**
 * @description Creates the initial offer and sends it to signaling server.
 */
function handleNegotiationNeededEvent() { // Create offer and send to signaling server on backend
    myPeerConnection
        .createOffer()
        .then((offer) => myPeerConnection.setLocalDescription(offer))
        .then(() => {
            sendToServer({
                name: myID,
                target: targetID,
                type: "video-offer",
                sdp: myPeerConnection.localDescription,
            });
        })
}


/**
 * @description Sends ICE candidate to signaling server.
 * @param {RTCPeerConnectionIceEvent} event The ICE candidate event
 */
function handleICECandidateEvent(event) { // Send ICE candidate to signaling server on backend
    if (event.candidate) {
        sendToServer({
        type: "new-ice-candidate",
        target: targetID,
        candidate: event.candidate,
        });
    }
}


/**
 * @description Recieves and adds the ICE candidate to the peer connection.
 * @param {Object} msg - The message received from the signaling server containing the ICE candidate
 */
function handleNewIceCandidateMsg(msg) {
    let candidate = new RTCIceCandidate(msg.candidate);      
    myPeerConnection.addIceCandidate(candidate);
}

socket.on("handleNewIceCandidateMsg", function(msg) {
    handleNewIceCandidateMsg(msg);
});


/**
 * @description Recieves the initial offer, sets myID and targetID, creates a peer connection, and sends back the answer.
 * @param {object} msg The sdp offer message received from the signaling server
 */
function handleVideoOfferMsg(msg) {    
    myID = msg.target;
    targetID = msg.name;
    
    createPeerConnection();

    const desc = new RTCSessionDescription(msg.sdp);
    
    myPeerConnection
        .setRemoteDescription(desc)
        .then(() => localStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, localStream)))
        .then(() => myPeerConnection.createAnswer())
        .then((answer) => myPeerConnection.setLocalDescription(answer))
        .then(() => {
        sendToServer({
            name: myID,
            target: targetID,
            type: "video-answer",
            sdp: myPeerConnection.localDescription,
            });
        })
}

socket.on("handleVideoOfferMsg", function(msg) {
    handleVideoOfferMsg(msg);
});


/**
 * @description Recieves the answer from the signaling server and sets the remote sdp description.
 * @param {object} msg The sdp object received from the signaling server
 */
function handleVideoAnswerMsg(msg) {
    const desc = new RTCSessionDescription(msg.sdp);
    myPeerConnection.setRemoteDescription(desc);  
}

socket.on("handleVideoAnswerMsg", function(msg) {
    handleVideoAnswerMsg(msg);
});