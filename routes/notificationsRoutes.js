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
        pageTitle: "Notifications",
        userLoggedIn: req.session.user,
        userLoggedInJS: JSON.stringify(req.session.user),
    };

    res.status(200).render("notificationsPage", payload);
})

module.exports = router;

