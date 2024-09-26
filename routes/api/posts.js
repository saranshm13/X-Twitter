const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require("body-parser")
const User = require('../../schema/UserSchema');
const Post = require('../../schema/PostSchema');
const Notification = require('../../schema/NotificationSchema');

app.use(bodyParser.urlencoded({ extended: false }));

router.get("/", async (req, res, next) => {
    // Post.find()
    // .populate("postedBy")
    // .populate("retweetData")
    // .sort({ "createdAt": -1})
    // .then(async results => {
    //     results = await User.populate(results, {path: "retweetData.postedBy "});
    //     res.status(200).send(results)
    // })
    // .catch(error => {
    //     console.log(error);
    //     res.sendStatus(400);
    // })
    var searchObj = req.query;

    if(searchObj.isReply !== undefined) {
        var isReply = searchObj.isReply == "true";
        // mongoDb operator $exists
        searchObj.replyTo = { $exists: isReply};
        delete searchObj.isReply;
    }

    if(searchObj.search !== undefined) {
        searchObj.content = { $regex: searchObj.search, $options: "i" };
        delete searchObj.search;
    }

    if(searchObj.followingOnly !== undefined) {
        var followingOnly = searchObj.followingOnly == "true";

        if(followingOnly) {
            var objectIds = []; 
            
            if(!req.session.user.following) {
                req.session.user.following=[];
            }
            req.session.user.following.forEach( user => {
                objectIds.push(user);
            })

            objectIds.push(req.session.user._id);
    
            searchObj.postedBy = { $in: objectIds};
        }
       
        delete searchObj.followingOnly;
    }

    var results = await getPosts(searchObj);
    res.status(200).send(results)
})


router.get("/:id", async (req, res, next) => {
    var postId = req.params.id;
    var postData = await getPosts({_id: postId});
    postData = postData[0];

    var results = {
        postData: postData,
    }

    if(postData.replyTo !== undefined) {
        results.replyTo = postData.replyTo
    }

    results.replies = await getPosts( { replyTo: postId })
    res.status(200).send(results)
})

router.post("/", async (req, res, next) => {

    if (!req.body.content) {
        console.log("Content param not sent with request");
        return res.sendStatus(400);
    }

    var postData = {
        content: req.body.content,
        postedBy: req.session.user
    }

    if(req.body.replyTo) {
        postData.replyTo = req.body.replyTo;
    }

    Post.create(postData)
    .then(async newPost => {
        newPost = await User.populate(newPost, { path: "postedBy" });
        newPost = await Post.populate(newPost, { path: "replyTo" });

        if(newPost.replyTo !== undefined) {
                await Notification.insertNotification(newPost.replyTo.postedBy, req.session.user._id, "reply", newPost._id);
            
        }
        res.status(201).send(newPost);
    })
    .catch(error => {
        console.log(error);
        res.sendStatus(400);
    })
})

router.put("/:id/like", async (req, res, next) => {
    var postId = req.params.id; 
    var userId = req.session.user._id;

    var isLiked = req.session.user.likes && req.session.user.likes.includes(postId);

    var option = isLiked ? "$pull" : "$addToSet";

    // user like
    req.session.user = await User.findByIdAndUpdate(userId, { [option]: {likes: postId} } , {new: true})
    .catch( error => {
        console.log(error);
        res.sendStatus(400);
    })
    // post like
    var post = await Post.findByIdAndUpdate(postId, { [option]: {likes: userId} } , {new: true})        
    .catch( error => {
        console.log(error);
        res.sendStatus(400);
    })

    if(!isLiked) {
        await Notification.insertNotification(post.postedBy, userId, "postLike", post._id);
    }

    res.status(200).send(post);       
})

router.post("/:id/retweet", async (req, res, next) => {

    var postId = req.params.id; 
    var userId = req.session.user._id;

    // deleting post
    var deletedPost = await Post.findOneAndDelete( {postedBy: userId, retweetData: postId})  
    .catch( error => {
        console.log(error);
        res.sendStatus(400);
    }) 
    // deletedPost != null that means already retweeted , by this particular user and this particular post 
    var option = deletedPost!=null ? "$pull" : "$addToSet";

    var repost = deletedPost;

    // retweet data if present that means its a retweet and retweet data would represent the actual post id
    if(repost == null) {
        repost = await Post.create({ postedBy: userId, retweetData: postId})
        .catch( error => {
            console.log(error);
            res.sendStatus(400);
        }) 
    }

    // user retweet
    req.session.user = await User.findByIdAndUpdate(userId, { [option]: {retweets: repost._id} } , {new: true})
    .catch( error => {
        console.log(error);
        res.sendStatus(400);
    })
    // post retweet
    var post = await Post.findByIdAndUpdate(postId, { [option]: {retweetUsers: userId} } , {new: true})        
    .catch( error => {
        console.log(error);
        res.sendStatus(400);
    })

    if(!deletedPost) {
        await Notification.insertNotification(post.postedBy, userId, "retweet", post._id);
    }

    res.status(200).send(post);       
})

router.put("/:id", async (req, res, next) => {
    if(req.body.pinned !== undefined)   {
        await Post.updateMany({postedBy: req.session.user}, {pinned: false})
        .catch( error => {
            console.log(error);
            res.sendStatus(400);
        }) 
    }
    
    Post.findByIdAndUpdate(req.params.id, req.body)
    .then(()=> res.sendStatus(204))
    .catch(error => {
        console.log(error);
        res.sendStatus(400);
    })
})

async function getPosts(filter) {
    var results = await Post.find(filter)
    .populate("postedBy")
    .populate("retweetData")
    .populate("replyTo")
    .sort({ "createdAt": -1})
    .catch(error => console.log(error) ) 

    // populating the postedBy field inside the replyTo
    results = await User.populate(results, {path: "replyTo.postedBy "});
    return await User.populate(results, {path: "retweetData.postedBy "});
    
}
module.exports = router;