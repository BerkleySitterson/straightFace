document.addEventListener("DOMContentLoaded", function() {

    var myID;
    var targetID;
    var role;

    var mediaConstraints = {
        audio: false,
        video: true
    };
     
    var protocol = window.location.protocol;
    var socket = io(protocol + '//' + document.domain + ':' + location.port, {autoConnect: true});
    var username;
        
        // ----- Landing Page functions ----- // 
    
        document.getElementById("index_login").addEventListener("click", function() {
            document.getElementById("landing_page").style.visibility = "hidden";
            document.getElementById("login_page").style.visibility = "visible";
        });
    
        document.getElementById("index_register").addEventListener("click", function() {
            document.getElementById("landing_page").style.visibility = "hidden";
            document.getElementById("register_page").style.visibility = "visible";
        });
    
        // ----- Login Page functions ----- // 
    
        document.getElementById("login_button").addEventListener("click", function() {
            username = document.getElementById("login_username").value;
            let password = document.getElementById("login_password").value;
            socket.emit("login", username, password);
        });
    
        socket.on("login_successful", function() {
            document.getElementById("login_page").style.visibility = "hidden";
            document.getElementById("home_page").style.visibility = "visible";
            document.getElementById("username_display").textContent = username;
        });
    
        socket.on("login_failed", function() {
            document.getElementById("login_error_message").value = "Login Failed, check your username and password.";
        });
    
        // ----- Register Page functions ----- //
    
        document.getElementById("register_button").addEventListener("click", function() {
            let username = document.getElementById("register_username").value;
            let password = document.getElementById("register_password").value;
            let email = document.getElementById("register_email").value;
            let first_name = document.getElementById("register_first_name").value;
            let last_name = document.getElementById("register_last_name").value;
            socket.emit("register", username, password, email, first_name, last_name);
        });
    
        socket.on("register_successful", function() {
            document.getElementById("register_page").style.visibility = "hidden";
            document.getElementById("landing_page").style.visibility = "visible";
        });
    
        socket.on("register_failed", function() {
            document.getElementById("register_error_message").value = "Register Failed, please enter all required fields.";
        });
    
        // ----- Home Functions ----- //
    
        document.getElementById("funnyBtn").addEventListener("click", function() { // Once User has chosen funny role, add them to funnyUsers Queue
            socket.emit("user_join_funny", username);
            role = "funny";
        });
        
        document.getElementById("seriousBtn").addEventListener("click", function() { // Once User has chosen serious role, add them to seriousUsers Queue
            socket.emit("user_join_serious", username);
            role = "serious";          
        });
    
        socket.on("increment_funny_queue", function(num) {
            document.getElementById("funnyQueueNum").textContent = "Funny Queue: " + num;
        });
    
        socket.on("increment_serious_queue", function(num) {
            document.getElementById("seriousQueueNum").textContent = "Serious Queue: " + num;
        });
        
    
        // ----- Video Chat functions ----- //

        socket.on("redirect_to_video", function() {
            document.getElementById("home_page").style.visibility = "hidden";
            document.getElementById("video_chat_page").style.visibility = "visible";
        });

        function sendToServer(msg) {
            console.log('sendToServer being executed now.');

            socket.emit("data", msg);
        }
    
        socket.on("users_paired", function(data) {
            console.log("users_paired being executed now.");

            myID = data['myID'];
            targetID = data['targetID'];

            console.log(createPeerConnection());

            navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then((localStream) => {
                if (role == "funny") {
                    document.getElementById("funnyVideo").srcObject = localStream;
                } else {
                    document.getElementById("seriousVideo").srcObject = localStream;
                }
              localStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, localStream));
            })
            
            console.log("users_paired now completed.");
        });

        function createPeerConnection() {
            console.log('createPeerConnection being executed now.');
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
            // myPeerConnection.ontrack = handleTrackEvent;
            myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;

            myPeerConnection.addEventListener('track', async (event) => {
                const [remoteStream] = event.streams;
    
                if (role == "funny") {
                    document.getElementById("seriousVideo").srcObject = remoteStream;
                    console.log("Serious Video being populated.");
                } else {
                    document.getElementById("funnyVideo").srcObject = remoteStream;
                    console.log("Funny Video being populated.");
                }
            });
    
            return myPeerConnection.connectionState;
        }

        function handleNegotiationNeededEvent() {
            console.log('handleNegotiationNeededEvent being executed now.');
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
            console.log('handleIceCandidateEvent being executed.');
            if (event.candidate) {
              sendToServer({
                type: "new-ice-candidate",
                target: targetID,
                candidate: event.candidate,
              });
            }
        }

        // function handleTrackEvent(event) {
        //     console.log('handleTrackEvent being executed.');
        //     console.log("Event: " + event);
        //     console.log("Stream: " + event.streams[0]);
        //     console.log("Stream Length: " + event.streams.length);
        //     if (role == "funny") {
        //         document.getElementById("seriousVideo").srcObject = event.streams[0];
        //         console.log("Serious Video being populated.");
        //     } else {
        //         document.getElementById("funnyVideo").srcObject = event.streams[0];
        //         console.log("Funny Video being populated.");
        //     }
        // }

        socket.on("handleVideoOfferMsg", function(msg) {
            console.log('Handle Video Offer being executed.');
            let localStream = null;
          
            targetID = msg.name;
            myID = msg.target;
            console.log("TargetID: " + targetID);
            console.log("MyID: " + myID);
            console.log(createPeerConnection());

            const desc = new RTCSessionDescription(msg.sdp);
            console.log(msg.sdp);
          
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

              console.log('handleVideoOfferMsg now complete');
        });

        socket.on("handleNewIceCandidateMsg", function(msg) {
            console.log('New Ice Candidate Received');
            const candidate = new RTCIceCandidate(msg.candidate);
          
            myPeerConnection.addIceCandidate(candidate);
            console.log('MyPeerConnection State: ' + myPeerConnection.connectionState);
        });

        socket.on("handleVideoAnswerMsg", function(msg) {
            targetID = msg.name;
            console.log(`Answer recieved from ` + msg.name);
            let desc = new RTCSessionDescription(msg.sdp);
            myPeerConnection.setRemoteDescription(desc);
        });

    
        document.getElementById("disconnectBtn").addEventListener("click", function() { // When 'disconnectBtn' is clicked, it lets the server know, displays the landing-page, and stops the video stream
            socket.emit("disconnect_user")
        
        });
        
        socket.on("user_left", function() { // When partner has left, diplay landing page and stop video/audio
            document.getElementById("landing_page").style.display = "block";
            document.getElementById("video_chat_page").style.display = "none";
        
        });
        
        document.getElementById("message").addEventListener("keyup", function(event) { // When user clicks 'enter' key, their message is sent to flask server and then returned to null
            if (event.key == "Enter") {
                let message = document.getElementById("message").value;
                socket.emit("new_message", message);
                document.getElementById("message").value = "";
            }
        });
        
        socket.on("chat", function (data) { // Recieves message from server and displays it to all users in a specific room
            let ul = document.getElementById("chat-messages");
            let li = document.createElement("li");
            li.style.listStyleType = "none";
            li.appendChild(document.createTextNode(data["username"] + ": " + data["message"]));
            ul.appendChild(li);
            ul.scrolltop = ul.scrollHeight;
        });
});



