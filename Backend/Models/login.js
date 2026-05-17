
import mongoose from 'mongoose';

const LoginSchema=new mongoose.Schema({
    email:String,
    password:String
});

const Login=mongoose.model('login',LoginSchema);

export default Login;
