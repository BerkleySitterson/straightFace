document.addEventListener("DOMContentLoaded", function() {

    const socket = io(); 

    document.getElementById("funnyBtn").addEventListener("click", function() { // Once User has chosen funny role, add them to funnyUsers Queue
        socket.emit("user_join_funny");
    });
    
    document.getElementById("seriousBtn").addEventListener("click", function() { // Once User has chosen serious role, add them to seriousUsers Queue
        socket.emit("user_join_serious");                
    });

    socket.on("users_paired", function() {
        console.log("users_paired being executed now.");
    
        navigator.mediaDevices.getUserMedia({ video: true, audio: false }) // Requesting access to user's camera and microphone
                .then(function (stream) {
                    localStream = stream;
                    funnyVideo.srcObject = localStream; // Set the video stream as the source for the <video> element
                    console.log("stream has been created");
                })
                .catch(function (error) {
                    console.error('Error accessing camera:', error);
                    console.log("error is getting stream");
                });

        window.location.href = '/videoChat';
        console.log("users_paired no completed.");
    });

    document.getElementById("disconnectBtn").addEventListener("click", function() { // When 'disconnectBtn' is clicked, it lets the server know, displays the landing-page, and stops the video stream
        socket.emit("disconnect_user")
    
    });
    
    socket.on("user_left", function() { // When partner has left, diplay landing page and stop video/audio
        document.getElementById("landingPage").style.display = "block";
        document.getElementById("video-chat").style.display = "none";
    
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



