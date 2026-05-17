
import mongoose from 'mongoose';

const SignupSchema=new mongoose.Schema({
    username:String,
    email:String,
    password:String
});

const Signup=mongoose.model('signup',SignupSchema);

export default Signup;