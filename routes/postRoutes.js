const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require("body-parser")
const bcrypt = require("bcrypt");
const User = require('../schema/UserSchema');


router.get("/:id", (req, res, next) => {
    
    var payload = {
        pageTitle: "View post",
        userLoggedIn: req.session.user,
        userLoggedInJS: JSON.stringify(req.session.user),
        postId: req.params.id
    }

    res.status(200).render("postPage", payload);
    
})


module.exports = router;