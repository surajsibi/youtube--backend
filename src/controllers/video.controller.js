import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js"
import {Like} from "../models/like.model.js"
import {Comment} from "../models/comment.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/Apierrors.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { dbWrapper } from "../utils/dbWrapper.js"
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"

const getAllVideos = dbWrapper(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    const pipeline = [];

    if (query) {
        pipeline.push({
            $match: {
                $text: {
                    $search: query
                }
            }
        })
    }
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userID")
        }
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        })
    }

    //fetch videos that are set isPublished true
    pipeline.push({
        $match: {
            isPublished: true
        }
    })

    //sortBy can be views createdAt duration
    //sortType can be ascending 1 or descending -1

    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType == "asc" ? 1 : -1
            }
        });
    } else {
        pipeline.push({
            $sort: {
                createdAt: -1
            }
        })
    }
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "ownerField"
        },
        $project: {
            username: 1,
            email: 1
        }
    })
    {
        $unwind: "$ownerField"
    }

    const videoAggregate = Video.aggregate(pipeline)
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const video = await Video.aggregatePaginate(videoAggregate, options)

    return res.status(200)
        .json(
            new ApiResponse(200, { video, videoAggregate }, "videos fetched successfully")
        )
})

//upload on cloudinary ,create video 
const publishVideo = dbWrapper(async (req, res) => {
    const { title, description } = req.body
    console.log(req.user._id);

    if ([title, description].some((field) => field.trim() === "")) {
        throw new ApiError(401, "title and description are required")
    }
    console.log(req.files);
    
    
    const videoFileLocalPath = req.files?.videoFile[0]?.path
    const thumbnailFileLocalPath = req.files?.thumbnail[0]?.path


    if (!videoFileLocalPath) {
        throw new ApiError(400, " Video file is required")
    }
    if (!thumbnailFileLocalPath) {
        throw new ApiError(400, " thumbnail file is required")
    }
    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    if (!videoFile) {
        throw new ApiError(400, "unable to upload video on server")
    }
    const thumbnailFile = await uploadOnCloudinary(thumbnailFileLocalPath)
    if (!thumbnailFile) {
        throw new ApiError(400, "unable to upload thumbnail on server")
    }
    
    

    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        owner: req.user._id,
        videoFile: {
            url: videoFile.url,
            publicId: videoFile.public_id
        },
        thumbnail: {
            url: thumbnailFile.url,
            publicId: thumbnailFile.public_id
        }
    })
    console.log(video);
    

    const videoUploader = await Video.findById(video._id)
    if (!videoUploader) {
        throw new ApiError(400, "videoUploader fail ")
    }
    return res.status(200)
        .json(
            new ApiResponse(200, { video, videoUploader }, "Video has been uploaded successfully")
        )
})

const getVideoById = dbWrapper(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) {
        throw new ApiError(400, "invalid request")
    }
    console.log(videoId);


    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
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
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            email: 1,
                            fullname: 1,
                        }
                    },
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"

                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id, "$subscribers.subscriber"
                                        ],
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullname: 1,
                            email: 1,
                            subscribersCount: 1,
                            isSubscribed: 1,


                        }
                    }

                ]

            }
        },
        {
            $addFields: {
                likeCounts: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isliked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false,
                    }
                }
            }

        },
        {
            $project: {
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                owner: 1,
                duration: 1,
                likeCounts: 1,
                isliked: 1,
            }
        }
    ])

    if (!video) {
        throw new ApiError(500, "failed to fetch data from the server")
    }
    //increment views if  video fetch successfully

    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        },

    }, { new: true })
    // add this video to user watch history
    await User.findByIdAndUpdate(req.user._id, {
        $addToSet: {
            watchHistory: videoId
        }
    }, { new: true })


    return res.status(200)
        .json(new ApiResponse(200, { video: video[0] }, "video detail fetched successfully"))


})
const updateThumbnail = dbWrapper(async (req, res) => {

    const { videoId } = req.params
    const {title,description} = req.body
    console.log({title,description});
    
     if(!(title && description)){
        throw new ApiError(401,"plz enter title and description")
     }

     if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

     if(!videoId){
        throw new ApiError(400,"video id not found")
     }
     const video = await Video.findById(videoId)
     if(!video){
        throw new ApiError(500,"video not found")
     }

     if(video?.owner?.toString() !== req.user?._id.toString()){
        throw new ApiError(400,"you can not edit the video as you are not the owner of the video")
     }

     //Deleting old thumbnail and updation it with new

     const thumbnailToDelete = video.thumbnail.publicId

     if(!thumbnailToDelete){
        throw new ApiError(500,"can not delete the old thumbnail")
     }

     const thumbnailFileLocalPath =req.file?.path

     if(!thumbnailFileLocalPath){
        throw new ApiError(400,"plz provide a thumbnail file")
     }

     const thumbnail = await uploadOnCloudinary(thumbnailFileLocalPath)
     if(!thumbnail){
        throw new ApiError(500,"somehting went wrong while uploading the thumbnail ")
     }
     

     const updateVideo = await Video.findByIdAndUpdate(videoId,{
        $set:{
            title,
            description,
            thumbnail:{
                publicId:thumbnail.public_id,
                url:thumbnail.url
            }
        },
       
     },{ $new:true})

     if(!updateVideo){
        throw new ApiError(500,"fail to update video plz try again")
     }
     const deleteImage =  await deleteOnCloudinary(thumbnailToDelete,"image")
     

     return res.status(200)
     .json(
        new ApiResponse(200,{updateVideo,deleteImage},"Video has been updated successfully")
     )


})
const deleteVideo = dbWrapper(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"invalid videoId")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(400,"no video found")
    }
    if(video?.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400,"you can not delete this video as you are not the owner of the video")
    }

    const videoDelete = await Video.findByIdAndDelete(videoId)
    if(!videoDelete){
        throw new ApiError(400,"unable to delete the video plz try again")
    }
    if(videoDelete){
        await deleteOnCloudinary(video.thumbnail.publicId)
        await deleteOnCloudinary(video.videoFile.publicId,"video")
    }
    if(videoDelete){
        await Like.deleteMany({
            video:videoId
        })

        await Comment.deleteMany({
            video:videoId
        })
    }

    return res.status(200)
    .json(
        new ApiResponse(200,"video deleted successfully")
    )

})
const togglePublishStatus = dbWrapper(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"not a valid videoId")
    }
    const video = await Video.findById(videoId)
    
    
    if(!video){
        throw new ApiError(400,"can not find the video")
    }

    if(video?.owner.toString() !== req.user?._id.toString())
    {
        throw new ApiError(400,"you can not edit toggle as you are not the owner of the video")
    }

    const toggleVideoPublished = await Video.findByIdAndUpdate(videoId,{
        $set:{
            isPublished:!video?.isPublished
        }
    },{
        $new:true
    })
   
    

    if(!toggleVideoPublished){
        throw new ApiError(400,"unable to toggle published")
    }

    return res.status(200)
    .json(new ApiResponse(200,{ isPublished: toggleVideoPublished.isPublished },"video publish toggle successfully"))


})

export {
    getAllVideos,
    publishVideo,
    getVideoById,
    updateThumbnail,
    deleteVideo,
    togglePublishStatus
}