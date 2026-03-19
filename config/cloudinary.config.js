import cloudinary from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const testCloudinaryConnection = async () => {
    try {
        await cloudinary.v2.api.ping();
        console.log('Cloudinary connected successfully');
    } catch (error) {
        console.error('Cloudinary connection failed:', error.message);
    }
};

testCloudinaryConnection();

const storage = new CloudinaryStorage({
    cloudinary: cloudinary.v2,
    params: {
        folder: 'papyrus/profile-pictures',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
        ]
    }
});

export const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

export const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.v2.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
};

export default cloudinary.v2;