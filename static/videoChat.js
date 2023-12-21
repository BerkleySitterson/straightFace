const protocol = window.location.protocol;
const socket = io(protocol + '//' + document.domain + ':' + location.port, {autoConnect: true});
const mediaConstraints = { audio: true, video: true };
const funnyVideo = document.getElementById("funnyVideo");
const seriousVideo = document.getElementById("seriousVideo");
const searchBtn = document.getElementById("searchBtn");
const screenShareBtn = document.getElementById("screenShareBtn");
const playSoundBtn = document.getElementById("playSoundBtn");
var localStream;
var tracksReceieved = 0;
var countdownInterval;
var detectionInterval;
var remoteUsername;
var myID;
var targetID;
var room;


navigator.mediaDevices.getUserMedia(mediaConstraints) // Playing Video/Audio after user has accepted permissions based on role
.then((stream) => {
    localStream = stream;
    if (role === "funny") {
        funnyVideo.srcObject = localStream;
        funnyVideo.muted = true;
        funnyVideo.play();
    } else {
        seriousVideo.srcObject = localStream;
        seriousVideo.muted = true;
        seriousVideo.play();
    }
})
.catch((error) => {
    console.log("Error getting Video or Audio: " + error);
});


searchBtn.addEventListener("click", () => { // If user has accepted permissions and clicks search, emit event to find new player
    try {
        if (localStream.getVideoTracks().length > 0 && localStream.getAudioTracks().length > 0) {
            searchBtn.disabled = true;
            document.getElementById("timer").textContent = "";
            socket.emit("find_new_player");
        }
    } catch (Exception) {
        console.log('Error: Video or Audio not detected: ' + Exception.toString());
    }
});

socket.on("set_round_data", (data) => { // Set round data and display remote username
    if (role === "funny") {
        remoteUsername = data['seriousUsername'];
        console.log("Role is " + role + " and remote username is " + remoteUsername);
        document.getElementById("seriousUsername").textContent = remoteUsername;
    } else {
        remoteUsername = data['funnyUsername'];
        console.log("Role is " + role + " and remote username is " + remoteUsername);
        document.getElementById("funnyUsername").textContent = remoteUsername;
    }
    room = data['room'];
});

// ---------- Web-RTC ---------- //

function sendToServer(msg) {
    socket.emit("data", msg);
}

socket.on("users_paired", function(data) { // Users have been paired, set myID and targetID and create peer connection

    myID = data['myID'];
    targetID = data['targetID'];

    createPeerConnection();
    localStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, localStream));
});

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

socket.on("user_left", function() { // User has left, reset variables, and close peer connection
    
    const funnyTracks = funnyVideo.srcObject.getTracks();
    const seriousTracks = seriousVideo.srcObject.getTracks();

    funnyTracks[0].stop();
    seriousTracks[0].stop();

    myPeerConnection.close();

});

// ---------- Smile-Detection ---------- //

async function detectSmile() { // Detect smile using face-api.js

    console.log('detectSmile() executing...');
    try {

        Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('../static/models'),
            faceapi.nets.faceExpressionNet.loadFromUri('../static/models')
        ]);

        console.log('Models Loaded');

        const canvas = await faceapi.createCanvasFromMedia(seriousVideo);          
        document.body.append(canvas);

        const vwWidth = 45;
        const vhHeight = 30; 
        const displaySize = { width: vwWidth * window.innerWidth / 100, height: vhHeight * window.innerHeight / 100 };

        await faceapi.matchDimensions(canvas, displaySize);
        
        const options = await new faceapi.TinyFaceDetectorOptions();            
        const canvasContext = await canvas.getContext('2d', { willReadFrequently: true });
        console.log('Commencing Face Detection');
        detectionInterval = setInterval(async () => {
            try {
                let detections = await faceapi.detectAllFaces(seriousVideo, options).withFaceExpressions();
                await canvasContext.clearRect(0, 0, canvas.width, canvas.height);

                if (detections && detections[0] && detections[0].expressions.happy >= 0.99) {
                    console.log('Happy Emotion Detected');
                    socket.emit("userSmiled", room, remoteUsername);           
                }
            }
            catch (Exception) {
                console.log('Detection Error!:' + Exception.toString())
            }                
        }, 80)
    }
    catch (Exception) {
        console.log('Canvas Error!:' + Exception.toString());
    }
}

