import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema({

    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    Videos: {
        type: Schema.Types.ObjectId,
        ref: "Videos"
    },
    owner:{
        types:Schema.Types.ObjectId,
        ref:"User"
    }
}, { timestamps: true })

export const Playlist = mongoose.model("Playlist", playlistSchema)