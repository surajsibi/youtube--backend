import {ApiError} from '../utils/Apierrors.js'
import {dbWrapper} from "../utils/dbWrapper.js"
import jwt from "jsonwebtoken"
import {User} from  "../models/user.model.js"

export const verifyJWT = dbWrapper(async(req,res,next)=>{
try {
    const token =  req.cookies?.accessToken || req.header("Authentication")?.replace("Bearer ","")

    
  
    if(!token){
      throw new ApiError(401,"unauthorized request")
    }
  
    const decodeedToken =   jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
  
   const user = await User.findById(decodeedToken?._id).select("-password -refreshToken")
    if(!user){
      throw new ApiError(401,"Invalid Access Token")  }
  
      req.user = user;
      next()
} catch (error) {
  throw new ApiError(400,error?.message || "invalid access token " )
}

})