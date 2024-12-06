import mongoose,{isValidObjectId} from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/Apierrors.js";
import { dbWrapper } from "../utils/dbWrapper.js";
import { Like } from "../models/like.model.js";



const toggleVideoLike = dbWrapper(async(req,res)=>{
    const {videoId} = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"invalid videoID")
    }

    const likeAlready = await Like.findOne({
        video:videoId,
        likedBy:req.user?._id
    })
    if(likeAlready){
        await Like.findByIdAndDelete(likeAlready._id)

        return res.status(200)
        .json(new ApiResponse(200,"unliked"))
    }
    else{
        await Like.create({
            video:videoId,
            likedBy:req.user?._id
        })
        return res.status(200)
        .json(new ApiResponse(200,"liked "))
    }


})

const toogleCommentLike = dbWrapper(async(req,res)=>{
    const {commentId} = req.params
    if(!isValidObjectId(commentId)){
        throw new ApiError(400,"not a valid comment")
    }
    const likeAlready = await Like.findOne({
        comment:commentId,
        likedBy:req.user._id
    })
    if(likeAlready){
        await Like.findByIdAndDelete(likeAlready._id)

        return res.status(200)
        .json(new ApiResponse(200,"unliked comment"))
    }
    else{
        await Like.create({
            comment:commentId,
            likedBy:req.user._id
        } )

        return res.status(200)
        .json(new ApiResponse(200,"liked comment"))
    }


})

const toogleTweetLike = dbWrapper(async(req, res)=>{

})

const getLikedVideos = dbWrapper(async(req, res)=>{

    const like = await Like.aggregate([
        {
            $match:{
                likedBy:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"likedVideos",
                pipeline:[
                    {
                        $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"ownerDetail"
                    }
                    },
                    {
                        $unwind:"$ownerDetail"
                    }
                ]
            }
        },
        {
            $unwind:"$likedVideos"
        },
        {
            $sort:{
                createdAt:-1
            }
        },
        {
            $project:{
                _id:1,
                likedVideos:{
                    _id:1,
                    "videoFile.url":1,
                    "thumbnail.url":1,
                    title:1,
                    description:1,
                    views:1,
                    duration:1,
                    ownerDetail:{
                        username:1,
                        avatar:1,
                        fullname:1,
                        email:1
                    }

                }
            }
        }
    ])

    if (!like?.length) {
        throw new ApiError(400, "like does not exist ")
      }

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            like[0],
            "liked videos fetched successfully"
        )
    )
    

})

export {
    getLikedVideos,
    toggleVideoLike,
    toogleCommentLike,
    toogleTweetLike
}