socket.on('startRound', () => { // Start round and timer
    console.log('Starting Round');

    startTimer();

    try {
        if (role === "serious") {
            detectSmile();
        } 
    } catch (Exception) {
        console.log("Error Starting Round: " + Exception.toString());
    }

});

function startTimer() { // Start timer and emit event to start round on backend
    const timer = document.getElementById('timer');
    const countdownDuration = 59;
    
    const startTime = new Date().getTime();
    
    updateCountdown();
    
    countdownInterval = setInterval(updateCountdown, 1000);

    function updateCountdown() {
        const currentTime = new Date().getTime();
        const elapsedTime = (currentTime - startTime) / 1000;
        const remainingTime = countdownDuration - elapsedTime;
    
        if (remainingTime > 0) {
            timer.innerText = remainingTime.toFixed(0);  
        } else {
            socket.emit('timerComplete', room);
        }
        }
}

socket.on('endRoundFunnyWin', function () { // End round and reset variables
    try {
        const timer = document.getElementById('timer');
        const funnyTracks = funnyVideo.srcObject.getTracks();
        const seriousTracks = seriousVideo.srcObject.getTracks();

        clearInterval(countdownInterval);
        clearInterval(detectionInterval);   

        funnyTracks[0].stop();
        seriousTracks[0].stop();

        room = "";
        targetID = "";

        myPeerConnection.close();
        tracksReceieved = 0;
        searchBtn.disabled = false;
        timer.textContent = "1:00";

        if (role === "funny") {
            document.getElementById("seriousUsername").textContent = "Waiting for Player...";
        } else {
            document.getElementById("funnyUsername").textContent = "Waiting for Player...";
        }
    } catch (e) {
        console.log("Error ending round w/ funny win: " + e.toString());
    }
});

socket.on('endRoundSeriousWin', function () { // End round and reset variables
    try { 
        const timer = document.getElementById('timer');
        const funnyTracks = funnyVideo.srcObject.getTracks();
        const seriousTracks = seriousVideo.srcObject.getTracks();

        clearInterval(countdownInterval);
        clearInterval(detectionInterval);   

        funnyTracks[0].stop();
        seriousTracks[0].stop();

        room = "";
        targetID = "";

        myPeerConnection.close();
        tracksReceieved = 0;
        searchBtn.disabled = false;
        timer.textContent = "1:00";

        if (role === "funny") {
            document.getElementById("seriousUsername").textContent = "Waiting for Player...";
        } else {
            document.getElementById("funnyUsername").textContent = "Waiting for Player...";
        }
    } catch (e) {
        console.log("Error ending round w/ serious win: " + e.toString());
    }
});

const shareScreen = async () => { // Share screen feature
    const mediaStream = await getLocalScreenCaptureStream();
    const screenTrack = mediaStream.getVideoTracks()[0];

    if (screenTrack) {
        console.log('Replacing video stream with screen track');
        replaceTrack(screenTrack);
    }
};

const getLocalScreenCaptureStream = async () => {
    try {
        const constraints = { video: { cursor: 'always' }, audio: false };
        const screenCaptureStream = await navigator.mediaDevices.getDisplayMedia(constraints);
    
        return screenCaptureStream;
        } catch (error) {
        console.error('failed to get local screen', error);
        }
};

const replaceTrack = (newTrack) => {
    localStream.removeTrack(localStream.getVideoTracks()[0]);
    localStream.addTrack(newTrack);
    const sender = myPeerConnection.getSenders().find(sender =>
        sender.track.kind === newTrack.kind 
    );
    
    if (!sender) {
        console.warn('failed to find sender');
    
        return;
    }
    
    sender.replaceTrack(newTrack);
}