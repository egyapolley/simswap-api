const Sequelize = require("sequelize");

const sequelize = require("../utils/sql_database");


const BlankSim = sequelize.define("blank_sim", {
    id: {
        type:Sequelize.INTEGER,
        primaryKey:true,
        allowNull:false,
        autoIncrement:true
    },

    msisdn: {
        type:Sequelize.STRING,
        allowNull: true,

    },

    status: {
        type:Sequelize.STRING,
        allowNull: true,
        defaultValue: "AVAILABLE"

    },



    iccid: {
        type:Sequelize.STRING,
        unique:true,
        allowNull: false,

    },

    authkeys: {
        type:Sequelize.STRING,
        unique:true,
        allowNull: false,

    },

    imsi: {
        type:Sequelize.STRING,
        unique:true,
        allowNull: false,

    },


});

const VodafoneAccts = sequelize.define("vodafoneAccts", {
    id: {
        type:Sequelize.INTEGER,
        primaryKey:true,
        allowNull:false,
        autoIncrement:true
    },

    dateTime: {
        type:Sequelize.DATE,
        allowNull:false,
        defaultValue:Sequelize.NOW
    },

    msisdn: {
        type:Sequelize.STRING,
        unique:true,
        allowNull: false,

    },

    iccid: {
        type:Sequelize.STRING,
        unique:true,
        allowNull: false,

    },

    authKeys: {
        type:Sequelize.STRING,
        unique:true,
        allowNull: false,

    },

    imsi: {
        type:Sequelize.STRING,
        unique:true,
        allowNull: false,

    },
    fileName:{
        type:Sequelize.STRING,
        allowNull: false,

    },
    status:{
        type:Sequelize.STRING,
        allowNull: false,

    },

    profileID:{
        type:Sequelize.STRING,
        unique:true,
        allowNull: false,

    },


}, {
    timestamps:false,
});



module.exports = { VodafoneAccts, BlankSim }

