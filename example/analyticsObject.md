## Demo Script for analytics in Google Actions
```
// Building analytics object with request.body data
var intentSlotsTemp = [];
var analyticsObject = {
	accessToken: 		'lol',
	voiceAppName:		STATION,
	voiceAppRegion:		null,
	voiceAppVersion:	'1',
	userId:			request.body.originalDetectIntentRequest.payload.user.userId,
	sessionId:		request.body.session,
	deviceId:		'google-home_' + request.body.originalDetectIntentRequest.payload.user.locale,
	intentType:		null,
	intentName:		request.body.queryResult.intent.displayName,
	intentSlotsFilled:	request.body.queryResult.allRequiredParamsPresent,
}

// Mapping Google parameters to Alexa-Style to get better insights
for (key in request.body.queryResult.parameters) {
	if(key == 'ChannelName') {
		intentSlotsTemp.push('channel: ' + request.body.queryResult.parameters[key])
	} else if(key == 'PodcastName') {
		intentSlotsTemp.push('podcast: ' + request.body.queryResult.parameters[key])
	} else if(key == 'auto') {
		var intentSlotsTempAuto = request.body.queryResult.parameters[key]
			intentSlotsTempAuto = intentSlotsTempAuto.join(', ').replace('B', 'BSTR').replace('A', 'BAB')
		intentSlotsTemp.push('Stauinfo für : ' + intentSlotsTempAuto)
	} else  {
		intentSlotsTemp.push(key + ': ' + request.body.queryResult.parameters[key])
	}
}

// Only replacing parameter mapping if array larger than 0, otherwise 'none'
analyticsObject.intentSlots		= intentSlotsTemp.length > 0 ? intentSlotsTemp.join('/ ')	: 'none'
analyticsObject.intentSlotsFilled 	= analyticsObject.intentSlotsFilled == null ? false 		: true
```

## How to send handleAnalytics
Import handler
```
const handleAnalytics = require('./utils/handleAnalytics')
```

Then hand over `analyticsObject` to `handleAnalytics` handler which makes a POST request to Google Cloud Functions (this project `swr-vox-bi`)
```
handleAnalytics(agent, conv, analyticsObject);
```

[View handleAnalytics.js Demo Script](handleAnalytics.js)  
Note: You'll need something like `stationConfig` or a similar config to set `analyticsUrl`.

## These POST options are required
```
accessToken
voiceAppName		{ swr1 }
voiceAppRegion		{ bw, rp, null }
voiceAppVersion		{ 03 }
userId
sessionId
deviceId
intentType		{ LaunchRequest, IntentRequest, AudioPlayer.* }
intentName		{ TrafficIntent, ... }
intentSlotsFilled	{ true, false }
intentSlots		{ chill out, BAB 5, BSTR 10 }
intentAudio
```
