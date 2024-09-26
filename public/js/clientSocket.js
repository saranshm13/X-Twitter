// import {ApiUrl} from './api';

var connected = false;

var socket = io(`${ApiUrl}`);
// called for the event of setup here along with user data passed in (userLoggedIn) 
socket.emit("setup", userLoggedIn);

socket.on("connected", () => connected = true );
socket.on("message recieved", (newMessage) => messageRecieved(newMessage) );

socket.on("notification recieved" , () => {
    $.get("/api/notifications/latest", (notificationData) => {
        showNotificationPopup(notificationData);
        refreshNotificationsBadge();
    })
})

function emitNotification(userId) {
    if(userId == userLoggedIn._id) return;

    socket.emit("notification recieved", userId)
}