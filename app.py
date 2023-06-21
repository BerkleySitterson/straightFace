from flask import Flask, render_template, request
# from opencv import capture_video
app = Flask(__name__, static_folder='static')

@app.get('/') # Rendering index.html file on webpage is visited
def index():
    return render_template('index.html')

@app.route('/funnyPage.html') # Rendering funnyPage.html once the 'Make someone Laugh!' button is clicked
def funny_video_chat():
    return render_template('funnyPage.html')

@app.route('/seriousPage.html') # Rendering seriousPage.html once the 'Be Serious!' button is clicked
def serious_video_chat():
    return render_template('seriousPage.html')


    