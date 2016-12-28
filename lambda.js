/**
 * This skill provides information about US Colonial History
 */

var aws = require('aws-sdk');

const https = require('https');

// location of the bucket used to manage data
var dataBucket = 'colonial-history';

// Original Thirteen Colonies

var originalColonies = [
    {"order":1,"name":"Virginia","yearFounded":1607},
    {"order":2,"name":"New York","yearFounded":1626},
    {"order":3,"name":"Massachusetts","yearFounded":1630},
    {"order":4,"name":"Maryland","yearFounded":1633},
    {"order":5,"name":"Rhode Island","yearFounded":1636},
    {"order":6,"name":"Connecticut","yearFounded":1636},
    {"order":7,"name":"New Hampshire","yearFounded":1638},
    {"order":8,"name":"Delaware","yearFounded":1638},
    {"order":9,"name":"North Carolina","yearFounded":1653},
    {"order":10,"name":"South Carolina","yearFounded":1663},
    {"order":11,"name":"New Jersey","yearFounded":1664},
    {"order":12,"name":"Pennsylvania","yearFounded":1682},
    {"order":13,"name":"Georgia","yearFounded":1732}
];

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * This validates that the applicationId matches what is provided by Amazon.
         */
        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.011e0655-2f0a-4696-b9ee-6c45549bc4cf") {
             context.fail("Invalid Application ID");
        }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(session, callback);
}

