import mongoose,{isValidObjectId} from "mongoose";
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/Apierrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {dbWrapper} from "../utils/dbWrapper.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

const getAllVideos = dbWrapper(async(req,res)=>{
    const {page = 1,limit =10, query,sortBy,sortType,userId }  =req.query;
    console.log(userId);
    const pipeline = [];

    if(query){
        pipeline.push({
            $match:{
                $text:{
                    $search:query
                }
            }
        })
    }
    if(userId){
        if(!isValidObjectId(userId)){
            throw new ApiError(400,"Invalid userID")
        }
        pipeline.push({
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        })
    }

    //fetch videos that are set isPublished true
    pipeline.push({
        $match:{
            isPublished:true
        }
    })

    //sortBy can be views createdAt duration
    //sortType can be ascending 1 or descending -1

    if(sortBy && sortType){
        pipeline.push({
            $sort:{
                [sortBy]:sortType =="asc"?1:-1
            }
        });
    }else{
        pipeline.push({
            $sort:{
                createdAt:-1
            }
        })
    }
    pipeline.push({
        $lookup:{
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"ownerField"
        }
    })
    {
        $unwind:""
    }


})


const publishVideo = dbWrapper(async(req,res)=>{
    const {title,description} = req.body
})
const getVideoById = dbWrapper(async(req,res)=>{
    const {videoId} = req.params 
})
const updateVideo = dbWrapper(async(req,res)=>{
    const {videoId} = req.params
})
const deleteVideo = dbWrapper(async(req,res)=>{
    const {videoId} = req.params
})
const togglePublishStatus = dbWrapper(async(req,res)=>{
    const {videoId} = req.params
})

export {
    getAllVideos,
    publishVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}