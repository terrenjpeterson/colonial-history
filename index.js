/**
 * This skill provides information about US Colonial History
 */

var aws = require('aws-sdk');

// this is the list of biographies that the skill has access to
const biographyArray = require("data/bioIndex.json");

// this is the list of biographies that the skill has access to
const battleArray = require("data/battleIndex.json");

// this is the list of who signed the declaration of independence
const declarationSignaturesArray = require("data/declOfIndep.json");

// this is used by the VoiceLabs analytics
var APP_ID = 'amzn1.echo-sdk-ams.app.011e0655-2f0a-4696-b9ee-6c45549bc4cf';

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
    	// this was added to handle the Can Fulfill Intent Request feature
        } else if (event.request.type === "CanFulfillIntentRequest") {
	        console.log("can fulfill request received ");
            onFulfillRequest(event.request, event.session, event.context,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildNoSessionResponse(speechletResponse));
                });
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
    console.log(JSON.stringify(launchRequest));
    getWelcomeResponse(session, callback);
}

// Called when Alexa is polling for more detail
function onFulfillRequest(intentRequest, session, context, callback) {
    console.log("processing on fulfillment request.");
    console.log(JSON.stringify(intentRequest));

    handleCanFulfillRequest(intentRequest, session, callback);
}

/**
 * Called when the user specifies an intent for this skill. This drives
 * the main logic for the function.
 */
function onIntent(intentRequest, session, callback) {
    console.log(JSON.stringify(intentRequest));

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to the individual skill handlers
    if ("Biography" === intentName) {
        if (intent.slots.Name.value) {
            getBiography(intent, session, callback);
        } else {
            returnNoName(intent, session, callback);
        }
    } else if ("Story" === intentName) {
        getStory(intent, session, callback);
    } else if ("ReadBattle" === intentName) {
        getColonialBattle(intent, session, callback);
    } else if ("BioList" === intentName) {
        getBioList(intent, session, callback);
    } else if ("BattleList" === intentName) {
        getBattleList(intent, session, callback);
    } else if ("ReadDeclOfInd" === intentName) {
        readDeclOfIndep(intent, session, callback);
    } else if ("SignDeclOfInd" === intentName) {
        listDeclOfIndepSigners(intent, session, callback);
    } else if ("ReadBillOfRights" === intentName) {
        readBillOfRights(intent, session, callback);
    } else if ("ListOriginalColonies" === intentName) {
        listOrigColonies(intent, session, callback);
    } else if ("PresidentOrder" === intentName) {
        listOrderPresidents(intent, session, callback);
    } else if ("SupremeCourtJustices" === intentName) {
        readOriginalSupremeCourt(intent, session, callback);
    } else if ("OriginalCabinet" === intentName) {
        describeOriginalCabinet(intent, session, callback);
    } else if ("SecretaryOfState" === intentName) {
        listOrderSecState(intent, session, callback);
    } else if ("CapitalLocation" === intentName) {
        explainFirstCapital(intent, session, callback);        
    } else if ("AuthorDeclOfIndep" === intentName) {
        authorDeclOfIndep(intent, session, callback);        
    } else if ("AuthorBillOfRights" === intentName) {
        authorBillOfRights(intent, session, callback);        
    } else if ("AuthorFederalistPapers" === intentName) {
        authorFederalistPapers(intent, session, callback);        
    } else if ("AMAZON.StartOverIntent" === intentName) {
        getWelcomeResponse(session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getHelpResponse(callback);
    } else if ("AMAZON.RepeatIntent" === intentName) {
        getWelcomeResponse(session, callback);
    } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) {
        handleSessionEndRequest(session, callback);
    } else if ("AMAZON.YesIntent" === intentName || "AMAZON.NextIntent" === intentName) {
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
    var cardTitle = "Welcome";
    var cardObject = "benFranklinFlag";

    const yankeeDoodle = 'https://s3.amazonaws.com/colonial-history/sounds/yankeeDoodle.mp3';

    var audioOutput = "<speak>";
        audioOutput = audioOutput +  "Welcome to the Colonial History Skill.";
        audioOutput = audioOutput + "<audio src=\"" + yankeeDoodle + "\" />";
        audioOutput = audioOutput + "Looking to learn more about the early " +
            "beginnings of the United States? Start by saying something like, Read a Biography, and a brief " +
            "historical background will be shared.";
        audioOutput = audioOutput + "</speak>";

    var speechOutput = "Welcome to the Colonial History Skill. Looking to learn more about the early " +
        "beginnings of the United States? Start by saying something like, Read a Biography, and a brief " +
        "historical background will be shared.";

    var cardOutput = "Options\nRead a Biography\nRead about a Battle\n" +
        "Read the Bill of Rights\nRead the Declaration of Independence";

    var repromptText = "Please tell me how I can help you by saying phrases like, " +
        "Read the Declaration of Independence, or Who is Alexander Hamilton?";

    console.log('speech output : ' + speechOutput);

    callback(sessionAttributes,
        buildAudioCardResponse(cardTitle, audioOutput, cardOutput, cardObject,repromptText, shouldEndSession));
}

// this is the function that handles broad requests coming in natively from Alexa
function handleCanFulfillRequest(intentRequest, session, callback) {
    var sessionAttributes = {};
    const intentName = intentRequest.intent.name;

    console.log("Can Fulfill Request for intent name:" + intentName);

    // depending on the intent determine if a response can be provided
    if ("Biography" == intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("YES", buildSlotDetail("Name", intentRequest.intent.slots)));
    } else if ("Story" === intentName) {
        callback(sessionAttributes, buildFulfillQueryResponse("YES", null));
    } else if ("SignDeclOfInd" == intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("YES", buildSlotDetail("State", intentRequest.intent.slots)));
    } else if ("BioList" === intentName) {
        callback(sessionAttributes, buildFulfillQueryResponse("YES", null));
    } else if ("ReadDeclOfInd" === intentName) {
        callback(sessionAttributes, buildFulfillQueryResponse("YES", null));
    } else if ("ReadBillOfRights" === intentName) {
        callback(sessionAttributes, buildFulfillQueryResponse("YES", null));        
    } else if ("ReadBattle" === intentName) {
        if (intentRequest.intent.slots) {
            if (intentRequest.intent.slots.battle) {
                callback(sessionAttributes,
                    buildFulfillQueryResponse("YES", buildSlotDetail("Battle", intentRequest.intent.slots)));
            } else {
                callback(sessionAttributes, buildFulfillQueryResponse("YES", null));        
            }
        } else {
            callback(sessionAttributes, buildFulfillQueryResponse("YES", null));        
        }
    } else if ("ListOriginalColonies" === intentName) {
        callback(sessionAttributes, buildFulfillQueryResponse("YES", null));
    } else if ("PresidentOrder" === intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("YES", buildSlotDetail("Order", intentRequest.intent.slots)));
    } else if ("SupremeCourtJustices" === intentName) {
        callback(sessionAttributes, buildFulfillQueryResponse("YES", null));
    } else if ("OriginalCabinet" === intentName) {
        callback(sessionAttributes, buildFulfillQueryResponse("YES", null));
    } else if ("SecretaryOfState" === intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("YES", buildSlotDetail("Order", intentRequest.intent.slots)));
    } else if ("CapitalLocation" === intentName) {
        callback(sessionAttributes, buildFulfillQueryResponse("YES", null));
    } else if ("AuthorDeclOfIndep" === intentName) {
        callback(sessionAttributes, buildFulfillQueryResponse("YES", null));
    } else if ("AuthorBillOfRights" === intentName) {
        callback(sessionAttributes, buildFulfillQueryResponse("YES", null));
    } else if ("AuthorFederalistPapers" === intentName) {
        callback(sessionAttributes, buildFulfillQueryResponse("YES", null));
    } else {
	    // this handles all the other scenarios - i.e. Scroll Down Intent - that make no sense
	    console.log("No match on intent name: " + intentName);
	    callback(sessionAttributes, buildFulfillQueryResponse("NO", null));
    }
}

