import User from'../Model/User.js';
import bcrypt  from 'bcryptjs';

export const findUserByEmail = async (email)=>{
    return await User.findOne({email});
}

export const findUserById = async(id)=>{
    return await User.findById(id)
};

export const createUser = async(userData)=>{
    const user = new User(userData);
    return await user.save()
} 

export const deleteUser = async(userId)=>{
    return await User.deleteOne({_id:userId})
}

export const comparePassword = async(plainPassword,hashedPassword)=>{
    return await bcrypt.compare(plainPassword,hashedPassword)
}

export const updateUser = async (userId,updateData)=>{
    return await  User.findByIdAndUpdate(userId,updateData,{ new:true})
}
