const express = require("express");
const router = express.Router();
const User = require("../models/user");
const validator = require("../utils/validators");
const passport = require("passport");
const BasicStrategy = require("passport-http").BasicStrategy;


const {Op} = require("sequelize");
const sequelize = require("../utils/sql_database");

const BlankSim = require("../models/sql_models").BlankSim
const VodafoneAccts = require("../models/sql_models").VodafoneAccts


const soapRequest = require("easy-soap-request");
const parser = require('fast-xml-parser');
const he = require('he');
const options = {
    attributeNamePrefix: "@_",
    attrNodeName: "attr", //default is 'false'
    textNodeName: "#text",
    ignoreAttributes: true,
    ignoreNameSpace: true,
    allowBooleanAttributes: false,
    parseNodeValue: true,
    parseAttributeValue: false,
    trimValues: true,
    cdataTagName: "__cdata", //default is 'false'
    cdataPositionChar: "\\c",
    parseTrueNumberOnly: false,
    arrayMode: false,
    attrValueProcessor: (val, attrName) => he.decode(val, {isAttributeValue: true}),
    tagValueProcessor: (val, tagName) => he.decode(val),
    stopNodes: ["parse-me-as-string"]
};

passport.use(new BasicStrategy(
    function (username, password, done) {
        User.findOne({username: username}, function (err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false);
            }
            user.comparePassword(password, function (error, isMatch) {
                if (err) return done(error);
                else if (isMatch) {
                    return done(null, user)
                } else {
                    return done(null, false);
                }

            })

        });
    }
));

const URL ="http://172.21.7.6:18100";

router.post("/swap", passport.authenticate('basic', {
    session: false
}), async (req, res) => {

    try {
        const {error} = validator.validateRequest(req.body);
        if (error) {
            return res.json({
                status: 2,
                reason: error.message
            })
        }

        const {msisdn, channel, sim_Id} = req.body;


        if (channel.toLowerCase() !== req.user.channel) {
            return res.json({
                status: 2,
                reason: `Invalid Request channel ${channel}`
            })

        }

        const msisdnDB = await VodafoneAccts.findOne({where: {msisdn}});
        if (msisdnDB) {
            const blankSimDB = await BlankSim.findOne({
                where: {

                    iccid: {
                        [Op.startsWith]: sim_Id
                    },

                    status: {
                        [Op.eq]: "AVAILABLE"
                    }


                }
            });

            if (blankSimDB) {
                let oldimsi = msisdnDB.imsi;
                let oldprofileId = msisdnDB.profileID;
                let oldmsisdn = msisdnDB.msisdn;


                let newimsi = blankSimDB.imsi;
                let newauthKeys = blankSimDB.authkeys;

                if (await createBlankSim(newimsi,newauthKeys)){
                    if (await updateIMSI(newimsi, oldprofileId)){
                        if (await deleteOldSIM(oldimsi)){

                            blankSimDB.status ="USED";
                            blankSimDB.msisdn =oldmsisdn;
                            await blankSimDB.save();


                            await sequelize.transaction(async (t) => {
                                blankSimDB.status ="USED";
                                blankSimDB.msisdn =oldmsisdn;
                                await blankSimDB.save({transaction:t});

                                msisdnDB.imsi=newimsi;
                                await  msisdnDB.save({transaction:t})

                                res.json({
                                    status:0,
                                    reason:"success"
                                })


                            })



                        }else {
                            console.log("sim swap deletion failed");
                            res.json({
                                status:1,
                                reason:"system error"
                            })
                        }
                    }else {
                        console.log("sim swap deletion failed");
                        res.json({
                            status:1,
                            reason:"system error"
                        })
                    }
                }else {
                    console.log("sim swap deletion failed");
                    res.json({
                        status:1,
                        reason:"system error"
                    })
                }






            } else {
                res.json({
                    status: 1,
                    reason: `${sim_Id} is invalid`

                })

            }

        } else {
            res.json({
                status: 1,
                reason: `${msisdn} does not exist`

            })
        }



    } catch (error) {
        console.log(error);

        res.json({
            status: 1,
            reason: "system error"
        })

    }


});


router.post("/user", async (req, res) => {
    try {
        let {username, password, channel} = req.body;
        let user = new User({
            username,
            password,
            channel
        });
        user = await user.save();
        res.json(user);

    } catch (error) {
        res.json({error: error.toString()})
    }


});