// this is the function that gets called to format the response to the user when they ask for help
function getHelpResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Help";
    // this will be what the user hears after asking for help

    var speechOutput = "The Colonial History Skill provides information about US history during " +
        "the colonial era. It contains biographical information about our founding fathers " +
        "as well as information about famous events and documents. Please say, Read a Biography, " +
        "or Read the Bill of Rights." +
        "For information on important battles, please say, list battle stories."

    // if the user still does not respond, they will be prompted with this additional information

    var repromptText = "Please tell me how I can help you by saying phrases like, " +
        "Read the Biography of George Washington.";
        
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
}

// this describes the location of the first US Capital
function explainFirstCapital(intent, session, callback) {
    const cardTitle = "Colonial History - Capital Location";
    console.log("List First US Capital");

    const speechOutput = "Philadelphia was the very first capital. The First Continental Congress " +
        "had to meet in Carpenters' Hall rom September 5 to October 26, 1774, because Independence Hall " +
        "was being used by the Pennsylvania General Assembly. " +
        "Federal Hall in New York City was home to Congress for a total of about four years. " +
        "It's where Washington had his inauguration as the first President of the United States. " +
        "In 1790, the Residence Act was passed which selected Washington, DC as the permanent location. " +
        "If you would like to learn more about George Washington, please say, Read a Biography about Washington.";

    const repromptText = "Please tell me how I can help you by saying phrases like, " +
        "Read the Biography of George Washington.";
        
    callback({},
        buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, false));
}

