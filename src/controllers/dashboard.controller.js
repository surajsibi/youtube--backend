import { dbWrapper } from "../utils/dbWrapper.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/Apierrors.js"
import { Subscription } from "../models/subscription.model.js"
import { Video } from "../models/video.model.js"
import mongoose, { isValidObjectId } from "mongoose"



const getChannelStats = dbWrapper(async (req, res) => {
    const userId = req.user._id


    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "invalid userId")
    }



    const totalSubscriber = await Subscription.aggregate([
        {
            $match: { channel: new mongoose.Types.ObjectId(userId) }
        },
        {
            $group: {
                _id: null,
                subscriberCount: {
                    $sum: 1
                }
            }
        }
    ])
    const video = await Video.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $project: {
                totalLikes: {
                    $size: "$likes"
                },
                totalViews: "$views",
                totalVideos: 1

            }
        }, {
            $group: {
                _id: null,
                totalLikes: {
                    $sum: "$totalLikes",
                },
                totalVideos: {
                    $sum: 1
                },
                totalViews: {
                    $sum: "$totalViews"
                }
            }
        }
    ])
    console.log(totalSubscriber);
    console.log(video);


    const channelStats = {
        totalSubscriber: totalSubscriber[0]?.subscriberCount || 0,
        totalLikes: video[0]?.totalLikes || 0,
        totalViews: video[0]?.totalViews || 0,
        totalVideos: video[0]?.totalVideos || 0
    };
    if (!channelStats) {
        throw new ApiError(400, "fail to fetch channel stats ")
    }
    return res.status(200)
        .json(new ApiResponse(200, channelStats, "channel stats fetched successfully"))

})

const getChannelVideos = dbWrapper(async (req, res) => {
    const userId = req.user?._id
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "not a valid id")
    }
     const video = await Video.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes"
            }
        },{
            $addFields:{
                createdAt:{
                    $dateToParts:{
                        date:"$createdAt"
                    },
                },
                likeCount:{
                    $size:"$likes"
                }
            }
        },{
            $sort:{
                createdAt:-1
            }
        },{
            $project:{
                _id:1,
                "videoFile_url":1,
                "thumbnail.url":1,
                title:1,
                description:1,
                createdAt:{
                    year:1,
                    month:1,
                    day:1
                },
                isPublished:1,
                likeCount:1
            }
        }
     ])
     if(!video){
        throw new ApiError(400,"can not found video")
     }

     return res.status(200)
     .json(new ApiResponse(200,video,"channel video fetched successfully"))
})

export {
    getChannelStats,
    getChannelVideos
}