import mongoose from 'mongoose';

const EmployeeSchema=new mongoose.Schema({
    employeeName:String,
    employeeAge:Number,
    employeeLocation:String,
    employeeContact:Number
})

const Employee=mongoose.model('employee',EmployeeSchema);

export default Employee;