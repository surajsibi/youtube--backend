import { Playlist } from "../models/playlist.model.js"
import { Video } from "../models/video.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/Apierrors.js"
import { dbWrapper } from "../utils/dbWrapper.js"
import mongoose, { isValidObjectId, Schema } from "mongoose"

const createPlaylist = dbWrapper(async (req, res) => {
    const { name, description } = req.body

    if (!name || !description) {
        throw new ApiError(400, "name and description is required")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    if (!playlist) {
        throw new ApiError(400, "failed to create playlist")
    }
    return res.status(200)
        .json(
            new ApiResponse(200, playlist, "playlist created successfully")
        )

})

const updatePlaylist = dbWrapper(async (req, res) => {
    const { name, description } = req.body;
    const { playlistId } = req.params
    if (!name || !description) {
        throw new ApiError(400, "name and description field can not be empty")
    }
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "playlist id is not a valid id")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(400, "playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(400, "only owner can update playlist ")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
        $set: {
            name,
            description
        }
    }, { new: true })



    return res.status(200)
        .json(new ApiResponse(200, updatedPlaylist, "playlist updated successfully"))
})

const deletePlaylist = dbWrapper(async (req, res) => {
    const { playlistId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "not a vaild playlistID")
    }
    console.log(playlistId);


    const playlist = await Playlist.findById(playlistId)

    console.log(playlist);


    if (!playlist) {
        throw new ApiError(
            400, " can not find playlist"
        )
    }
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(400, "only owner can delete playlist")
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res.status(200)
        .json(
            new ApiResponse(200, "playlist deleted successfully")
        )

})

const addVideoToPlaylist = dbWrapper(async (req, res) => {
    const {videoId,playlistId} = req.params
    if(!isValidObjectId(videoId) || !isValidObjectId(playlistId)){
        throw new ApiError(400,"invalid playlist or videoid")
    }

    const video = await Video.findById(videoId)
    const playlist = await Playlist.findById(playlistId)

    if(!video){
        throw new ApiError(400,"can not find video")
    }
    if(!playlist){
        throw new ApiError(400,"can not find playlist")
    }

    if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400,"only the owner add to playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,{
        $addToSet:{
            videos:videoId
        },

    },{new:true})

    if(!updatedPlaylist){
        throw new ApiError(400,"unable to add the song in the playlist")
    }

    return res.status(200)
    .json(new ApiResponse(200,updatedPlaylist,"song added successfully"))

})

const removeVideoFromPlaylist = dbWrapper(async (req, res) => {
    const {playlistId,videoId} = req.params

    if(!isValidObjectId(playlistId) !== !isValidObjectId(videoId)){
        throw new ApiError(400,"not a valid id")
    }
    const video = await Video.findById(videoId)
    const playlist = await Playlist.findById(playlistId)
    
//     const playlistFind = await Playlist.findOne({ videos: videoId });
// const haveVideoIdInPlaylist = !!playlistFind; // true if found, false otherwise



    
    

    if(!video){
        throw new ApiError(400,"can not find video")
    }
    if(!playlist){
        throw new ApiError(400,"can not find playlist")
    }

    if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400,"only owner can update")
    }

    

    const deleteVideo = await Playlist.findByIdAndUpdate(playlistId,{
        $pull:{
            videos:videoId
        }
    },{new:true})

    return res.status(200)
    .json(new ApiResponse(200,deleteVideo,"video removed successfully"))

})

const getPlaylistById = dbWrapper(async (req, res) => {
    const {playlistId} =req.params

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"invalid playlistId")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(400,"playlist not found")
    }

    const playlistVideo = await Playlist.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos"
            }
        },
        {
            $match:{
                "videos.isPublished":true
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner"
            }
        },
        {
            $addFields:{
                totalVideos:{
                    $size:"$videos"
                },
                totalViews:{
                    $sum:"$videos.views"
                },
                owner:{
                    $first:"$owner"
                }     
            },

        },
        {
            $project:{
                name:1,
                description:1,
                createdAt:1,
                updatedAt:1,
                totalVideos:1,
                totalViews:1,
                videos:{
                    _id:1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1
                },
                owner:{
                    username:1,
                    fullname:1,
                    "avatar.url": 1
                }
            }
        }
    ])

    return res.status(200)
    .json(new ApiResponse(200,playlistVideo,"playlist fetched successfully"))

})

const getUserPlaylists = dbWrapper(async (req, res) => {
    const {userId} = req.params
    if(!isValidObjectId(userId)){
        throw new ApiError(400,"invalid userId")
    }
    const playlist = await Playlist.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos"
            }
        },
        {
            $addFields:{
                totalVideos:{
                    $size:"$videos"
                },
                totalViews:{
                    $sum:"$videos.views"
                }
            }
        },
        {
            $project:{
                _id:1,
                name:1,
                description:1,
                totalVideos:1,
                totalViews:1,
                createdAt:1,
                updatedAt:1
            }
        }
    ])
    return res.status(200)
    .json(new ApiResponse(200,playlist,"playlist fetched successfully"))

})

export {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById,
    getUserPlaylists
}