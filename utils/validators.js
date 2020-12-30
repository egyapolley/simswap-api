const Joi = require("joi");

module.exports = {

    validateRequest: (body) => {

        const schema = Joi.object({
            msisdn: Joi.string()
                .length(12)
                .alphanum()
                .regex(/^233.+/)
                .required()
                .messages({"string.pattern.base": "msisdn must start with 233"}),

            sim_Id: Joi.string()
                .alphanum()
                .regex(/^892330801.+/)
                .min(18)
                .max(19)
                .required()
                .messages({"string.pattern.base": "sim_Id must start with 89233"}),

            channel: Joi.string()
                .alphanum()
                .required()
                .min(4)
        });

        return schema.validate(body)


    },


}

