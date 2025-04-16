const mongoose = require('mongoose');

async function connectDatabase(){
    try{
        await mongoose.connect(process.env.MONGODBURL);
        console.log('Database connected successfuly');
    }catch(err){
        console.log(`Failed to connect to Database : ${err.stack}`);
        process.exit(0);
    }
}
module.exports = {
    connectDatabase
}