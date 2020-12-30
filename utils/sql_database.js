const Sequelize = require("sequelize");

const sequelize = new Sequelize("hss_provisionDB","mme", "mme",{
    dialect:"mysql",
    host:"localhost",

    define: {
        freezeTableName:true
    }
});

module.exports = sequelize;

