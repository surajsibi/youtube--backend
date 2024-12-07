import mongoose, { isValidObjectId } from "mongoose";
import {Subscription} from "../models/subscription.model.js"
import {ApiError} from "../utils/Apierrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {dbWrapper} from "../utils/dbWrapper.js"

const toggleSubscription = dbWrapper(async(req,res)=>{
    const {channelId} = req.params
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"not a valid channelId")
    }

    const isSubscribe = await Subscription.findOne({
        subscriber:req.user._id,
        channel:channelId
    })

    if(isSubscribe){
        await Subscription.findByIdAndDelete(isSubscribe._id)
        return res
        .status(200)
        .json(new ApiResponse(200,isSubscribe,"unsubscribe successfully"))
    }
    await Subscription.create({
        subscriber:req.user._id,
        channel:channelId
    })

    return res
    .status(200)
    .json(new ApiResponse(200,isSubscribe,"subscribed successfully"))
})

//controller to return subscriber list of a channel


const getUserChannelSubscribers =dbWrapper(async(req,res)=>{
    const {channelId} =req.params
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"not a vaild id")
    }
    const subscriber = await Subscription.aggregate([
        {
            $match:{
                channel:new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscriber",
                pipeline:[
                    {
                        $lookup:{
                            from:"subscriptions",
                            localField:"_id",
                            foreignField:"channel",
                            as:"subscribedToSubscriber"
                        }
                    },
                    {
                        $addFields:{
                            subscribedToSubscriber:{
                                $cond:{
                                    if:{
                                        $in:[new mongoose.Types.ObjectId(channelId),"$subscribedToSubscriber.subscriber"]
                                    },
                                    then:true,
                                    else:false
                                },
                                
                            },
                            subscriberCount:{
                                $size:"$subscribedToSubscriber"
                            }
                        }
                    }
                ]
            }
        },{
            $unwind:"$subscriber"
        },{
            $project:{
                _id:1,
                subscriber:{
                    _id:1,
                    username:1,
                    fullname:1,
                    email:1,
                    "avatar.url":1,
                    subscribedToSubscriber:1,
                    subscriberCount:1
                }
            }
        }
    ])

    if(!subscriber){
        throw new ApiError(400,"can not fetch subscriber")
    }
     return res.status(200)
     .json(new ApiResponse(200,subscriber,"fetched successfully"))
})


// get all the channel to which user has subscriber
const getSubscriberChannels = dbWrapper(async(req,res)=>{
    const {subscriberId } = req.params

    const  subscribedChannel = await Subscription.aggregate([
        {
            $match:{
                subscriber:new mongoose.Types.ObjectId(subscriberId)
            }
        },{
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"subscribedChannel",
                pipeline:[
                    {
                        $lookup:{
                            from:"videos",
                            localField:"_id",
                            foreignField:"owner",
                            as:"videos"
                        }
                    },
                    {
                        $addFields:{
                            latestVideo:{
                                $last:"$videos"
                            }
                        }
                    }
                ]

            }
        },{
            $unwind:"$subscribedChannel"
        },{
            $project:{
                _id:1,
                subscribedChannel:{
                    _id:1,
                    username:1,
                    fullname:1,
                    avtar:1,
                    videos:{
                        _id:1,
                        title:1,
                    },
                    latestVideo:{
                        _id: 1,
                        "videoFile.url": 1,
                        "thumbnail.url": 1,
                        owner: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        createdAt: 1,
                        views: 1

                    }
                }
            }
        }
    ])
    if(!subscribedChannel){
        throw new ApiError(400,"aggregate pipeline problem")
    }
    return res.status(200)
    .json(new ApiResponse(200,subscribedChannel[0],"channel fetched successfully"))

})


export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscriberChannels
}