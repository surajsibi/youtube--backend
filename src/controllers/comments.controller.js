import mongoose, { isValidObjectId, Schema } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/Apierrors.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { dbWrapper } from "../utils/dbWrapper.js"


// get all comments for a video
const getVideoComment = dbWrapper(async (req, res) => {
    const { videoId } = req.params
    const {page=1,limit=10} = req.query
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid videoID")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "can not find video")
    }

    const commentAggregate =  Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"comment",
                as:"likes"
            }
        },
        {
            $addFields:{
                likesCount:{
                    $size:"$likes"
                },
                isLiked:{
                    $cond:{
                        if:{
                            $in:[req.user._id ,"$likes.likedBy"]
                        },
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $sort:{createdAt: -1 }
        },
        {
            $project:{
                content:1,
                likesCount:1,
                isLiked:1,
                createdAt:1

            }
        }
        

    ])
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const comments = await Comment.aggregatePaginate(
        commentAggregate,
        options
    );


    return res.status(200)
    .json(new ApiResponse(200,comments,"comments fetched successfully"))

})

//add comment to a video
const addComment = dbWrapper(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid videoId")
    }

    if (!content) {
        throw new ApiError(400, "didnt recived content")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "video not found")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    if (!comment) {
        throw new ApiError(400, "comment not created")
    }

    return res.status(200)
        .json(
            new ApiResponse(200, comment, "comment created successfully")
        )

})

//delete comment
const deleteComment = dbWrapper(async (req, res) => {
    const { commentId } = req.params
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "not a valid commentID")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(400, "can not find comment")
    }
    const deletedComment = await Comment.findByIdAndDelete(commentId)

    await Like.deleteOne({
        comment: commentId,
    })

    return res.status(200)
        .json(new ApiResponse(200, deleteComment, "comment deleted successfully"))
})

//update Comment
const updateComment = dbWrapper(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "commentId is not a valid comment")
    }

    if (!content) {
        throw new ApiError(400, "content is required")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(400, "can not find comment")

    }


    if (!comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(400, "only owner can update the comment")
    }



    const updatedComment = await Comment.findByIdAndUpdate(commentId, {
        $set: {
            content
        }
    }, {
        new: true
    })
    if (!updateComment) {
        throw new ApiError(400, "fail to update comment")
    }

    return res.status(200)
        .json(new ApiResponse(200, updatedComment, "comment updated successfully"))

})

export {
    addComment,
    getVideoComment,
    deleteComment,
    updateComment
}