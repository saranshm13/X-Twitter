const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require("body-parser")
const bcrypt = require("bcrypt");
const mongoose = require('mongoose');
const User = require('../schema/UserSchema');
const Chat = require('../schema/ChatSchema');


router.get("/", (req, res, next) => {
    
    var payload = {
        pageTitle: "Inbox",
        userLoggedIn: req.session.user,
        userLoggedInJS: JSON.stringify(req.session.user),
    };

    res.status(200).render("inboxPage", payload);
})

router.get("/new", (req, res, next) => {
    
    var payload = {
        pageTitle: "New message",
        userLoggedIn: req.session.user,
        userLoggedInJS: JSON.stringify(req.session.user),
    };

    res.status(200).render("newMessage", payload);
})

router.get("/:chatId", async (req, res, next) => {

    var userId = req.session.user._id;
    var chatId = req.params.chatId;

    var payload = {
        pageTitle: "Chat",
        userLoggedIn: req.session.user,
        userLoggedInJS: JSON.stringify(req.session.user),
    };

    if(!mongoose.isValidObjectId(chatId)) {
        payload.errorMessage = "Chat not exist or no permission";
        return res.status(200).render("chatPage", payload);
    }

    var chat = await Chat.findOne({_id: chatId, users: { $elemMatch: {$eq: userId } } })
    .populate("users");

    if(chat == null ) {
        // to check now if the chat ws not group but just a normal dm
        var userFound = await User.findById(chatId);

        if(userFound != null) {
            chat = await getChatByUserId(userFound._id, userId)
        }
    }

    if(chat == null) {
        payload.errorMessage = "Chat not exist or no permission";
    }
    else {
        payload.chat = chat;
    }

    res.status(200).render("chatPage", payload);
})

function getChatByUserId(userLoggedInId, otherUserId) {
    return Chat.findOneAndUpdate({
        isGroupChat: false,
        users: {
            $size: 2,
            $all: [
                { $elemMatch: { $eq: new mongoose.Types.ObjectId(userLoggedInId) }},
                { $elemMatch: { $eq: new mongoose.Types.ObjectId(otherUserId) }}
            ]
        }
    }, 
    {
        $setOnInsert: {
            users: [userLoggedInId, otherUserId]
        }
    }, 
    {
        new: true,
        upsert: true
    })
    .populate("users")
    .catch(error => {
        console.log(" Chat cannot be created");
        res.sendStatus(400);
    })
}

module.exports = router;

