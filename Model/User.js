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
        enum:['male','female','other','prefer-not']
    },
    bio:{
        type:String,
        maxlength:500
    },
    favoriteGenre:{
        type:String,
        enum:['literary-fiction','mystery','sci-fi','fantasy','biography','history','poetry','classics']
    },
    primaryInterest:{
        type:String,
        enum:['rare-editions','signed-copies','vintage-books','modern-classics','collectibles']
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
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});
const User=mongoose.model('User',userSchema);
export default User;