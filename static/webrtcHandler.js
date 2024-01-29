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

var localStream;
var tracksReceieved = 0;
var countdownInterval;
var detectionInterval;
var remoteUsername;
var myID;
var targetID;
var room;

const protocol = window.location.protocol;
const socket = io(protocol + '//' + document.domain + ':' + location.port, {autoConnect: true});
const mediaConstraints = { audio: true, video: true };
const funnyVideo = document.getElementById("funnyVideo");
const seriousVideo = document.getElementById("seriousVideo");
const searchBtn = document.getElementById("searchBtn");
const screenShareBtn = document.getElementById("screenShareBtn");

/**
 * Emits a socket event to send data to the signaling server on the backend.
 * 
 * @param {Object} msg - The message to be sent to the signaling server
 * @param {string} msg.name - The sender's ID
 * @param {string} msg.target - The target's ID
 * @param {string} msg.type - The type of message being sent (e.g., video-offer, video-answer, new-ice-candidate)
 * @param {RTCSessionDescription} msg.sdp - The session description protocol
 * 
 * @fires {Socket.IO} data event - Sends the msg object through the 'data' socket event, which will be handled by handleSignaling() in Flask
 */
function sendToServer(msg) {
    socket.emit("data", msg);
}


/**
 * @description Once users have been paired, sets the current user ID, target ID, and creates a peer connection.
 * 
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
 * @description Creates the peer connection and sets all needed event listeners (e.g. ICE candidates, negotiation, and data channels). The peer connection is created using the RTCPeerConnection API. The ICE servers are set to connect through a free Xirsys turn server. The data channel is created 
 * and event listeners are set for the data channel. The event listeners include: onicecandidate, onnegotiationneeded, ontrack, onopen, onmessage, and onerror.
 * 
 * @throws {Error} Throws an error if the peer connection cannot be created.
 */
function createPeerConnection() { // Create peer connection and set event listeners

    try {
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
            const [remoteStream] = event.streams;
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

        console.log("Adding message event listener to DataChannel '" + dataChannel.label + "'");
        dataChannel.onmessage = (event) => {
            console.log("Message from DataChannel");
            const message = event.data;
            let ul = document.getElementById("chat-messages");
            let li = document.createElement("li");
            li.style.listStyleType = "none";
            li.appendChild(document.createTextNode(remoteUsername + ": " + message));
            ul.appendChild(li);
            ul.scrollTop = ul.scrollHeight;
            console.log("Message from DataChannel " + dataChannel.label + " received: " + message);
        };

        document.getElementById("message").addEventListener("keyup", function(event) {
            if (event.key === "Enter") {
                let message = document.getElementById("message").value;
                let ul = document.getElementById("chat-messages");
                let li = document.createElement("li");
                li.style.listStyleType = "none";
                li.appendChild(document.createTextNode("You: " + message));
                ul.appendChild(li);
                ul.scrollTop = ul.scrollHeight;

                dataChannel.send(message);
                document.getElementById("message").value = "";
                console.log("Message sent: " + message + " to DataChannel " + dataChannel.label);
            }
        });

        dataChannel.addEventListener('open', () => {
            console.log('Data channel is open and ready to use!');
            });

        dataChannel.onerror = (error) => {
            console.error("Data channel error: " + error);
        };
    } catch (e) {
        console.log("Error creating peer connection: " + e.toString());
    }
}

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

function handleICECandidateEvent(event) { // Send ICE candidate to signaling server on backend

    if (event.candidate) {
        sendToServer({
        type: "new-ice-candidate",
        target: targetID,
        candidate: event.candidate,
        });
    }
}

socket.on("handleNewIceCandidateMsg", function(msg) {
    
    const candidate = new RTCIceCandidate(msg.candidate);      
    myPeerConnection.addIceCandidate(candidate);
});

socket.on("handleVideoOfferMsg", function(msg) { // Setting remote description and creating answer
    
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
});

socket.on("handleVideoAnswerMsg", function(msg) {

    let desc = new RTCSessionDescription(msg.sdp);
    myPeerConnection.setRemoteDescription(desc);
});

// ---------- Video-Chat ---------- //

document.getElementById("disconnectBtn").addEventListener("click", function() { 
    socket.emit("disconnect_user", room);
});

document.getElementById("backBtn").addEventListener("click", function() { 
    socket.emit("leave_video_chat", room);
});


socket.on("user_left", function() { // User has left, reset variables, and close peer connection
    try {
        const funnyTracks = funnyVideo.srcObject.getTracks();
        const seriousTracks = seriousVideo.srcObject.getTracks();

        funnyTracks[0].stop();
        seriousTracks[0].stop();

        myPeerConnection.close();
    } catch (e) {
        console.log("No tracks detected: " + e.toString());
    }
});