// this describes the author of the Federalist Papers
function authorFederalistPapers(intent, session, callback) {
    const cardTitle = "Colonial History - Federalist Papers";
    console.log("List Authors of Federalist Papers");

    const speechOutput = "Alexander Hamilton, James Madison, and John Jay wrote the Federalist Papers. " +
        "For more information on these individuals, say something like Read a Biography on Alexander Hamilton.";

    const repromptText = "Please tell me how I can help you by saying phrases like, " +
        "Read the Biography of George Washington.";
        
    callback({},
        buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, false));
}

// this describes the author of the Bill of Rights
function authorBillOfRights(intent, session, callback) {
    const cardTitle = "Colonial History - Bill of Rights";
    console.log("List Author of Bill of Rights");

    const speechOutput = "James Madison is the author of the Bill of Rights. " +
        "To hear the text, please say, Read the Bill of Rights.";

    const repromptText = "Please tell me how I can help you by saying phrases like, " +
        "Read the Biography of George Washington.";
        
    callback({},
        buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, false));
}

// this describes the author of the Declaration of Independence
function authorDeclOfIndep(intent, session, callback) {
    const cardTitle = "Colonial History - Declaration of Independence";
    console.log("List Author Declaration of Independence");

    const speechOutput = "Thomas Jeffersonn is the author of the Declaration of Independence. " +
        "To hear the text, please say, Read the Declaration of Independence.";

    const repromptText = "Please tell me how I can help you by saying phrases like, " +
        "Read the Biography of George Washington.";
        
    callback({},
        buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, false));
}

// this is the function that gets called to format the response when the user is done
function handleSessionEndRequest(session, callback) {
    console.log("End session - request feedback");

    const cardTitle = "Thanks for using Colonial History Skill";
    
    var speechOutput = "Thank you for checking in with the Colonial History skill. Please take time " +
        "to provide us feedback in the Alexa app, including what else you would like to see added to this skill.";

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, speechOutput, null, true));
}

// this is the function that gets invoked when a biography is requested, but no specific name

function returnNoName(intent, session, callback) {
    var sessionAttributes = {};
    var cardTitle = "Read a Biography";

    console.log("No Biography Name Provided to Read");

    var speechOutput = "I'm sorry, can you please provide the name for someone that you would like " +
        "me to read a biography for? If you'd like me to just pick one, please say " +
        "Read me a Biography.";

    // if the user still does not respond, they will be prompted with this additional information

    var repromptText = "Please tell me how I can help you by saying phrases like, " +
        "Who was George Washington.";
        
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
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

                for (var i = 0; i < billOfRightsArray.length; i++) {
                    speechOutput = speechOutput + " " + billOfRightsArray[i].order +
                        " Amendment. " + billOfRightsArray[i].detail;
                    cardOutput = cardOutput + billOfRightsArray[i].order +
                        " Amendment\n" + billOfRightsArray[i].detail + "\n";
                }
                    
                speechOutput = speechOutput + "If you would like to hear more about historical documents, " +
                    "please say Read the Declaration of Independence, and I will do so. ";
                    
                var repromptText = "I have other historical documents that I can read. For example " +
                    "please say Read the Declaration of Independence and I will recite it. ";

                callback(sessionAttributes,
                     buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
            }
        });
}

// This replies back with a summary on the initial justices of the supreme court
function readOriginalSupremeCourt(intent, session, callback) {
    const cardTitle = "Colonial History - The Original Supreme Court";

    let cardOutput = "Original Supreme Court\n" +
        "Chief Justice John Jay\n" +
        "Associate Justice James Wilson\n" +
        "Associate Justice William Cushing\n" +
        "Associate Justice John Blair\n" +
        "Associate Justice John Rutledge\n" +
        "Associate Justice James Iredell";
    
    let speechOutput = "The Supreme Court of the United States is the only court specifically established " + 
        "by the Constitution of the United States. Implemented in 1789, under the Judiciary Act of 1789, " +
        "the Court was to be composed of six members—though the number of justices has been nine for " +
        "most of its history, this number is set by Congress, not the Constitution. " +
        "The court convened for the first time on February 2, 1790. " +
        "The original Chief Justice was John Jay, " + 
        "and five Associate Justices were " +
        "James Wilson, William Cushing, John Blair, John Rutledge and James Iredell. " +
        "If you would like to hear more about John Jay, please say, Read me a biography on John Jay.";

    const repromptText = "If you would like to hear about some of the key individuals that led the " +
        "original colonies, please say, Read me a biography, and I will do so. ";
    
    callback({},
         buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, false));
}

