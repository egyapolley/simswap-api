const express = require("express");
const router = require("./routes/index");
const mongoose = require("mongoose");
const helmet = require("helmet");
const morgan = require("morgan")

const sequelize = require("./utils/sql_database");

const BlankSim = require("./models/sql_models").BlankSim
const VodafoneAccts = require("./models/sql_models").VodafoneAccts


require("dotenv").config();

mongoose.connect("mongodb://localhost/simswap", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
}).then(() => {
    console.log("MongoDB connected");

    sequelize.sync({

    })
        .then(() =>{
            console.log("Sequelize connected")

            const app = express();
            app.use(helmet());
            app.use(express.json());
            app.use(express.urlencoded({extended: false}));


            let PORT = process.env.PORT || 8000;
            let HOST = process.env.PROD_HOST;

            if (process.env.NODE_ENV === "development") {
                HOST = process.env.TEST_HOST;
                app.use(morgan("combined"))
            }

            app.use(router);

            app.listen(PORT, () => {
                console.log(`Server running in ${process.env.NODE_ENV} on url : http://${HOST}:${PORT}`)
            })

        })
        .catch((error) =>{
            console.log("Cannot connect to MongoDB");
            throw error;

        })


}).catch(err => {
    console.log("Cannot connect to MongoDB");
    throw err;
});
