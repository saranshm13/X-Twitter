const mongoose = require('mongoose');
// mongoose.set('useFindandModify', false);
// mongoose.set('useUnifiedTopology', true);
require("dotenv").config();

class Database {
    constructor() {
        this.connect()
    }

    connect() {
        mongoose.connect(process.env.DATABASE)
        .then(() => {
            console.log("Connection successful");
        })
        .catch((err) => {
            console.log("Connection error" + err);
        })
    }
}

module.exports = new Database();