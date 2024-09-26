const express = require('express');
const app = express();
require("dotenv").config();
const middleware = require('./middleware');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('./database');
const session = require('express-session');
const port = process.env.PORT || 3000;
const server = app.listen( port , () => console.log(`Server listening on port ${port}`));
const io = require("socket.io")(server , { pingTimeout: 60000 });

app.set("view engine", "pug");
app.set("views", "views");

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, "public")))

app.use(session({
    secret: "Hashing the session",
    resave: true,
    saveUninitialized: false
}))
//Routes
const loginRoute = require("./routes/loginRoutes")
const registerRoute = require("./routes/registerRoutes")
const logoutRoute = require("./routes/logoutRoutes")
const postRoute = require("./routes/postRoutes")
const profileRoute = require("./routes/profileRoutes")
const uploadRoute = require("./routes/uploadRoutes")
const searchRoute = require("./routes/searchRoutes")
const messagesroute = require("./routes/messagesRoutes")
const notificationsRoute = require("./routes/notificationsRoutes")


// Api routes
const postsApiRoute = require("./routes/api/posts")
const usersApiRoute = require("./routes/api/users")
const chatsApiRoute = require("./routes/api/chats")
const messagesApiRoute = require("./routes/api/messages")
const notificationsApiRoute = require("./routes/api/notifications")

app.use("/login", loginRoute)
app.use("/register", registerRoute)
app.use("/logout", logoutRoute)
app.use("/posts", middleware.requireLogin, postRoute)
app.use("/profile", middleware.requireLogin, profileRoute)
app.use("/uploads", uploadRoute)
app.use("/search", middleware.requireLogin, searchRoute)
app.use("/messages", middleware.requireLogin, messagesroute)
app.use("/notifications", middleware.requireLogin, notificationsRoute)

app.use("/api/posts", postsApiRoute)
app.use("/api/users", usersApiRoute) 
app.use("/api/chats", chatsApiRoute) 
app.use("/api/messages", messagesApiRoute) 
app.use("/api/notifications", notificationsApiRoute) 

app.get('/', middleware.requireLogin , (req, res, next) => {
    
    var payload = {
        pageTitle: "Home",
        userLoggedIn: req.session.user,
        userLoggedInJS: JSON.stringify(req.session.user)
    }


    res.status(200).render("home", payload);
})

// down here socket is like actually client  , thats been connected 
io.on("connection" , (socket) => {
    // now this socket or client recives the following event  i.e setup , callback function could be done
    socket.on("setup", userData => {
        socket.join(userData._id);
        socket.emit("connected"); 
    })

    socket.on("join room" , room => socket.join(room) );
    socket.on("typing" , room => socket.in(room).emit("typing") );
    socket.on("stop typing" , room => socket.in(room).emit("stop typing"));
    socket.on("notification recieved" , room => socket.in(room).emit("notification recieved"));

    socket.on("new message" , newMessage => {
        var chat = newMessage.chat;

        if(!chat.users) return console.log("Chat.users not defined");

        chat.users.forEach(user => {
            if(user._id == newMessage.sender._id) return;
            socket.in(user._id).emit("message recieved", newMessage); 
        })
    });
})