/**
 * Called when the user specifies an intent for this skill. This drives
 * the main logic for the function.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to the individual skill handlers

    if ("Biography" === intentName) {
        getBiography(intent, session, callback);
    } else if ("Story" === intentName) {
        getStory(intent, session, callback);
    } else if ("BioList" === intentName) {
        getBioList(intent, session, callback);
    } else if ("ReadDeclOfInd" === intentName) {
        readDeclOfIndep(intent, session, callback);
    } else if ("SignDeclOfInd" === intentName) {
        listDeclOfIndepSigners(intent, session, callback);
    } else if ("ReadBillOfRights" === intentName) {
        readBillOfRights(intent, session, callback);
    } else if ("ListOriginalColonies" === intentName) {
        listOrigColonies(intent, session, callback);
    } else if ("AMAZON.StartOverIntent" === intentName) {
        getWelcomeResponse(session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getHelpResponse(callback);
    } else if ("AMAZON.RepeatIntent" === intentName) {
        getWelcomeResponse(session, callback);
    } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) {
        handleSessionEndRequest(session, callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

// --------------- Base Functions that are invoked based on standard utterances -----------------------

// this is the function that gets called to format the response to the user when they first boot the app

function getWelcomeResponse(session, callback) {
    var sessionAttributes = {};
    var shouldEndSession = false;
    var cardTitle = "Welcome to Colonial History";

    var speechOutput = "Welcome to the Colonial History Skill. Looking to learn more about the early " +
        "beginnings of the United States? Start by saying something like, Read a Biography, and a brief " +
        "historical background will be shared.";

    var cardOutput = "Welcome to Colonial History";

    var repromptText = "Please tell me how I can help you by saying phrases like, " +
        "Read the Declaration of Independence, or Who is Alexander Hamilton?";

    console.log('speech output : ' + speechOutput);

    // log to analytics for further processing
    var db = new aws.DynamoDB();
    var d = new Date().toString();

    var params = {
        TableName: 'colonialBiographyTbl',
        Item: { // a map of attribute name to AttributeValue
            readingTS: { S: d },
            userId: { S: session.user.userId },
            sessionId: { S: session.sessionId },
            request: { S: "Welcome Message" }
        }
    };
    
    db.putItem(params, function(err, data) {
        if (err) console.log(err); // an error occurred
        else console.log("success" + data); // successful response

        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
    });
}

// this is the function that gets called to format the response to the user when they ask for help
function getHelpResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Help";
    // this will be what the user hears after asking for help

    var speechOutput = "The Colonial History Skill provides information about US history during " +
        "the colonial era. It contains biographical information about our founding fathers " +
        "as well as information about famous events and documents. Please say, Read a Biography, " +
        "or Read the Bill of Rights.";

    // if the user still does not respond, they will be prompted with this additional information

    var repromptText = "Please tell me how I can help you by saying phrases like, " +
        "Read the Biography of George Washington.";
        
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
}

// this is the function that gets called to format the response when the user is done
function handleSessionEndRequest(session, callback) {

    console.log("End session - request feedback");

    var cardTitle = "Thanks for using Colonial History Skill";
    
    var speechOutput = "Thank you for checking in with the Colonial History skill. Please take time " +
        "to provide us feedback in the Alexa app, including what else you would like to see added to this skill.";

    // Setting this to true ends the session and exits the skill.

    var shouldEndSession = true;

    // log to analytics for further processing
    var db = new aws.DynamoDB();
    var d = new Date().toString();

    var params = {
        TableName: 'colonialBiographyTbl',
        Item: { // a map of attribute name to AttributeValue
            readingTS: { S: d },
            userId: { S: session.user.userId },
            sessionId: { S: session.sessionId },
            request: { S: "End Message" }
        }
    };
    
    db.putItem(params, function(err, data) {
        if (err) console.log(err); // an error occurred
        else console.log("success" + data); // successful response

        callback({}, buildSpeechletResponse(cardTitle, speechOutput, speechOutput, null, shouldEndSession));

    });
}

// This retrieves the bill of rights data and renders it for a response

function readBillOfRights(intent, session, callback) {
    var cardTitle = "Colonial History - Bill of Rights";
    var sessionAttributes = {};
    var shouldEndSession = false;

    console.log("Read the Bill of Rights");

    var speechOutput = "";
    var cardOutput = "";

    // first get the list of available biographies from the S3 bucket

    var s3 = new aws.S3();

    var getParams = {Bucket : dataBucket,
                     Key : 'famous-documents/billOfRights.json'};

        s3.getObject(getParams, function(err, data) {
            if(err)
                console.log('Error getting bill of rights data : ' + err);
            else {
                console.log("Retrieved data object");

                var returnData = eval('(' + data.Body + ')');
                var billOfRightsArray = returnData.amendments;

                console.log(JSON.stringify(billOfRightsArray));

                speechOutput = "The Bill of Rights are a group of ten amendments to the " +
                    "United States Constitution. Here they are in detail. ";

                for (i = 0; i < billOfRightsArray.length; i++) {
                    speechOutput = speechOutput + " " + billOfRightsArray[i].order +
                        " Amendment. " + billOfRightsArray[i].detail;
                    cardOutput = cardOutput + billOfRightsArray[i].order +
                        " Amendment\n" + billOfRightsArray[i].detail + "\n";
                }
                    
                speechOutput = speechOutput + "If you would like to hear more about historical documents, " +
                    "please say Read the Declaration of Independence, and I will do so. ";
                    
                var repromptText = "I have other historical documents that I can read. For example " +
                    "please say Read the Declaration of Independence and I will recite it. ";

                // log to analytics for further processing
                var db = new aws.DynamoDB();
                var d = new Date().toString();

                var params = {
                    TableName: 'colonialBiographyTbl',
                    Item: { // a map of attribute name to AttributeValue
                        readingTS: { S: d },
                        userId: { S: session.user.userId },
                        sessionId: { S: session.sessionId },
                        request: { S: "Read Bill of Rights" }
                    }
                };
        
                db.putItem(params, function(err, data) {
                    if (err) console.log(err); // an error occurred
                    else console.log("success" + data); // successful response

                    callback(sessionAttributes,
                         buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
                });
            }
        });
}

// This lists all of the original colonies as well as the date that they were founded by

function listOrigColonies(intent, session, callback) {
    var cardTitle = "Colonial History - The Original Thirteen";
    var sessionAttributes = {};
    var shouldEndSession = false;

    console.log("List the Original Colonies");

    var speechOutput = "The original thirteen colonies in order are as follows. ";
    var cardOutput = "Original Colonies\n";

    for (i = 0; i < originalColonies.length; i++) {
        speechOutput = speechOutput + originalColonies[i].name +
            " founded in " + originalColonies[i].yearFounded + ", ";
        cardOutput = cardOutput + originalColonies[i].order +
            " - " + originalColonies[i].name + "\n";
    }
    
    speechOutput = speechOutput + ". If you would like to know who signed the Declaration of " +
        "Independence from one of these particular colonies, please say, Who signed the " +
        "Declaration of Independence from Virginia, and I will list them.";
    
    repromptText = "If you would like to hear about some of the key individuals that led the " +
        "original colonies, please say Read me a biography, and I will do so. ";
    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
}

// This lists who signed the declaration of independence from a given state

function listDeclOfIndepSigners(intent, session, callback) {
    var cardTitle = "Colonial History - Signers of the US Declaration of Independence";
    var sessionAttributes = {};
    var shouldEndSession = false;

    console.log("List the Signers of the Declaration");

    requestState = intent.slots.State.value;

    var speechOutput = "";
    var cardOutput = "";
    var validState = false;

    for (i = 0; i < originalColonies.length; i++) {
        if (requestState == originalColonies[i].name) {
            speechOutput = "The signers from the state of " + requestState + " are ";
            cardOutput = "US Declaration of Indepdence Signers from " + requestState + "\n";
            validState = true;
        }
    }

    if (requestState == null) {
        // this indicates all of the states will be read
        speechOutput = "The full list of all the signers of the declaration are ";
        cardOutput = "US Declaration of Independence Signers\n";
        validState = true;
    }
    
    if (validState == false) {
        speechOutput = "I'm sorry, that's not one of the original thirteen colonies. I can list " +
            "them if needed, just say, List the original Colonies."
        cardOutput = "Invalid State - please try again";
        
        repromptText = "If you would like to hear what the original colonies were, please say " +
            "List the original colonies.";
    
        callback(sessionAttributes,
             buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
    } else {
        var s3 = new aws.S3();

        var getParams = {Bucket : dataBucket,
            Key : 'famous-documents/declOfIndep.json'};

        s3.getObject(getParams, function(err, data) {
            if(err)
                console.log('Error getting declaration of independence : ' + err);
            else {
                console.log("Retrieved data object");

                var returnData = eval('(' + data.Body + ')');
                
                var declSignatures = returnData.signatures;
                var signExample = "";

                for (j = 0; j < declSignatures.length; j++) {
                    if (requestState == declSignatures[j].state || requestState == null) {
                        speechOutput = speechOutput + declSignatures[j].fullName + ", ";
                        cardOutput = cardOutput + declSignatures[j].fullName + "\n";
                        signExample = declSignatures[j].fullName;
                    }
                };

                speechOutput = speechOutput + ". To hear more information about one of these individuals, " +
                    "please say something like, Who is " + signExample + " and I will read a short biography.";
                
                repromptText = "Would you like me to read you a biography of one of the colonial founders? " +
                    "If so, just say, List available biographies, and I will let you know who I have information " +
                    "about.";
    
                callback(sessionAttributes,
                    buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
            }
        });
    }
}

// This retrieves the bill of rights data and renders it for a response

function readDeclOfIndep(intent, session, callback) {
    var cardTitle = "Colonial History - Declaration of Independence";
    var sessionAttributes = {};
    var shouldEndSession = false;

    console.log("Read the Declaration of Independence");

    var speechOutput = "";
    var cardOutput = "";

    // first get the data object for the declaration

    var s3 = new aws.S3();

    var getParams = {Bucket : dataBucket,
                     Key : 'famous-documents/declOfIndep.json'};

        s3.getObject(getParams, function(err, data) {
            if(err)
                console.log('Error getting declaration of independence : ' + err);
            else {
                console.log("Retrieved data object");

                var returnData = eval('(' + data.Body + ')');
                
                //console.log("Processing Data");
                
                var declOfIndep = returnData;

                //console.log(JSON.stringify(declOfIndep));

                speechOutput = "The United States Declaration of Independence from " +
                    "Great Britain has several sections. This covers the introduction, " +
                    "preamble, denunciation, and conclusion. "
                cardOutput = "United States Declaration of Independence\n";

                speechOutput = speechOutput + declOfIndep.introduction + " ";
                cardOutput = cardOutput + declOfIndep.introduction + "\n";

                speechOutput = speechOutput + declOfIndep.preamble + " ";
                cardOutput = cardOutput + declOfIndep.preamble + "\n";

                speechOutput = speechOutput + declOfIndep.denunciation + " ";
                cardOutput = cardOutput + declOfIndep.denunciation + "\n";
                
                speechOutput = speechOutput + declOfIndep.conclusion;
                cardOutput = cardOutput + declOfIndep.conclusion + "\n";                

                speechOutput = speechOutput + ". If you would like to know who signed the declaration, " +
                    "please say, List signers of the Declaration of Independence.";

                var repromptText = "If you would like to know who signed the declaration " +
                    "please say, List signers of the Declaration of Independence.";

                callback(sessionAttributes,
                     buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
            }
        });
}

// This retrieves all of the available biographies to choose from

function getBioList(intent, session, callback) {
    var cardTitle = "Colonial History - Biographies";
    var sessionAttributes = {};
    var shouldEndSession = false;

    console.log("Get List of Biographies");

    var speechOutput = "";
    var cardOutput = "";

    // first get the list of available biographies from the S3 bucket

    var s3 = new aws.S3();

    var getParams = {Bucket : dataBucket,
                     Key : 'bios/bioIndex.json'};

        s3.getObject(getParams, function(err, data) {
            if(err)
                console.log('Error getting bio index data : ' + err);
            else {
                console.log("Retrieved data object");

                var returnData = eval('(' + data.Body + ')');
                var bioArray = returnData.data;

                //console.log(JSON.stringify(bioArray));

                speechOutput = "Here are the biographies to choose from - ";

                var previousPath = "";
                
                for (i = 0; i < bioArray.length; i++) {
                    //console.log(bioArray[i].person.name);
                    
                    // make sure and skip duplicates
                    if (bioArray[i].person.path !== previousPath) { 
                        //console.log(bioArray[i].person.path + previousPath);
                        speechOutput = speechOutput + bioArray[i].person.name + ", ";
                        cardOutput = cardOutput + bioArray[i].person.name + '\n';
                    }
                    
                    previousPath = bioArray[i].person.path;
                }

                speechOutput = speechOutput + ". If you would like me to read the biography of one of these " +
                    "individuals, please say something like, Who is " + bioArray[1].person.name + ".";
                    
                var repromptText = "Would you rather find out information about famous documents? I can " +
                    "recite the Declaration of Independence as well as the Bill of Rights. Just say, " +
                    "Read the Declaration of Independence, and I will do so.";

                callback(sessionAttributes,
                     buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
            }
        });
}

// This retrieves biographic information about a colonial history figure

function getBiography(intent, session, callback) {
    var cardTitle = "Colonial History - Biography";
    var sessionAttributes = {};
    var shouldEndSession = false;

    console.log("Get Biography of " + intent.slots.Name.value);

    var speechOutput = "";
    var cardOutput = "";

    var s3 = new aws.S3();

    var getParams = {Bucket : dataBucket,
                     Key : 'bios/bioIndex.json'};

        s3.getObject(getParams, function(err, data) {
            if(err)
                console.log('Error getting bio index data : ' + err);
            else {
                console.log("Retrieved data object");

                // first check to make sure that information is available about the individual provided

                var returnData = eval('(' + data.Body + ')');
                var bioArray = returnData.data;
                var foundMatch = false;

                console.log(JSON.stringify(bioArray));
                
                for (i = 0; i < bioArray.length; i++) {
                    if (bioArray[i].person.name.toLowerCase() === intent.slots.Name.value.toLowerCase()) {

                        console.log("matched - use object : " + bioArray[i].person.path);

                        foundMatch = true;

                        var s3 = new aws.S3();
                        
                        var getBioParams = {Bucket : dataBucket,
                                            Key : 'bios/' + bioArray[i].person.path}

                        s3.getObject(getBioParams, function(err, data) {
                            if(err)
                                console.log('Error getting bio index data : ' + err);
                            else {
                                console.log("Retrieved biography data object");                                            

                                var bioData = eval('(' + data.Body + ')');
                                
                                //console.log(JSON.stringify(bioData));

                                speechOutput = "Here is a brief biography of " + bioData.firstName + " " + bioData.lastName + ". ";
                                speechOutput = speechOutput + bioData.bio;
                                speechOutput = speechOutput + " If you would like me to read another biography, please ask again " +
                                    "providing the name, or say, List biographies.";

                                cardOutput = cardOutput + bioData.firstName + " " + bioData.lastName + '\n' +
                                    "Date of Birth: " + bioData.dateOfBirth + '\n' +
                                    "Date of Death: " + bioData.dateOfDeath + '\n';
    
                                var repromptText = "I have plenty of other biographies to choose from. If you " +
                                    "would like me to list those available, please say, List available biographies.";

                                // log to analytics for further processing
                                
                                var db = new aws.DynamoDB();
                                var d = new Date().toString();

                                var params = {
                                    TableName: 'colonialBiographyTbl',
                                    Item: { // a map of attribute name to AttributeValue
                                        readingTS: { S: d },
                                        histFigure: {  S: intent.slots.Name.value },
                                        userId: { S: session.user.userId },
                                        sessionId: { S: session.sessionId },
                                        request: { S: "Specific User Request" }
                                    }
                                };
    
                                db.putItem(params, function(err, data) {
                                    if (err) console.log(err); // an error occurred
                                    else console.log("success" + data); // successful response

                                    callback(sessionAttributes,
                                         buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));

                                });
                            }
                        });
                    }
                };

                // process logic for when no match exists
                
                if(foundMatch === false) {
                
                    console.log("Process cant match logic");
                
                    speechOutput = "I'm sorry, we don't have information about " + intent.slots.Name.value + ". " +
                        "If you would like a full list of what biographies we have, please say List available biographies.";
                    cardOutput = "No biography available for " + intent.slots.Name.value;
                    repromptText = "If you would like for me to read any biography, please say, Read me a biography.";

                    callback(sessionAttributes,
                        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
                }
                
            }
        });
}

// This retrieves a random biographic information about a colonial history figure

function getStory(intent, session, callback) {
    var cardTitle = "Colonial History - Story";
    var sessionAttributes = {};
    var shouldEndSession = false;
    
    var speechOutput = "";
    var cardOutput = "";

    console.log("Getting Biographic Story");

    // first get the index of all of the biographies
    
    var s3 = new aws.S3();

    var getParams = {Bucket : dataBucket,
                     Key : 'bios/bioIndex.json'};

    s3.getObject(getParams, function(err, data) {
        if(err)
            console.log('Error getting bio index data : ' + err);
        else {
            var returnData = eval('(' + data.Body + ')');
            var bioArray = returnData.data;

            // now pick a random number from within the array to get the pointer
            var i = Math.floor((Math.random() * bioArray.length) + 1);
            console.log("matched - use object : " + bioArray[i].person.path);

            var s3 = new aws.S3();
                    
            var getBioParams = {Bucket : dataBucket,
                                Key : 'bios/' + bioArray[i].person.path}

            s3.getObject(getBioParams, function(err, data) {
                if(err)
                    console.log('Error getting bio index data : ' + err);
                else {
                    var bioData = eval('(' + data.Body + ')');

                    speechOutput = "Here is a brief biography of " + bioData.firstName + " " + bioData.lastName + ". ";
                    speechOutput = speechOutput + bioData.bio;
                    speechOutput = speechOutput + " For another biography, please say, " +
                        "Read a biography, and I will read another.";

                    cardOutput = cardOutput + bioData.firstName + " " + bioData.lastName + '\n' +
                        "Date of Birth: " + bioData.dateOfBirth + '\n' +
                        "Date of Death: " + bioData.dateOfDeath + '\n';
    
                    var repromptText = "I have plenty of other biographies to choose from. If you " +
                        "would like me to list those available, please say, List biographies.";

                    // log to analytics for further processing
                    var db = new aws.DynamoDB();
                    var d = new Date().toString();
                    var params = {
                        TableName: 'colonialBiographyTbl',
                        Item: { // a map of attribute name to AttributeValue
                            readingTS: { S: d },
                            histFigure: {  S: bioData.firstName + " " + bioData.lastName },
                            userId: { S: session.user.userId },
                            sessionId: { S: session.sessionId },
                            request: { S: "Get Random Story" }
                        }
                    };

                    db.putItem(params, function(err, data) {
                        if (err) console.log(err); // an error occurred
                        else console.log("success" + data); // successful response

                        callback(sessionAttributes,
                             buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
                    });
                }
            });
        }
    });
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, cardInfo, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: cardInfo
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
