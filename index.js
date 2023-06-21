document.addEventListener("DOMContentLoaded", function() { // Ensuring the HTML files are loaded in before JS file in browser
    
    let laughButton = document.getElementById("button1"); // Getting buttons from index.html
    let seriousButton = document.getElementById("button2");
    
    laughButton.addEventListener("click", function() { // When buttons are clicked, direct them to videoChat.html
        window.location.href = "videoChat.html";
    });
    seriousButton.addEventListener("click", function() {
        window.location.href = "videoChat.html";
    });

    


    let video = document.getElementById("laughVideoInput"); // Getting video element from videoChat.html
    navigator.mediaDevices.getUserMedia({ video: true, audio: false }) // Retrieving media stream
        .then(function(stream) {
            video.srcObject = stream;
            video.play();
        })
        .catch(function(error) {
            console.log("An error occurred! " + error);
        });

    
    let canvasFrame = document.getElementById("canvasFrame");
    let context = canvasFrame.getContext("2d");
    let src = new cv.Mat(height, width, cv.CV_8UC4);
    let dst = new cv.Mat(height, width, cv.CV_8UC1);
    const fps = 30;

    function processVideo() {
        let begin = Date.now();
        context.drawImage(video, 0, 0, width, height);
        src.data.set(context.getImageData(0, 0, width, height).data);
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        cv.imshow("canvasOutput", dst);
         // schedule next one.
        let delay = 1000/FPS - (Date.now() - begin);
        setTimeout(processVideo, delay);
    }
        // schedule first one.
        setTimeout(processVideo, 0);

    

});




