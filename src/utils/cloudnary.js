import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'


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
        console.log(response);
        
        //file had been uploaded successfull
        console.log("file is uploaded on cloudinary",response.url)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) // removed the locally saved temporary file as the upload operation got failed
        return null
    }
  }
  export  {uploadOnCloudinary}

  