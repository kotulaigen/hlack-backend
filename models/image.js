const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
    img: String,
});

module.exports =  new mongoose.model("Image", imageSchema)