async function createBlankSim(imsi, authkeys) {
   let msin = imsi.toString().substring(5);
    const sampleHeaders = {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
    };

    let xmlRequest=`<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:al="http://www.alcatel-lucent.com/soap_cm" xmlns:bd="http://www.3gpp.org/ftp/Specs/archive/32_series/32607/schema/32607-700/BasicCMIRPData" xmlns:bs="http://www.3gpp.org/ftp/Specs/archive/32_series/32607/schema/32607-700/BasicCMIRPSystem" xmlns:gd="http://www.3gpp.org/ftp/Specs/archive/32_series/32317/schema/32317-700/GenericIRPData" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
   <SOAP-ENV:Body>
      <bd:createMO>
         <mOIElementLoc>aucServiceProfileId=1,mSubIdentificationNumberId=${msin},mobileNetworkCodeId=08,mobileCountryCodeId=620,plmnFunctionId=1,managedElementId=HSS1</mOIElementLoc>
         <referenceObjectInstance />
         <mO>
            <moiLocation>aucServiceProfileId=1,mSubIdentificationNumberId=${msin},mobileNetworkCodeId=08,mobileCountryCodeId=620,plmnFunctionId=1,managedElementId=HSS1</moiLocation>
            <al:moAttributeList>
               <al:moAttribute>
                  <al:name>authenticationSubscriberType</al:name>
                  <al:value>UMTS_MS</al:value>
               </al:moAttribute>
               <al:moAttribute>
                  <al:name>authKey</al:name>
                  <al:value>${authkeys}</al:value>
               </al:moAttribute>
               <al:moAttribute>
                  <al:name>algorithmPosition</al:name>
                  <al:value>1</al:value>
               </al:moAttribute>
               <al:moAttribute>
                  <al:name>allowedSequenceNumber</al:name>
                  <al:value>PS</al:value>
                  <al:value>EPS</al:value>
                  <al:value>IMS</al:value>
               </al:moAttribute>
            </al:moAttributeList>
         </mO>
      </bd:createMO>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

    const {response} = await soapRequest({url: URL, headers: sampleHeaders, xml: xmlRequest, timeout: 6000}); // Optional timeout parameter(milliseconds)
    const {body} = response;
    let jsonObj = parser.parse(body, options);
    let result = jsonObj.Envelope.Body;
    console.log(result);
    return  !!(result.createMOResponse && result.createMOResponse.mO && result.createMOResponse.mO.moiLocation);

}

async function updateIMSI(imsi,profileId) {
    let msin = imsi.toString().substring(5);

    const sampleHeaders = {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
    };

    let xmlRequest=`<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:al="http://www.alcatel-lucent.com/soap_cm" xmlns:bd="http://www.3gpp.org/ftp/Specs/archive/32_series/32607/schema/32607-700/BasicCMIRPData" xmlns:bs="http://www.3gpp.org/ftp/Specs/archive/32_series/32607/schema/32607-700/BasicCMIRPSystem" xmlns:gd="http://www.3gpp.org/ftp/Specs/archive/32_series/32317/schema/32317-700/GenericIRPData" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
   <SOAP-ENV:Body>
      <bd:setMOAttributes>
         <queryXpathExp>
            <al:baseObjectInstance>gsmServiceProfileId=1,suMSubscriptionProfileId=1,suMSubscriberProfileId=1-${profileId},subscriptionFunctionId=1,managedElementId=HSS1</al:baseObjectInstance>
            <al:scope>BASE_OBJECT_ONLY</al:scope>
         </queryXpathExp>
         <modificationList>
            <AttributeModification>
               <al:moAttribute>
                  <al:name>IMSI_Change_Mode</al:name>
                  <al:value>MANUAL</al:value>
               </al:moAttribute>
               <operator>REPLACE</operator>
            </AttributeModification>
            <AttributeModification>
               <al:moAttribute>
                  <al:name>typeOfModification</al:name>
                  <al:value>changeIMSI</al:value>
               </al:moAttribute>
               <operator>REPLACE</operator>
            </AttributeModification>
            <AttributeModification>
               <al:moAttribute>
                  <al:name>newMobileCountryCodeId</al:name>
                  <al:value>620</al:value>
               </al:moAttribute>
               <operator>REPLACE</operator>
            </AttributeModification>
            <AttributeModification>
               <al:moAttribute>
                  <al:name>newMobileNetworkCodeId</al:name>
                  <al:value>08</al:value>
               </al:moAttribute>
               <operator>REPLACE</operator>
            </AttributeModification>
            <AttributeModification>
               <al:moAttribute>
                  <al:name>newMSubIdentificationNumberId</al:name>
                  <al:value>${msin}</al:value>
               </al:moAttribute>
               <operator>REPLACE</operator>
            </AttributeModification>
         </modificationList>
      </bd:setMOAttributes>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

    const {response} = await soapRequest({url: URL, headers: sampleHeaders, xml: xmlRequest, timeout: 6000}); // Optional timeout parameter(milliseconds)
    const {body} = response;
    let jsonObj = parser.parse(body, options);
    let result = jsonObj.Envelope.Body;
    console.log(result);
    return  !!(result.setMOAttributesResponse && result.setMOAttributesResponse.modificationListOut && result.setMOAttributesResponse.modificationListOut.mo && result.setMOAttributesResponse.modificationListOut.mo.moiLocation);

}

async function deleteOldSIM(imsi) {
    let msin = imsi.toString().substring(5);

    const sampleHeaders = {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
    };

    let xmlRequest=`<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:al="http://www.alcatel-lucent.com/soap_cm" xmlns:bd="http://www.3gpp.org/ftp/Specs/archive/32_series/32607/schema/32607-700/BasicCMIRPData" xmlns:bs="http://www.3gpp.org/ftp/Specs/archive/32_series/32607/schema/32607-700/BasicCMIRPSystem" xmlns:gd="http://www.3gpp.org/ftp/Specs/archive/32_series/32317/schema/32317-700/GenericIRPData" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
   <SOAP-ENV:Body>
      <bd:deleteMO>
         <queryXpathExp>
            <al:baseObjectInstance>aucServiceProfileId=1,mSubIdentificationNumberId=${msin},mobileNetworkCodeId=08,mobileCountryCodeId=620,plmnFunctionId=1,managedElementId=HSS1</al:baseObjectInstance>
            <al:scope>BASE_ALL</al:scope>
         </queryXpathExp>
      </bd:deleteMO>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

    const {response} = await soapRequest({url: URL, headers: sampleHeaders, xml: xmlRequest, timeout: 6000}); // Optional timeout parameter(milliseconds)
    const {body} = response;
    let jsonObj = parser.parse(body, options);
    let result = jsonObj.Envelope.Body;
    console.log(result);
    return  !!(result.deleteMOResponse && result.deleteMOResponse.deletionList && result.deleteMOResponse.deletionList.mo && result.deleteMOResponse.deletionList.mo.moiLocation);

}



module.exports = router;

