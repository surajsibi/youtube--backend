import {dbWrapper} from "../utils/dbWrapper.js"
import {ApiError} from "../utils/Apierrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const healthCheck = dbWrapper(async(req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200,"everthing is good"))
})

export {healthCheck}