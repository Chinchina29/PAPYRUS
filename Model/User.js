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
            return !this.googleId && !this.facebookId;
        }
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    otp:{
        code:String,
        expiresAt:Date
    },
    googleId:String,
    facebookId:String,
    profilePicture:{
        type:String,
        default:'/images/default-avatar.png'
    },
    lastLogin:Date
},{
    timestamps:true
})
userSchema.pre('save',async function(next){
    if(!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password,12);
    next();
})
const User=mongoose.model('User',userSchema);
export default User;