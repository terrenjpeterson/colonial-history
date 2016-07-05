/**
 * This skill provides information about US Colonial History
 */

var aws = require('aws-sdk');

const https = require('https');

// location of the bucket used to manage data
var dataBucket = 'colonial-history';

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
    getWelcomeResponse(callback);
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
    } else if ("AMAZON.StartOverIntent" === intentName) {
        getWelcomeResponse(callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getHelpResponse(callback);
    } else if ("AMAZON.RepeatIntent" === intentName) {
        getWelcomeResponse(callback);
    } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) {
        handleSessionEndRequest(callback);
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

function getWelcomeResponse(callback) {
    var sessionAttributes = {};
    var shouldEndSession = false;
    var cardTitle = "Welcome to Colonial History";

    var speechOutput = "Welcome to the Colonial History Skill.";

    var cardOutput = "Welcome to Colonial History";

    var repromptText = "Please tell me how I can help you by saying phrases like, " +
        "list founding fathers from Virginia.";

    console.log('speech output : ' + speechOutput);

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
}

// this is the function that gets called to format the response to the user when they ask for help
function getHelpResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Help";
    // this will be what the user hears after asking for help

    var speechOutput = "The Colonial History Skill provides information about US history during " +
        "the colonial era. It contains biographical information about our founding fathers " +
        "as well as information about famous events and documents";

    // if the user still does not respond, they will be prompted with this additional information

    var repromptText = "Please tell me how I can help you by saying phrases like, " +
        "biography of George Washington.";
        
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
}

// this is the function that gets called to format the response when the user is done
function handleSessionEndRequest(callback) {
    var cardTitle = "Thanks for using Colonial History Skill";
    
    var speechOutput = "Thank you for checking in with the Colonial History skill. Have a nice day!";

    // Setting this to true ends the session and exits the skill.

    var shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, speechOutput, null, shouldEndSession));
}

// This retrieves biographic information about a colonial history figure

function getBiography(intent, session, callback) {
    var cardTitle = "Colonial History - Biography";
    var sessionAttributes = {};
    var shouldEndSession = false;

    console.log("Get Biography of " + intent.slots.Name.value);
    //console.log("Get Beer Categories Invoked for :" + intent.slots.Category.value);

    var speechOutput = "";
    var cardOutput = "";

    // first check to make sure that information is available about the individual provided

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

                console.log(JSON.stringify(bioArray));
                
                for (i = 0; i < bioArray.length; i++) {
                    if (bioArray[i].person.name === intent.slots.Name.value) {

                        console.log("matched - use object : " + bioArray[i].person.path);

                        var s3 = new aws.S3();
                        
                        var getBioParams = {Bucket : dataBucket,
                                            Key : 'bios/' + bioArray[i].person.path}

                        s3.getObject(getBioParams, function(err, data) {
                            if(err)
                                console.log('Error getting bio index data : ' + err);
                            else {
                                console.log("Retrieved biography data object");                                            

                                var bioData = eval('(' + data.Body + ')');
                                
                                console.log(JSON.stringify(bioData));

                                speechOutput = "Here is a brief biography of " + bioData.firstName + " " + bioData.lastName + ". ";
                                speechOutput = speechOutput + bioData.bio;

                                cardOutput = cardOutput + bioData.firstName + " " + bioData.lastName + '\n' +
                                    "Date of Birth: " + bioData.dateOfBirth + '\n' +
                                    "Date of Death: " + bioData.dateOfDeath + '\n';
    
                                var repromptText = "reprompt text";

                                callback(sessionAttributes,
                                     buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
                            }
                        });
                    }
                }
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
