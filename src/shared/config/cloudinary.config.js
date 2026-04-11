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
    } catch (error) {
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

export const videoUpload = multer({
    storage: new CloudinaryStorage({
        cloudinary: cloudinary.v2,
        params: {
            folder: 'papyrus/seller-videos',
            resource_type: 'video',
            allowed_formats: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
            transformation: [
                { width: 1280, height: 720, crop: 'limit' },
                { quality: 'auto', fetch_format: 'auto' }
            ]
        }
    }),
    limits: {
        fileSize: 50 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed!'), false);
        }
    }
});

export const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.v2.uploader.destroy(publicId);
        return result;
    } catch (error) {
        throw error;
    }
};

export default cloudinary.v2;