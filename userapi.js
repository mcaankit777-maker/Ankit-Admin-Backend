import Signup from './Models/signup.js';
import Login from './Models/login.js';
import Employee from './Models/employee.js';
import Product from './Models/product.js';
import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import Razorpay from "razorpay";
import dotenv from 'dotenv';

dotenv.config();


mongoose.connect(process.env.MONGO_URL)
.then(()=>console.log('Monogo Database Connected'))
.catch(error=>console.log('Database Not Connected'));


const app=express();

app.use(express.json());
app.use(cors());

// for Upload Image

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });



app.use('/uploads', express.static('uploads'));

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});




app.post("/create-order", async (req, res) => {
  try {
    const options = {
      amount: req.body.amount * 100, // amount in paise
      currency: "INR",
      receipt: "receipt#1"
    };
    const order = await instance.orders.create(options);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post("/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generated_signature === razorpay_signature) {
    res.json({ status: "success" });
  } else {
    res.json({ status: "failure" });
  }
});

// Post Employee

app.post('/employee',async(req,res)=>{
  try {
    const newEmployee=new Employee({
      employeeName:req.body.employeeName,
      employeeAge:req.body.employeeAge,
      employeeLocation:req.body.employeeLocation,
      employeeContact:req.body.employeeContact
    })
    await newEmployee.save();
    res.status(200).json({message:'Employee Created',Employee:newEmployee});
  } catch (error) {
    res.status(500).json({message:'Employee Not Created'})
  }
})

// Get Employee

app.get('/employee',async(req,res)=>{
  try {
    const getEmployee=await Employee.find();
    res.json(getEmployee);
  } catch (error) {
    res.status(500).json({message:'Employee Cannot Be Shown'});
  }
})

// Update Employee

app.put('/employee/:id',async(req,res)=>{
  try {
    const updateEmployee=await Employee.findByIdAndUpdate(req.params.id,{
       employeeName:req.body.employeeName,
      employeeAge:req.body.employeeAge,
      employeeLocation:req.body.employeeLocation,
      employeeContact:req.body.employeeContact
    },{new:true})
    res.status(200).json({message:'Employee Updated',Employee:updateEmployee});
  } catch (error) {
    res.status(500).json({message:'Employee Not Updated'});
  }
});

// Delete Employee

app.delete('/employee/:id',async(req,res)=>{
  try {
    const deleteEmployee=await Employee.findByIdAndDelete(req.params.id)
    res.status(200).json({message:'Employee Deleted'});
  } catch (error) {
    res.status(500).json({message:'Employee Not Deleted'});
  }
});



// Signup
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcryptjs.hash(password, 10);
  const signupuser = new Signup({ username, email, password: hashedPassword });
  await signupuser.save();
  res.json({ message: 'User created successfully' });
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  
  const user = await Signup.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  
  const isMatch = await bcryptjs.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  
 const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'SECRET_KEY', { expiresIn: '1h' });

  res.json({ token });
});

// using Token

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'SECRET_KEY');
    req.userId = decoded.userId; // attach userId to request
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Get Profile

// Profile route
app.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await Signup.findById(req.userId).select('-password'); // exclude password
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


// Post Product

app.post('/product', upload.single('productImage'), async (req, res) => {
  try {
    const { productName, productModel, productPrice } = req.body;
    const newProduct = new Product({
      productName,
      productModel,
      productPrice,
      productImage: req.file ? `/uploads/${req.file.filename}` : null
    });
    await newProduct.save();
    res.json({ message: 'Product Created', Product: newProduct });
  } catch (error) {
    res.status(500).json({ message: 'Product Not Created', error: error.message });
  }
});


// Get Product

app.get('/product',async(req,res)=>{
  try {
    const product=await Product.find();
    res.json(product);
  } catch (error) {
  res.status(500).json({message:'Product Not Shown'});
  }
});

// Update Product

// Assuming you already configured Multer as `upload`

app.put('/product/:id', upload.single('productImage'), async (req, res) => {
  try {
    const { productName, productModel, productPrice } = req.body;

    // Build update object dynamically
    const updateData = {
      productName,
      productModel,
      productPrice
    };

    // If a new image file is uploaded, update productImage
    if (req.file) {
      updateData.productImage = `/uploads/${req.file.filename}`;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({ message: 'Product Updated', Product: updatedProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Product Not Updated', error: error.message });
  }
});

// Delete Product

app.delete('/product/:id',async(req,res)=>{
  try {
    const deleteProduct=await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({message:'Product Deleted'});
  } catch (error) {
    res.status(500).json({message:'Product Not Deleted'});
  }
})

const PORT = process.env.PORT || 6060;


app.listen(PORT,()=>{
    console.log(`Server running at http://127.0.0.1:${PORT}`);
});


