import { Router } from "express";
import {
    addComment,
    deleteComment,
    getVideoComment,
    updateComment,
} from "../controllers/comments.controller.js"

import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

router.use(verifyJWT)

router.route("/:videoId")
.get(getVideoComment)
.post(addComment)

router.route("/c/:commentId")
.delete(deleteComment)
.patch(updateComment)

export default router;