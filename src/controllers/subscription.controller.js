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
                                $size:"$subscriber"
                            }
                        }
                    }
                ]
            }
        }
    ])
})


export {
    toggleSubscription
}