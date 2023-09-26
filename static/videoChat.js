document.addEventListener("DOMContentLoaded", (event) => {

    var protocol = window.location.protocol;
    var socket = io(protocol + '//' + document.domain + ':' + location.port, {autoConnect: true});
    var role;
    var myID;
    var targetID;
    var room;
    var mediaConstraints = { audio: false, video: true };

    document.getElementById("findNewPlayerBtn").addEventListener("click", () => {
        socket.emit("find_new_player");
    });

    socket.on("setRole", (data) => {
        role = data['role'];
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

        navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then((localStream) => {
            if (role == "funny") {
                document.getElementById("funnyVideo").srcObject = localStream;
            } else {
                document.getElementById("seriousVideo").srcObject = localStream;
            }
            createPeerConnection();
            localStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, localStream));
        })
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

            if (role == "funny") {
                document.getElementById("seriousVideo").srcObject = remoteStream;
            } else {
                document.getElementById("funnyVideo").srcObject = remoteStream;
            }
            socket.emit("startCountdown", room);
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
        
        let localStream = null;
        
        myID = msg.target;
        targetID = msg.name;
        
        createPeerConnection();

        const desc = new RTCSessionDescription(msg.sdp);
        
        myPeerConnection
            .setRemoteDescription(desc)
            .then(() => navigator.mediaDevices.getUserMedia(mediaConstraints))
            .then((stream) => {
            localStream = stream;
            if (role == "funny") {
                document.getElementById("funnyVideo").srcObject = localStream;
            } else {
                document.getElementById("seriousVideo").srcObject = localStream;
            }   
            localStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, localStream));
            })
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

        const funnyStream = document.getElementById("funnyVideo").srcObject;
        const seriousStream = document.getElementById("seriousVideo").srcObject;       
        const funnyTracks = funnyStream.getTracks();
        const seriousTracks = seriousStream.getTracks();

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

            const videoElement = document.getElementById('seriousVideo');
            
            console.log('Models Loaded');

            const canvas = await faceapi.createCanvasFromMedia(videoElement);
            
            document.body.append(canvas);

            const displaySize = { width: videoElement.width, height: videoElement.height };
            await faceapi.matchDimensions(canvas, displaySize);
            /*Options for face detectors: input for tiny face must be a multiple of 32*/
            const options = await new faceapi.TinyFaceDetectorOptions();            
            //const options = await new faceapi.SsdMobilenetv1Options({minConfidence: 0.1})
            const canvasContext = await canvas.getContext('2d', { willReadFrequently: true });
            console.log('Commencing Face Detection');
            const detectionInterval = setInterval(async () => {
                try {
                    let detections = await faceapi.detectAllFaces(videoElement, options).withFaceExpressions();
                    let resizedDetections = await faceapi.resizeResults(detections, displaySize);
                    await canvasContext.clearRect(0, 0, canvas.width, canvas.height);
                    await faceapi.draw.drawDetections(canvas, resizedDetections);
                    await faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

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

        if (role === "funny") {
            document.getElementById("funnyVideo").play();
            document.getElementById("seriousVideo").play();
        } else {
            document.getElementById("funnyVideo").play();
            document.getElementById("seriousVideo").play();
            detectSmile();
            socket.emit('startTimerFromServer', room)
        }

    });

    socket.on('startTimer', () => {
        const timerElement = document.getElementById('timer');
        let seconds = 30;

        countdownInterval = setInterval(function () {
            timerElement.textContent = seconds;
            seconds--;

            if (seconds <= 0) {
                clearInterval(countdownInterval);
                timerElement.textContent = 'Time is Up!';
                socket.emit("endRoundSeriousWin", room);
            }

        }, 1000);
    });

    socket.on('endRoundFunnyWin', function () {
        const timerElement = document.getElementById("timer");
        const funnyStream = document.getElementById("funnyVideo").srcObject;
        const seriousStream = document.getElementById("seriousVideo").srcObject;       
        const funnyTracks = funnyStream.getTracks();
        const seriousTracks = seriousStream.getTracks();

        funnyTracks[0].stop();
        seriousTracks[0].stop();

        myPeerConnection.close();

        timerElement.textContent = "Funny User has Won!";
    });

    socket.on('endRoundSeriousWin', function () {
        const timerElement = document.getElementById("timer");
        const funnyStream = document.getElementById("funnyVideo").srcObject;
        const seriousStream = document.getElementById("seriousVideo").srcObject;       
        const funnyTracks = funnyStream.getTracks();
        const seriousTracks = seriousStream.getTracks();

        funnyTracks[0].stop();
        seriousTracks[0].stop();

        myPeerConnection.close();

        timerElement.textContent = "Serious User has Won!";
    });

});