// This provides detail on the original cabinet
function describeOriginalCabinet(intent, session, callback) {
    const cardTitle = "Colonial History - The Original Cabinet";

    let speechOutput = "The new Constitution empowered the president to appoint executive department heads " +
        "with the consent of the Senate. Three departments had existed under the Articles of Confederation: " +
        "the Department of War, the Ministry of Foreign Affairs, and the Finance Office. " +
        "The Ministry of Foreign Affairs was reestablished on July 27th, 1789, and would be renamed " +
        "to the Department of State in September. " +
        "The Department of War was retained on August 7th, while the Finance office was renamed as the " +
        "Department of the Treasury on September 2nd. " +
        "Thomas Jefferson served as the first Secretary of State, " +
        "Alexander Hamilton served as the first Secretary of the Treasury, " +
        "Henry Knox served as the first Secretary of War, and " +
        "Edmund Randolph served as the first Attorney General. " +
        "To learn more about Alexander Hamilton, please say, Read me a Biography on Alexander Hamilton.";

    const cardOutput = "George Washington's Original Cabinet\n" +
        "Thomas Jefferson - Secretary of State\n" +
        "Alexander Hamilton - Secretary of Treasury\n" +
        "Henry Knox - Secretary of War\n" +
        "Edmund Randolph - Attorney General";

    const repromptText = "If you would like to hear about some of the key individuals that led the " +
        "original colonies, please say, Read me a biography, and I will do so. ";
    
    callback({},
         buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, false));
}

// This replies back with who was the first, second, etc. order of US Secretaries of State
function listOrderSecState(intent, session, callback) {
    const cardTitle = "Colonial History - The First Secretaries of State";
    let speechOutput = "The ";
    let secOfState = "";
    let administration = "Washington";

    console.log("List the order of Secretaries of State");

    const requestSecOfState = intent.slots.order.resolutions;

    const cardOutput = "Original Secretaries of State\n" +
        "1st - Thomas Jefferson (Washington)\n" +
        "2nd - Edmund Randolph (Washington)\n" +
        "3rd - Timothy Pickering (Washington)\n" +
        "4th - John Marshall (Adams)\n" +
        "5th - James Madison (Jefferson)\n";

    if (requestSecOfState) {
        if (requestSecOfState.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH') {
            speechOutput = speechOutput + intent.slots.order.value + " ";
            if (requestSecOfState.resolutionsPerAuthority[0].values[0].value.name === "first") {
                secOfState = "Thomas Jefferson";
            } else if (requestSecOfState.resolutionsPerAuthority[0].values[0].value.name === "second") {
                secOfState = "Edmund Randolph";
            } else if (requestSecOfState.resolutionsPerAuthority[0].values[0].value.name === "third") {
                secOfState = "Timothy Pickering";
            } else if (requestSecOfState.resolutionsPerAuthority[0].values[0].value.name === "fourth") {
                secOfState = "John Marshall";
                administration = "Adams";
            } else if (requestSecOfState.resolutionsPerAuthority[0].values[0].value.name === "fifth") {
                secOfState = "James Madison";
                administration = "Jefferson";
            }
            speechOutput = speechOutput + "Secretary of State for the United States is " + secOfState + " " +
                "serving in the " + administration + " Administration. ";
        } else {
            speechOutput = "Sorry, I don't know that. ";
        }
    } else {
        speechOutput = "Sorry, I don't know that. ";
    }

    if (secOfState === "") {
        speechOutput = speechOutput + "If you would like to know who signed the Declaration of " +
            "Independence from one of these particular colonies, please say, Who signed the " +
            "Declaration of Independence from Virginia, and I will list them.";
    } else {
        speechOutput = speechOutput + "If you would like to know more about Thomas Jefferson " + 
            ", please say, Read me a biography on Thomas Jefferson.";
    }
    
    const repromptText = "If you would like to hear about some of the key individuals that led the " +
        "original colonies, please say, Read me a biography, and I will do so. ";
    
    callback({},
         buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, false));    
    
}

