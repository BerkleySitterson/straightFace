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
activeUsers = {} # Dictionary to store all active users and their corresponding sid
connectedUsersNum = 0 # Number of total connected users

@app.route('/')  # Render index.html when website is first visited
def index():
    return render_template('index.html')

@socketio.on('connect') # Display current queue numbers and connections
def on_connect():
    global connectedUsersNum
    connectedUsersNum += 1
    socketio.emit("increment_funny_queue", funnyQueue)
    socketio.emit("increment_serious_queue", seriousQueue)
    socketio.emit("change_user_count", connectedUsersNum)

        
@socketio.on("user_join_funny") # User joins 'funny' team and is inserted into the waiting queue
def handle_user_join_funny(username):
    
    print(f"User {username} has joined the funny side!")
    
    sid = request.sid
    activeUsers[username] = sid
    funnyQueue.append((username, sid))
    attempt_pairing()
    socketio.emit("increment_funny_queue", funnyQueue)
    socketio.emit("increment_serious_queue", seriousQueue)         
    
@socketio.on("user_join_serious") # User joins 'serious' team and is inserted into the waiting queue
def handle_user_join_serious(username):
    
    print(f"User {username} has joined the serious side!")
    
    sid = request.sid
    activeUsers[username] = sid
    seriousQueue.append((username, sid))
    attempt_pairing()
    socketio.emit("increment_funny_queue", funnyQueue)
    socketio.emit("increment_serious_queue", seriousQueue)        
        
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
    socketio.emit("display_funny_username", { "username" : funnyUser[0] }, room=room)
    socketio.emit("display_serious_username", { "username" : seriousUser[0] }, room=room)
    
    
@socketio.on("new_message") # Recieves new message from client and emits to all users in current room
def handle_new_message(message):
    print(f"New Message: {message}")
    sid = request.sid
    rooms_list = rooms(sid)
    room = rooms_list[1]
    username = None
    
    for user in activeUsers:
        if activeUsers[user] == request.sid:
            username = user
    socketio.emit("chat", {"message": message, "username": username}, room=room)
    

@socketio.on("disconnect_user") # User clicks 'disconnectBtn' and the room is deleted
def handle_user_disconnect():
    sid = request.sid
    rooms_list = rooms(sid)
    room = rooms_list[1]
    
    if sid in activeUsers:
        del activeUsers[sid]
    
    close_room(room, sid)    
    socketio.emit("user_left", room=room)
    print(f"User with sid {sid} has left. Room: {room} has been deleted.")
    

@socketio.on("disconnect") # User exits out of StraightFace
def handle_disconnect():
    global connectedUsersNum
    connectedUsersNum -= 1
    socketio.emit("change_user_count", connectedUsersNum)
    
    sid = request.sid
    rooms_list = rooms(sid)
    room = rooms_list[1]
    
    if sid in activeUsers:
        del activeUsers[sid]
    
    close_room(room, sid)    
    socketio.emit("user_left", room=room)
    print(f"User with sid {sid} has left. Room: {room} has been deleted.")

       
if __name__ == '__main__':
    socketio.run(app, host='localhost')


    

    



    