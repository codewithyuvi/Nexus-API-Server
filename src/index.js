import express from 'express';

const app = new express();
console.log("Testing nodemon!");
app.listen(5000, ()=>{
    console.log("Server is running on port 5000");
});