// This replies back with who was the first, second, etc. order of US Presidents
function listOrderPresidents(intent, session, callback) {
    const cardTitle = "Colonial History - The Order of Presidents";
    let speechOutput = "The ";
    let president = "";

    console.log("List the order of Presidents");

    const requestPresident = intent.slots.order.resolutions;

    const cardOutput = "Original Presidents\n" +
        "1st - George Washington\n" +
        "2nd - John Adams\n" +
        "3rd - Thomas Jefferson\n" +
        "4th - James Madison\n" +
        "5th - James Monroe\n";

    if (requestPresident) {
        if (requestPresident.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH') {
            speechOutput = speechOutput + intent.slots.order.value + " ";
            if (requestPresident.resolutionsPerAuthority[0].values[0].value.name === "first") {
                president = "George Washington";
            } else if (requestPresident.resolutionsPerAuthority[0].values[0].value.name === "second") {
                president = "John Adams";
            } else if (requestPresident.resolutionsPerAuthority[0].values[0].value.name === "third") {
                president = "Thomas Jefferson";
            } else if (requestPresident.resolutionsPerAuthority[0].values[0].value.name === "fourth") {
                president = "James Madison";
            } else if (requestPresident.resolutionsPerAuthority[0].values[0].value.name === "fifth") {
                president = "James Monroe";
            }
            speechOutput = speechOutput + "President of the United States is " + president + ". ";
        } else {
            speechOutput = "Sorry, I don't know that. ";
        }
    } else {
        speechOutput = "Sorry, I don't know that. ";
    }

    if (president === "") {
        speechOutput = speechOutput + "If you would like to know who signed the Declaration of " +
            "Independence from one of these particular colonies, please say, Who signed the " +
            "Declaration of Independence from Virginia, and I will list them.";
    } else {
        speechOutput = speechOutput + "If you would like to know more about " + president + 
            ", please say, Read me a biography on " + president + ".";
    }
    
    const repromptText = "If you would like to hear about some of the key individuals that led the " +
        "original colonies, please say, Read me a biography, and I will do so. ";
    
    callback({},
         buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, false));
}

// This lists all of the original colonies as well as the date that they were founded by
function listOrigColonies(intent, session, callback) {
    var cardTitle = "Colonial History - The Original Thirteen";
    var sessionAttributes = {};
    var shouldEndSession = false;

    console.log("List the Original Colonies");

    var speechOutput = "The original thirteen colonies in order are as follows. ";
    var cardOutput = "Original Colonies\n";

    for (var i = 0; i < originalColonies.length; i++) {
        speechOutput = speechOutput + originalColonies[i].name +
            " founded in " + originalColonies[i].yearFounded + ", ";
        cardOutput = cardOutput + originalColonies[i].order +
            " - " + originalColonies[i].name + "\n";
    }
    
    speechOutput = speechOutput + ". If you would like to know who signed the Declaration of " +
        "Independence from one of these particular colonies, please say, Who signed the " +
        "Declaration of Independence from Virginia, and I will list them.";
    
    const repromptText = "If you would like to hear about some of the key individuals that led the " +
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

    const requestState = intent.slots.State.value;

    var speechOutput = "";
    var cardOutput = "";
    var validState = false;

    // first match that the state provided was valid
    for (var i = 0; i < originalColonies.length; i++) {
        if (requestState == originalColonies[i].name) {
            speechOutput = "The signers from the state of " + requestState + " are ";
            cardOutput = "US Declaration of Indepdence Signers from " + requestState + "\n";
            validState = true;
        }
    }

    // if no state was provided, read them all
    if (requestState == null) {
        // this indicates all of the states will be read
        speechOutput = "The full list of all the signers of the declaration are ";
        cardOutput = "US Declaration of Independence Signers\n";
        validState = true;
    }
    
    // if something was provided, but the state is wrong, provide that instruction back to the user
    if (validState == false) {
        speechOutput = "I'm sorry, that's not one of the original thirteen colonies. I can list " +
            "them if needed, just say, List the original Colonies.";
        cardOutput = "Invalid State - please try again";
        
        const repromptText = "If you would like to hear what the original colonies were, please say " +
            "List the original colonies.";
    
        callback(sessionAttributes,
             buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
    } else {
        // add who signed the declaration for the particular condition to the response
        var declSignatures = declarationSignaturesArray.signatures;
        var signExample = "";

        // go through the signature array and ready off the names for who signed it from the particular state
        for (var j = 0; j < declSignatures.length; j++) {
            if (requestState == declSignatures[j].state || requestState == null) {
                speechOutput = speechOutput + declSignatures[j].fullName + ", ";
                cardOutput = cardOutput + declSignatures[j].fullName + "\n";
                
                for (var k = 0; k < biographyArray.data.length; k++) {
                    if (declSignatures[j].fullName === biographyArray.data[k].person.name) {
                        signExample = declSignatures[j].fullName;
                    }
                }
            }
        }

        // if the signers have a full biography, offer to read it - else finish with another prompt
        if (signExample) {
            speechOutput = speechOutput + ". To hear more information about " + signExample + ", " +
                "please say something like, Who is " + signExample + " and I will read a short biography.";
        } else {
            speechOutput = speechOutput + ". To hear the reading of the Declaration of Indepdence, please say " +
                "Read the declaration of independence.";
        }
        const repromptText = "Would you like me to read you a biography of one of the colonial founders? " +
            "If so, just say, List available biographies, and I will let you know who I have information " +
            "about.";
    
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
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
    var cardOutput = "";

    console.log("Get List of Biographies");

    var speechOutput = "Here are the biographies to choose from - ";
    var previousPath = "";

    const bioArray = biographyArray.data;
    // build response and make sure and skip duplicates
    for (var i = 0; i < bioArray.length; i++) {
        if (bioArray[i].person.path !== previousPath) { 
            //console.log(bioArray[i].person.path + previousPath);
            speechOutput = speechOutput + bioArray[i].person.name + ", ";
            cardOutput = cardOutput + bioArray[i].person.name + '\n';
        }
        previousPath = bioArray[i].person.path;
    }

    speechOutput = speechOutput + ". If you would like me to read the biography of one of these " +
        "individuals, please say something like, Who is " + bioArray[1].person.name + ".";
                    
    const repromptText = "Would you rather find out information about famous documents? I can " +
        "recite the Declaration of Independence as well as the Bill of Rights. Just say, " +
        "Read the Declaration of Independence, and I will do so.";

    callback({},
         buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, false));
}

// This retrieves all of the available battles to choose from
function getBattleList(intent, session, callback) {
    var cardTitle = "Colonial History - Battles";
    var cardOutput = "";

    console.log("Get List of Available Battles");

    var speechOutput = "Here are the battles to choose from - ";

    for (let i = 0; i < battleArray.data.length; i++) {
        speechOutput = speechOutput + battleArray.data[i].battle.name + ", ";
        cardOutput = cardOutput + battleArray.data[i].battle.name + '\r';
    }

    speechOutput = speechOutput + ". If you would like me to read the summary of one of these " +
        "battles, please say something like, Read me the Battle of Trenton.";
                    
    const repromptText = "Would you rather find out information about famous documents? I can " +
        "recite the Declaration of Independence as well as the Bill of Rights. Just say, " +
        "Read the Declaration of Independence, and I will do so.";

    callback({},
         buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, false));
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
                
                for (var i = 0; i < bioArray.length; i++) {
                    if (bioArray[i].person.name.toLowerCase() === intent.slots.Name.value.toLowerCase()) {

                        console.log("matched - use object : " + bioArray[i].person.path);

                        foundMatch = true;

                        var s3 = new aws.S3();
                        
                        var getBioParams = {Bucket : dataBucket,
                                            Key : 'bios/' + bioArray[i].person.path};

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
    
                                const repromptText = "I have plenty of other biographies to choose from. If you " +
                                    "would like me to list those available, please say, List available biographies.";

                                callback(sessionAttributes,
                                     buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
                            }
                        });
                    }
                }

                // process logic for when no match exists
                if(foundMatch === false) {
                    console.log("Can't find biography for " +intent.slots.Name.value);
                
                    speechOutput = "I'm sorry, we don't have information about " + intent.slots.Name.value + ". " +
                        "If you would like a full list of what biographies we have, please say List available biographies.";
                    cardOutput = "No biography available for " + intent.slots.Name.value;
                    const repromptText = "If you would like for me to read any biography, please say, Read me a biography.";

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

    console.log("Getting a Biographic Story");

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
            var i = Math.floor((Math.random() * bioArray.length));
            console.log("random number: " + i.toString());
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

                    callback(sessionAttributes,
                        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
                }
            });
        }
    });
}

