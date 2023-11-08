'use strict';

const seriousQueue = document.getElementById('seriousQueue_container');
const funnyQueue = document.getElementById('funnyQueue_container');
const funnyIcon = document.getElementById('funnyIcon');
const seriousIcon = document.getElementById('seriousIcon');
const funnyBtn = document.getElementById('funnyFaceBtn');
const seriousBtn = document.getElementById('straightFaceBtn');

function showFunnyQueue() {
    console.log('showFunnyQueue');
    seriousQueue.style.display = 'none';
    seriousIcon.style.filter = 'blur(2px)';
    funnyQueue.style.display = 'inline-flex';
    funnyIcon.style.filter = 'none';

}

function showSeriousQueue() {
    console.log('showSeriousQueue');
    funnyQueue.style.display = 'none';
    funnyIcon.style.filter = 'blur(2px)';
    seriousQueue.style.display = 'inline-flex';
    seriousIcon.style.filter = 'none';

}

