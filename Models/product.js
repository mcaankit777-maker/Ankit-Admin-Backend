import mongoose from 'mongoose';

const ProductSchema=new mongoose.Schema({
    productName:String,
    productModel:Number,
    productPrice:Number,
    productImage:String
});

const Product=mongoose.model('product',ProductSchema);

export default Product;