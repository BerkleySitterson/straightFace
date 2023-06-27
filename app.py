import eventlet

from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, rooms, close_room

eventlet.monkey_patch()

app = Flask(__name__, static_folder='static')
app.debug = True;
socketio = SocketIO(app, cors_allowed_origins="*", asynch_mode='eventlet')
app.config['SECRET'] = "secret"

funnyQueue = [] # Queue to store funny users info
seriousQueue = [] # Queue to store serious users info
users = {} # Dictionary to store all connected users


@app.route('/')  # Render index.html when website is first visited
def index():
    return render_template('index.html')

        
@socketio.on("user_join_funny") # User joins 'funny' team and is inserted into the waiting queue
def handle_user_join_funny(username):
    
    print(f"User {username} has joined the funny side!")
    
    sid = request.sid
    users[username] = sid
    funnyQueue.append((username, sid))
    attempt_pairing()
         
    
@socketio.on("user_join_serious") # User joins 'serious' team and is inserted into the waiting queue
def handle_user_join_serious(username):
    
    print(f"User {username} has joined the serious side!")
    
    sid = request.sid
    users[username] = sid
    seriousQueue.append((username, sid))  
    attempt_pairing()
        
        
def attempt_pairing(): # Checking to see if there is atleast 1 funny and 1 serious user
    
    if len(funnyQueue) >= 1 and len(seriousQueue) >= 1:
        funnyUser = funnyQueue.pop(0)
        seriousUser = seriousQueue.pop(0)
        pair_users(funnyUser, seriousUser)
        

def pair_users(funnyUser, seriousUser): # Pairs 1 funny and 1 serious user and puts them in a room
    
    room = f"{funnyUser[1]}_{seriousUser[1]}_room"
    
    join_room(room, funnyUser[1])
    join_room(room, seriousUser[1])
    
    print(f"Paired {funnyUser[0]} with {seriousUser[0]} in room: {room}")
    socketio.emit("users_paired", room=room)
    

@socketio.on("disconnect_user") # User clicks 'disconnectBtn' and the room is deleted
def handle_user_disconnect():
    sid = request.sid
    rooms_list = rooms(sid)
    room = rooms_list[1]
    
    if sid in users:
        del users[sid]
    
    close_room(room, sid)    
    socketio.emit("user_left")
    print(f"User with sid {sid} has left. Room: {room} has been deleted.")
    
        
        
@socketio.on("new_message") # Recieves new message from client and emits to all users in current room
def handle_new_message(message):
    print(f"New Message: {message}")
    sid = request.sid
    rooms_list = rooms(sid)
    room = rooms_list[1]
    username = None
    
    for user in users:
        if users[user] == request.sid:
            username = user
    socketio.emit("chat", {"message": message, "username": username}, room=room)
    

       
if __name__ == '__main__':
    socketio.run(app, host='localhost')


    

    



    