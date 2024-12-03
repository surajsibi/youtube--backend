import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'
import { ApiError } from './Apierrors.js';


  cloudinary.config({ 
    cloud_name:process.env.CLOUD_NAME , 
    api_key: process.env.CLOUD_API, 
    api_secret: process.env.CLOUD_SECRET
  });

  const uploadOnCloudinary = async (localFilePath) =>{
    try {
        if (!localFilePath) return null
       
        
        //upload the file on clodinary
       const response =  await  cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto"
        })
        // console.log(response);
        
        //file had been uploaded successfull
        // console.log("file is uploaded on cloudinary",response.url)
        fs.unlinkSync(localFilePath)
        return response

    } catch (error) {
        fs.unlinkSync(localFilePath) // removed the locally saved temporary file as the upload operation got failed
        return null
    }
  }


  const deleteOnCloudinary = async(public_id,resource_type="image")=>{
    try {
      if(!public_id){
        throw new ApiError(500,"unable to get id")
        
      }
      //delete from cloudinary
      const result = await cloudinary.uploader.destroy(public_id,{
        resource_type: resource_type
      }); 
      return result;
    } catch (error) {
      console.error("Delete from Cloudinary failed:", error);
      throw new ApiError(500, "Cloudinary deletion failed") 
    }
  }

  export  {uploadOnCloudinary,deleteOnCloudinary}

  