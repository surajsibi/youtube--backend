import mongoose,{isValidObjectId} from "mongoose";
import {dbWrapper} from "../utils/dbWrapper.js"
import {ApiError} from "../utils/Apierrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import {Tweet} from "../models/tweet.model.js"

const createTweet = dbWrapper(async(req,res)=>{
    const {content} = req.body
    if(!content){
        throw new ApiError(400,"content is required")
    }
    const tweet = await Tweet.create({
        content,
        owner:req.user._id
    })

    if(!tweet){
        throw new ApiError(400,"can not create tweet")
    }
    return res.status(200)
    .json(new ApiResponse(200,tweet,"tweet created successfully"))
})

const updateTweet = dbWrapper(async(req,res)=>{
    const {tweetId} = req.params
    const {content} = req.body
    console.log(tweetId);
    
   
    

    if(!isValidObjectId(tweetId)){
        throw new ApiError(
            400,"not a valid tweet id"
        )
    }
    if(!content){
        throw new ApiError(400,"content is required")
    }
    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(400,"can not find tweet")
    }
    if(tweet.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400,"not a owner")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(tweetId,{
        $set:{
            content
        }
    },{new:true})

    if(!updatedTweet){
        throw new ApiError(400,"can not update tweet")
    }

    return res.status(200)
    .json(new ApiResponse(200,updatedTweet,"tweet updated successfully"))
})

const deleteTweet = dbWrapper(async(req,res)=>{
    const {tweetId} = req.params

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"invalid tweetId")
    }

    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(400,"can not find tweet")
    }

    if(tweet.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400,"not a owner")
    }

   const  deletedTweet = await Tweet.findByIdAndDelete(tweetId)

   if(!deletedTweet){
    throw new ApiError(400,"upable to delete tweet")
   }
   return res.status(200)
   .json(new ApiResponse(200,deletedTweet,"tweet delted successfully"))

})

const getUserTweet = dbWrapper(async(req,res)=>{
    const {userId} = req.params

    if(!isValidObjectId(userId)){
        throw new ApiError(400,"not a vaid userId")
    }

    const tweet = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likeDetails",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likeDetails",
                },
                ownerDetails: {
                    $first: "$ownerDetails",
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likeDetails.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            },
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1
            },
        },
    ]);

    if(!tweet){
        throw new ApiError(400,"can not find tweet")
    }
    console.log(tweet)

    return res.status(200)
    .json(new ApiResponse(200,tweet,"tweet fetched successfully"))
})

export {
    createTweet,
    updateTweet,
    deleteTweet,
    getUserTweet
}