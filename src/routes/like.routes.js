import { Router } from "express";
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {
    toogleCommentLike,
    toogleTweetLike,
    toggleVideoLike,
    getLikedVideos
} from "../controllers/like.controller.js"

const router =Router()
router.use(verifyJWT)

router.route("/toogle/v/:videoId").post(toggleVideoLike)
router.route("/toogle/v/:commentID").post(toogleCommentLike)
router.route("/toogle/v/:tweetId").post(toogleTweetLike)

router.route("/videos").get(getLikedVideos)

export default router