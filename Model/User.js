import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const userSchema = new mongoose.Schema({
    firstName:{
        type:String,
        required:true,
        trim:true
    },
    lastName:{
        type:String,
        required:true,
        trim:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    password:{
        type:String,
        required:function(){
            return !this.googleId;
        }
    },
    phone:{
        type:String,
        trim:true
    },
    dateOfBirth:{
        type:Date
    },
    gender:{
        type:String,
        default: null
    },
    bio:{
        type:String,
        maxlength:500
    },
    favoriteGenre:{
        type:String,
        default: null
    },
    primaryInterest:{
        type:String,
        default: null
    },
    readingGoal:{
        type:Number,
        min:1,
        max:365
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    otp:{
        code:String,
        expiresAt:Date
    },
    emailChangeRequest:{
        newEmail:String,
        otp:{
            code:String,
            expiresAt:Date
        }
    },
    googleId:String,
    profilePicture:{
        type:String,
        default:'/images/default-avatar.png'
    },
    role:{
        type:String,
        enum:['user','admin'],
        default:'user'
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    lastLogin:Date
},{
    timestamps:true
})
userSchema.pre('save', async function() {
    try {
        if (this.gender === '') this.gender = null;
        if (this.favoriteGenre === '') this.favoriteGenre = null;
        if (this.primaryInterest === '') this.primaryInterest = null;
        
        if (!this.isModified('password') || !this.password) {
            return;
        }
        
        if (this.password.startsWith('$2')) {
            return;
        }
        
        this.password = await bcrypt.hash(this.password, 12);
    } catch (error) {
        console.error('Pre-save error:', error);
        throw error;
    }
});
const User=mongoose.model('User',userSchema);
export default User;