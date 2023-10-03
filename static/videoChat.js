document.addEventListener("DOMContentLoaded", (event) => {

    var protocol = window.location.protocol;
    var socket = io(protocol + '//' + document.domain + ':' + location.port, {autoConnect: true});
    var myID;
    var targetID;
    var room;
    var mediaConstraints = { audio: true, video: true };
    var funnyVideo = document.getElementById("funnyVideo");
    var seriousVideo = document.getElementById("seriousVideo");
    var searchBtn = document.getElementById("searchBtn");
    var countdownInterval
    var localStream;
    var userSmiled = false;

    navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then((stream) => {
        localStream = stream;
        if (role === "funny") {
            funnyVideo.srcObject = localStream;
            funnyVideo.muted = true;
            funnyVideo.play();
        } else if (role === "serious") {
            seriousVideo.srcObject = localStream;
            seriousVideo.muted = true;
            seriousVideo.play();
        }
    })
    .catch((error) => {
        console.log("Error getting Video or Audio: " + error);
    });
    

    searchBtn.addEventListener("click", () => {
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

    socket.on("set_round_data", (data) => {
        if (role === "funny") {
            console.log("Role is " + role + " and remote username is " + data['seriousUsername']);
            document.getElementById("seriousUsername").textContent = data['seriousUsername'];
        } else {
            console.log("Role is " + role + " and remote username is " + data['funnyUsername']);
            document.getElementById("funnyUsername").textContent = data['funnyUsername'];
        }
        room = data['room'];
    });

    // ---------- Web-RTC ---------- //

    function sendToServer(msg) {
        socket.emit("data", msg);
    }

    socket.on("users_paired", function(data) {

        myID = data['myID'];
        targetID = data['targetID'];

        createPeerConnection();
        localStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, localStream));
        
    });

    function createPeerConnection() {

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

        myPeerConnection.onicecandidate = handleICECandidateEvent;
        myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;

        myPeerConnection.addEventListener('track', async (event) => {
            const [remoteStream] = event.streams;

            if (role === "funny") {
                seriousVideo.srcObject = remoteStream;
            } else {
                funnyVideo.srcObject = remoteStream;
                socket.emit("startCountdown", room);
            }
        });
    }

    function handleNegotiationNeededEvent() {

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

    function handleICECandidateEvent(event) {

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

    socket.on("handleVideoOfferMsg", function(msg) {
        
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
    
    socket.on("user_left", function() { 
     
        const funnyTracks = funnyVideo.srcObject.getTracks();
        const seriousTracks = seriousVideo.srcObject.getTracks();

        funnyTracks[0].stop();
        seriousTracks[0].stop();

        myPeerConnection.close();

    });
    
    document.getElementById("message").addEventListener("keyup", function(event) {
        if (event.key == "Enter") {
            let message = document.getElementById("message").value;
            socket.emit("new_message", message);
            document.getElementById("message").value = "";
        }
    });
    
    socket.on("chat", function (data) {
        let ul = document.getElementById("chat-messages");
        let li = document.createElement("li");
        li.style.listStyleType = "none";
        li.appendChild(document.createTextNode(data["username"] + ": " + data["message"]));
        ul.appendChild(li);
        ul.scrolltop = ul.scrollHeight;
    });

    // ---------- Smile-Detection ---------- //

    async function detectSmile() {

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
            const detectionInterval = setInterval(async () => {
                try {
                    let detections = await faceapi.detectAllFaces(seriousVideo, options).withFaceExpressions();
                    await canvasContext.clearRect(0, 0, canvas.width, canvas.height);

                    if (detections && detections[0] && detections[0].expressions.happy >= 0.99) {
                        console.log('Happy Emotion Detected');
                        socket.emit("userSmiled", room);
                        clearInterval(detectionInterval);                      
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

    socket.on('updateCountdown', (data) => {
        console.log('Starting Countdown');

        const countdown = data.countdown;
        const timerElement = document.getElementById('timer');

        if (countdown === 0) {
            timerElement.textContent = 'Start!';
        } else {
            timerElement.textContent = countdown;
        }
       
    });

    socket.on('startRound', () => {
        console.log('Starting Round');
        console.log("Role: " + role);

        try {
            if (role === "funny") {
                seriousVideo.play();
            } else if (role === "serious") {
                funnyVideo.play();
                detectSmile();
                socket.emit('startTimerFromServer', room)
            }
        } catch (Exception) {
            console.log("Error Starting Round: " + Exception.toString());
        }

    });

    socket.on('startTimer', () => { 
        const timerElement = document.getElementById('timer');
        let seconds = 30;

        countdownInterval = setInterval(function () {
            timerElement.textContent = seconds;
            seconds--;

            if (userSmiled === true) {
                timerElement.textContent = "Funny User has won!";
                clearInterval(countdownInterval);
            } else if (seconds <= 0) {
                timerElement.textContent = 'Serious User has won!';
                socket.emit("timerComplete", room);
                clearInterval(countdownInterval);
            }

        }, 1000);

    });

    socket.on('setUserSmiled', () => {
        userSmiled = true;
    });

    socket.on('endRoundFunnyWin', function () {
        try {
            const funnyTracks = funnyVideo.srcObject.getTracks();
            const seriousTracks = seriousVideo.srcObject.getTracks();

            funnyTracks[0].stop();
            seriousTracks[0].stop();

            room = "";
            targetID = "";

            myPeerConnection.close();
            userSmiled = false;
            searchBtn.disabled = false;

            if (role === "funny") {
                document.getElementById("seriousUsername").textContent = "Waiting for Player...";
            } else {
                document.getElementById("funnyUsername").textContent = "Waiting for Player...";
            }
        } catch (e) {
            console.log("Error ending round w/ funny win: " + e.toString());
        }
    });

    socket.on('endRoundSeriousWin', function () {
        try { 
            timerElement = document.getElementById("timer");
            const funnyTracks = funnyVideo.srcObject.getTracks();
            const seriousTracks = seriousVideo.srcObject.getTracks();

            funnyTracks[0].stop();
            seriousTracks[0].stop();

            room = "";
            targetID = "";

            myPeerConnection.close();
            userSmiled = false;
            searchBtn.disabled = false;

            if (role === "funny") {
                document.getElementById("seriousUsername").textContent = "Waiting for Player...";
            } else {
                document.getElementById("funnyUsername").textContent = "Waiting for Player...";
            }
        } catch (e) {
            console.log("Error ending round w/ serious win: " + e.toString());
        }
    });

});