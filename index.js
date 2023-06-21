document.addEventListener("DOMContentLoaded", function() { // Ensuring the HTML files are loaded in before JS file in browser
    
    let laughButton = document.getElementById("button1"); // Getting buttons from index.html
    let seriousButton = document.getElementById("button2");
    
    laughButton.addEventListener("click", function() { // When buttons are clicked, direct them to videoChat.html
        window.location.href = "videoChat.html";
    });
    seriousButton.addEventListener("click", function() {
        window.location.href = "videoChat.html";
    });

});




