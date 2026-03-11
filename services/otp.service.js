export const generateOTP = ()=>{
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export const setOTP = (user)=>{
    const otp = generateOTP();
    user.otp={
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    };
    console.log(`otp : ${otp}`); 
    return otp;
}

export const verifyOTP = (user,enteredOTP)=>{
    if(!user.otp || !user.otp.code){
        return {success: false,message:" No OTP found"}
    }
    if(new Date() > user.otp.expiresAt){
        return { success :false,message:"OTP expired"}
    }
    if(user.otp.code!== enteredOTP){
        return {success:false,message:"Invalid OTP"}
    }
    return { success : true,message:"OTP verified"}
    
}

export const clearOTP=(user)=>{
    user.otp = undefined
}