// this function goes through a the index of battles, and reads one back at random.
function getColonialBattle(intent, session, callback) {
    var cardTitle = "Colonial History - Battle Story";
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";
    var cardOutput = "";
    
    var repromptText = "I have plenty of other battles to read from. If you " +
        "would like me to read one, please say Read about a battle.";
    
    console.log("Getting a Colonial Battle Story");

    // check if a slot was provided for matching
    if (intent.slots) {
        // check if the battle slot was provided - this is redundant and due to the rollout
        if (intent.slots.battle.value) {
            // check if the NLU processing has attempted to resolve the slot value
            if (intent.slots.battle.resolutions) {
                // check if the slot was successfully matched
                if (intent.slots.battle.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH') {
                    console.log(JSON.stringify(intent.slots.battle.resolutions.resolutionsPerAuthority[0].values));
                    let i = Number(intent.slots.battle.resolutions.resolutionsPerAuthority[0].values[0].value.id);

                    console.log("matched - use object : " + battleArray.data[i].battle.path);

                    var s3 = new aws.S3();
                    var getBattleParams = {Bucket : dataBucket, Key : 'battles/' + battleArray.data[i].battle.path};

                    s3.getObject(getBattleParams, function(err, data) {
                        if(err) {
                            console.log('Error getting battle index data : ' + err);
                            console.log(JSON.stringify(getBattleParams));
                        } else {
                            console.log('retrieved battle object');
                            var battleData = eval('(' + data.Body + ')');

                            speechOutput = speechOutput + "Here is a brief overview of The " + battleData.name + ". ";
                            speechOutput = speechOutput + "It was fought on " + battleData.date + " in " + battleData.location + ". ";
                            speechOutput = speechOutput + battleData.longDesc;
                            speechOutput = speechOutput + " For another battle, please say, " +
                                "Read about a battle, and I will read another.";

                            cardOutput = cardOutput + battleData.name + '\r';
                            cardOutput = cardOutput + battleData.date + '\r';
                            cardOutput = cardOutput + battleData.location + '\r';
                            cardOutput = cardOutput + battleData.longDesc + '\r';
                    
                            callback(sessionAttributes,
                                buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
                        }
                    });                
                } else {
                    // in this case the NLU didn't find a match for the slot - but a value was provided
                    speechOutput = "Sorry, I don't have information on " + intent.slots.battle.value + ". " +
                        "For a list of battles available, please say, list battle stories.";
                    cardOutput = "No info available on " + intent.slots.battle.value;
                    callback(sessionAttributes,
                        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, false));
                }
            } else {
		if (intent.slots.battle.value) {
                    speechOutput = "Sorry, I don't have information on " + intent.slots.battle.value + ". " +
                    	"For a list of battles available, please say, list battle stories.";
                    cardOutput = "No info available on " + intent.slots.battle.value;
                    callback(sessionAttributes,
                    	buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, false));
		} else {
		    speechOutput = "For a list of battles available, please say, list battle stories.";
                    cardOutput = "No battle name provided.";
                    callback(sessionAttributes,
                        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, false));
		}
            }
        } else {
            // read a random battle no slots were provided
            let i = Math.round((Math.random() * battleArray.data.length));
	    console.log("Choose random battle - number:" + i);
            console.log("matched - use object : " + battleArray.data[i].battle.path);

            var s3 = new aws.S3();
            var getBattleParams = {Bucket : dataBucket, Key : 'battles/' + battleArray.data[i].battle.path};

            s3.getObject(getBattleParams, function(err, data) {
                if(err) {
                    console.log('Error getting battle index data : ' + err);
                    console.log(JSON.stringify(getBattleParams));
                } else {
                    console.log('retrieved battle object');
                    var battleData = eval('(' + data.Body + ')');

                    speechOutput = speechOutput + "Here is a brief overview of The " + battleData.name + ". ";
                    speechOutput = speechOutput + "It was fought on " + battleData.date + " in " + battleData.location + ". ";
                    speechOutput = speechOutput + battleData.longDesc;
                    speechOutput = speechOutput + " For another battle, please say, " +
                        "Read about a battle, and I will read another.";

                    cardOutput = cardOutput + battleData.name + '\r';
                    cardOutput = cardOutput + battleData.date + '\r';
                    cardOutput = cardOutput + battleData.location + '\r';
                    cardOutput = cardOutput + battleData.longDesc + '\r';
                    
                    callback(sessionAttributes,
                        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
                }
            });
        }
    } else {
        // read a random battle no slots were provided
        let i = Math.round((Math.random() * battleArray.data.length));
        console.log("matched - use object : " + battleArray.data[i].battle.path);

        var s3 = new aws.S3();
        var getBattleParams = {Bucket : dataBucket, Key : 'battles/' + battleArray.data[i].battle.path};

        s3.getObject(getBattleParams, function(err, data) {
            if(err) {
                console.log('Error getting battle index data : ' + err);
                console.log(JSON.stringify(getBattleParams));
            } else {
                console.log('retrieved battle object');
                var battleData = eval('(' + data.Body + ')');

                speechOutput = speechOutput + "Here is a brief overview of The " + battleData.name + ". ";
                speechOutput = speechOutput + "It was fought on " + battleData.date + " in " + battleData.location + ". ";
                speechOutput = speechOutput + battleData.longDesc;
                speechOutput = speechOutput + " For another battle, please say, " +
                    "Read about a battle, and I will read another.";

                cardOutput = cardOutput + battleData.name + '\r';
                cardOutput = cardOutput + battleData.date + '\r';
                cardOutput = cardOutput + battleData.location + '\r';
                cardOutput = cardOutput + battleData.longDesc + '\r';
                    
                callback(sessionAttributes,
                    buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
            }
        });
    }
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

function buildAudioCardResponse(title, output, cardInfo, objectName, repromptText, shouldEndSession) {
    var smallImagePath = "https://s3.amazonaws.com/colonial-history/cards/" + objectName + "-small.PNG";
    var largeImagePath = "https://s3.amazonaws.com/colonial-history/cards/" + objectName + "-large.PNG";

    return {
        outputSpeech: {
            type: "SSML",
            ssml: output
        },
	directives: [
	    {
		type: "Alexa.Presentation.APL.RenderDocument",
		document: {
		    type: "APL",
		    version: "1.0",
		    theme: "dark",
		    import: [
			{
			    name: "alexa-layouts",
			    version: "1.0.0"
		    	}
		    ],
		    resources: [],
		    styles: {},
		    layouts: {},
		    mainTemplate: {
			items: [
			    {
				type: "Container",
				items: [
				    {
					type: "AlexaHeader",
					headerTitle: "Welcome to the Colonial History Skill"
				    },
				    {
					type: "Container",
					alignItems: "center",
					items: [
					    {
						type: "Image",
						height: "75vh",
						width: "90vh",
						source: smallImagePath,
						scale: "best-fill",
						align: "center"
					    }
					]
				    }
				]
			    }
			]
		    }
		},
		datasources: {}
	    }
	],
        card: {
            type: "Standard",
            title: title,
            text: cardInfo,
            image: {
                smallImageUrl: smallImagePath,
                largeImageUrl: largeImagePath
            }
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

function buildNoSessionResponse(speechletResponse) {
    return {
	version: "1.0",
	response: speechletResponse
    };
}

// this helper creates a fulfillment response back to Alexa
function buildFulfillQueryResponse(canFulfill, slotInfo) {
    console.log("build fulfill query response");
    if (slotInfo !== null) {
        return {
    	    "canFulfillIntent": {
	            "canFulfill": canFulfill,
	            "slots": slotInfo
	        }
        };
    } else {
	    return {
	        "canFulfillIntent": {
		    "canFulfill": canFulfill
	        }
	    };
    }
}

// this validates information coming in from slots and manufactures the correct responses
function buildSlotDetail(slotName, slots) {
    console.log("build slot detail");
    console.log("Slots:" + JSON.stringify(slots));

    if (slotName === "Name") {
        let validName = false;
        if (slots.Name.value) {
            console.log("Checking Name: " + slots.Name.value);
            // validate that the name provided is one that a biography is available for
            for (var i = 0; i < biographyArray.data.length; i++) {
                if (biographyArray.data[i].person.name.toLowerCase() === slots.Name.value.toLowerCase()) { 
                    console.log("Matched Last Name");
                    validName = true;
                }
            }
        } else {
            console.log("No name provided to validate for biography.");
        }
        // provide response based on if the name is one with a biography
        if (validName) {
            console.log("No biography on file");
	        return {
	            "Name": {
		            "canUnderstand": "YES",
		            "canFulfill": "YES"
	            }
	        };
        } else {
            console.log("Biography on file");
	        return {
	            "Name": {
		            "canUnderstand": "YES",
		            "canFulfill": "NO"
	            }
	        };
        }
    } else if (slotName === "State") {
	    // validate that the date of the storm is in the last thirty years
	    let validState = false;
	    console.log("Attempt to match " + slots.State.value + " as an original colony.");
	    for (var i = 0; originalColonies.length < i; i ++) {
	        if (slots.State.value.toLowerCase() === originalColonies[i].name) {
                console.log("Matched Valid Colony");
	            validState = true;
	        }
	    }
        if (validState) {
            console.log("Matched with original 13 Colonies");
            return {
                "State": {
                    "canUnderstand": "YES",
                    "canFulfill": "YES"
                }
            };
        } else {
            console.log("No match with original colonies");
            return {
                "State": {
                    "canUnderstand": "YES",
                    "canFulfill": "NO"
                }
            };
        }
    } else if (slotName === "Order") {
        if (slots.order.value.toLowerCase() === "first" || slots.order.value.toLowerCase() === "second" ||
            slots.order.value.toLowerCase() === "third" || slots.order.value.toLowerCase() === "fourth" ||
            slots.order.value.toLowerCase() === "fifth") {
            console.log("Matching first five");
            return {
                "order": {
                    "canUnderstand": "YES",
                    "canFulfill": "YES"
                }
            };
        } else {
            console.log("Not listing first five");
            return {
                "order": {
                    "canUnderstand": "YES",
                    "canFulfill": "NO"
                }
            };
        }
    } else if (slotName === "Battle") {
        if (slots.battle.value) {
            console.log("battle name provided: " + slots.battle.value);
            // check the slot matching in the NLU
            if (slots.battle.resolutions) {
                // if the slot found a match - pass back that the request can be fulfilled
                if (slots.battle.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH') {
                    return {
                        "battle": {
                            "canUnderstand": "YES",
                            "canFulfill": "YES"
                        }
                    };
                } else {
                    return {
                        "battle": {
                            "canUnderstand": "YES",
                            "canFulfill": "NO"
                        }
                    };
                }
            } else {
                return {
                    "battle": {
                        "canUnderstand": "YES",
                        "canFulfill": "NO"
                    }
                };
            }    
        } else {
            console.log("No battle name provided");
            return {
                "battle": {
                    "canUnderstand": "YES",
                    "canFulfill": "NO"
                }
            };            
        }     
    } else {
	    // this means that there is no match in the slot provided - respond accordingly
        console.log("No slot to validate");
	    return {
	        "slotName1": {
                "canUnderstand": "NO",
                "canFulfill": "NO"
            }
        };
    }
}
