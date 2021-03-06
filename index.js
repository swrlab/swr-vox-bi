/*

	swr-vox-bi

	GIT		https://github.com/frytg/swr-vox-bi

	AUTHOR		Daniel Freytag
			https://twitter.com/FRYTG
			https://github.com/FRYTG

*/

const yString = require('ystring');
const os = require('os');
const queryString = require('query-string');
const fetch = require('node-fetch');
const moment = require('moment');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

const IS_LOCAL = os.hostname().indexOf('.local') !== -1 ? true : false;
const IS_DEV = process.env.STAGE == 'DEV' ? true : false;
const IS_TEST = process.env.TEST == 'GITHUB' ? true : false;
console.log({ IS_LOCAL }, { IS_DEV }, { IS_TEST });

const stationConfig = IS_TEST ? require('./stationConfig-example') : require('./stationConfig');

global.serviceStage = IS_DEV ? 'dev' : 'prod';
global.serviceName = stationConfig.serviceName;
global.serviceNameCombined = 'gcf/' + global.serviceName;
process.env.TZ = 'Europe/Amsterdam';

const yLoggerConfig = require('./yLoggerConfig');
const yLogger = require('ylogger');
const logger = new yLogger(yLoggerConfig).log;

const config = {
	ati: {
		baseUrl: stationConfig.atiEndpoint /* ATI ENDPOINT */,
		siteLevel1:
			process.env.ATI_STAGE == 'DEV'
				? stationConfig.atiSiteLevel1.dev
				: stationConfig.atiSiteLevel1.prod /* SITE ID */,
		siteLevel2: stationConfig.atiSiteLevel2,
	},
};

const atiConfigBuild = {
	pageview: function (p, t) {
		return {
			/* whatever */ from: 'p',
			/* siteLevel1 */ s: config.ati.siteLevel1,
			/* siteLevel2 */ s2: t.siteLevel2,
			/* userId */ idclient: p.userId,
			/* encoded path */ p: ['Voice', ...t.path, ''].join('::'),
			/* language */ lng: 'de-DE',
			/* ms-timestamp */ rn: Date.now(),

			/* PAGEVIEW SPECIFIC */
			/* contentId */ x1: t.contentId
				? yString.upperCase(t.station) +
				  '-' +
				  p.intentName +
				  '-' +
				  yString.camelCase(t.contentId)
				: yString.upperCase(t.station) + '-' + p.intentName,
			/* objectType */ x2: t.contentType,
			/* page name */ x3: t.contentId
				? 'Voice ' + p.intentName + ' / ' + t.contentId
				: 'Voice ' + p.intentName,
			/* portal */ x5:
				t.deviceType == 'amazonAlexa'
					? 'amazon.de'
					: t.deviceType == 'googleHome'
					? 'google.de'
					: 'SWR.de',
			/* extern */ x6: 'ja',
			/* mobile */ x7: 'nein',
			/* level2 again */ x8: t.siteLevel2,
			/* opt event */ x9: t.contentId,
		};
	},
	/* DEV: MEDIA IS STILL IN THE WORKS */
	media: function (p, t) {
		return {
			/* page */ from: 'p',
			/* siteLevel1 */ s: config.ati.siteLevel1,
			/* siteLevel2 */ s2: t.siteLevel2,
			/* userId */ idclient: p.userId,
			/* encoded path */ p: [yString.camelCase('Voice ' + t.deviceType), ...t.path].join('::'),
			/* language */ lng: 'de-DE',
			/* ms-timestamp */ rn: Date.now(),

			/* MEDIA SPECIFIC */
			/* e.g. play */ action: t.mediaAction,
			/* content duration */ m1: 0,
			m5: 'int',
			/* live/ clip */ m6: t.broadcastType,
			/* audio/ video */ type: t.mediaType,
		};
	},
};

const alexaV1 = async function (req, res) {
	try {
		const startTime = moment().valueOf();
		IS_DEV ? console.log('req.body', req.body) : null;
		IS_DEV ? console.log('req.headers', req.headers) : null;
		IS_DEV ? console.log('req.query', req.query) : null;

		var p = req.body;

		// Check POST request
		if (req.method !== 'POST') {
			logger('error', 'alexaV1', 'HTTP method must be POST', { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: 'HTTP method must be POST',
			});
			return;
		}

		if (req.get('content-type') !== 'application/json') {
			logger('error', 'alexaV1', 'content-type must be application/json', { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: 'content-type must be application/json',
			});
			return;
		}

		if (p.accessToken !== stationConfig.alexaV1token) {
			logger('error', 'alexaV1', "accessToken doesn't match requirements", { post: p });
			res.status(403).json({
				success: false,
				status: 400,
				error: "accessToken doesn't match requirements",
			});
			return;
		}

		if (!p.voiceAppName || p.voiceAppName.length < 4) {
			logger('error', 'alexaV1', "voiceAppName doesn't match requirements", { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: "voiceAppName doesn't match requirements",
			});
			return;
		}

		if (p.voiceAppRegion == null) {
			// Do nothing
		} else if (
			!(
				yString.lowerCase(p.voiceAppRegion) == 'bw' ||
				yString.lowerCase(p.voiceAppRegion) == 'rp' ||
				yString.lowerCase(p.voiceAppRegion) == 'ma' ||
				yString.lowerCase(p.voiceAppRegion) == 'hn' ||
				yString.lowerCase(p.voiceAppRegion) == 'ka' ||
				yString.lowerCase(p.voiceAppRegion) == 'tu' ||
				yString.lowerCase(p.voiceAppRegion) == 'ul' ||
				yString.lowerCase(p.voiceAppRegion) == 'fr' ||
				yString.lowerCase(p.voiceAppRegion) == 'fn' ||
				yString.lowerCase(p.voiceAppRegion) == 'ko' ||
				yString.lowerCase(p.voiceAppRegion) == 'tr' ||
				yString.lowerCase(p.voiceAppRegion) == 'kl' ||
				yString.lowerCase(p.voiceAppRegion) == 'lu'
			)
		) {
			logger('error', 'alexaV1', "voiceAppRegion doesn't match requirements", { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: "voiceAppRegion doesn't match requirements",
			});
			return;
		}

		if (!p.voiceAppVersion) {
			logger('error', 'alexaV1', "voiceAppVersion doesn't match requirements", { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: "voiceAppVersion doesn't match requirements",
			});
			return;
		}

		if (!p.userId || p.userId.length < 10) {
			logger('error', 'alexaV1', "userId doesn't match requirements", { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: "userId doesn't match requirements",
			});
			return;
		}

		if (!p.sessionId || p.sessionId.length < 10) {
			logger('error', 'alexaV1', "sessionId doesn't match requirements", { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: "sessionId doesn't match requirements",
			});
			return;
		}

		if (!p.deviceId || p.deviceId.length < 10) {
			logger('error', 'alexaV1', "deviceId doesn't match requirements", { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: "deviceId doesn't match requirements",
			});
			return;
		}

		if (!p.intentType || p.intentType.length < 7) {
			logger('error', 'alexaV1', "intentType doesn't match requirements", { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: "intentType doesn't match requirements",
			});
			return;
		}

		if (p.intentType == 'IntentRequest') {
			if (!p.intentName) {
				logger('error', 'alexaV1', "intentName doesn't match requirements", { post: p });
				res.status(400).json({
					success: false,
					status: 400,
					error: "intentName doesn't match requirements",
				});
				return;
			}

			if (p.intentSlotsFilled == null) {
				logger('error', 'alexaV1', "intentSlotsFilled doesn't match requirements", { post: p });
				res.status(400).json({
					success: false,
					status: 400,
					error: "intentSlotsFilled doesn't match requirements",
				});
				return;
			}

			if (p.intentSlotsFilled) {
				if (!p.intentSlots) {
					logger('error', 'alexaV1', "intentSlots doesn't match requirements", {
						post: p,
					});
					res.status(400).json({
						success: false,
						status: 400,
						error: "intentSlots doesn't match requirements",
					});
					return;
				}
			}
		}

		// Build request
		var t = {};

		t.deviceType = 'amazonAlexa';

		t.station = p.voiceAppRegion
			? yString.lowerCase(p.voiceAppName + '-' + p.voiceAppRegion)
			: yString.lowerCase(p.voiceAppName);

		t.siteLevel2 = config.ati.siteLevel2[t.station];

		t.userAgent =
			t.deviceType == 'amazonAlexa'
				? yString.upperCase(t.station) + ' Voice Amazon Alexa'
				: t.deviceType == 'googleHome'
				? yString.upperCase(t.station) + ' Voice Google Home'
				: yString.upperCase(t.station) + ' Voice Unkown Device';

		t.trackingType = 'pageview';

		// Analyse intentType
		if (p.intentType == 'LaunchRequest') {
			// User launched Skill
			p.intentName = 'LaunchRequest';
			t.pageName = t.station + ' ' + p.intentName;
			t.path = [p.intentType];
			t.contentType = 'Übersichtsseite';
			t.contentId = '';
		} else if (p.intentType == 'IntentRequest') {
			// User launched Skill with intent
			if (p.intentType.indexOf('AMAZON.') !== -1 || p.intentName.indexOf('AMAZON.') !== -1) {
				// All information are available
				t.trackingType = 'media';

				t.path = [p.intentName, yString.camelCase(p.intentSlots)];
				t.contentType = 'Audio';
				t.contentId = p.intentSlots;
			} else if (p.intentSlotsFilled) {
				// All information are available
				t.path = [p.intentName, yString.camelCase(p.intentSlots)];
				t.contentType = 'Sonstiges';
				t.contentId = p.intentSlots;
			} else {
				// Do not track for now
				t.path = [p.intentName, 'SLOTS_UNFULFILLED'];
				t.contentType = 'Sonstiges';
				t.contentId = null;
			}
		} else if (p.intentType.indexOf('AudioPlayer.') !== -1) {
			// Audioplayer Action
			t.trackingType = 'media';

			t.path = [];
			t.contentType = 'Audio';
			t.contentId = '';
		} else {
			// WTF? Do something
			logger('error', 'alexaV1', 'intentType not yet recognized!', { post: p });
			res.status(200).json({
				success: true,
				status: 200,
				error: 'intentType not yet recognized',
			});
			return;
		}

		if (!t.siteLevel2) {
			if (t.station == 'swr4-skill' || t.station == 'swr1-skill') {
				res.sendStatus(200);
				console.warn('t.station == swr4-skill');
				return;
			} else {
				logger('error', 'alexaV1', "siteLevel2 can't be matched", {
					station: t.station,
					post: p,
				});
				res.status(400).json({
					success: false,
					status: 400,
					error: "siteLevel2 can't be matched",
				});
				return;
			}
		}

		var a = atiConfigBuild[t.trackingType](p, t);

		t.params = queryString.stringify(a, { sort: false });
		t.atiUrl = config.ati.baseUrl + '?' + t.params;
		t.userAgent =
			t.deviceType + '/' + p.voiceAppVersion + ' (' + p.voiceAppName + '; ' + p.voiceAppRegion + ')';
		t.atiOptions = {
			headers: {
				'user-agent': t.userAgent,
			},
		};

		if (IS_DEV) {
			console.log({ p });
			console.log({ t });
			console.log({ a });
		}

		if (a.s2 && t.trackingType == 'pageview') {
			var fetchThis = await fetch(t.atiUrl, t.atiOptions);
			console.log(
				'logged event in >',
				parseInt(moment().valueOf() - startTime),
				'ms',
				fetchThis.status
			);
		} else if (a.s2 && t.trackingType == 'media') {
			console.log('t.trackingType', t.trackingType, 'not pushing to ATI');
		}

		res.status(200).json({
			success: true,
			status: 200,
			error: null,
			ati: p.showAti ? a : null,
			post: p,
			this: p.showAti ? t : null,
		});
	} catch (err) {
		console.error('alexaV1', err);
		logger('error', 'alexaV1', 'general error', { error: err });
		res.sendStatus(500);
	}
};

const googleHomeV1 = async function (req, res) {
	try {
		const startTime = moment().valueOf();
		IS_DEV ? console.log('req.body', req.body) : null;
		IS_DEV ? console.log('req.headers', req.headers) : null;
		IS_DEV ? console.log('req.query', req.query) : null;

		var p = req.body;

		// Check POST request
		if (req.method !== 'POST') {
			logger('error', 'googleHomeV1', 'HTTP method must be POST', { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: 'HTTP method must be POST',
			});
			return;
		}

		if (req.get('content-type') !== 'application/json') {
			logger('error', 'googleHomeV1', 'content-type must be application/json', { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: 'content-type must be application/json',
			});
			return;
		}

		if (p.accessToken !== stationConfig.googleHomeV1token) {
			logger('error', 'googleHomeV1', "accessToken doesn't match requirements", { post: p });
			res.status(403).json({
				success: false,
				status: 400,
				error: "accessToken doesn't match requirements",
			});
			return;
		}

		if (!p.voiceAppName || p.voiceAppName.length < 4) {
			logger('error', 'googleHomeV1', "voiceAppName doesn't match requirements", { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: "voiceAppName doesn't match requirements",
			});
			return;
		}

		if (p.voiceAppRegion == null) {
			// Do nothing
		} else if (
			!(
				yString.lowerCase(p.voiceAppRegion) == 'bw' ||
				yString.lowerCase(p.voiceAppRegion) == 'rp' ||
				yString.lowerCase(p.voiceAppRegion) == 'ma' ||
				yString.lowerCase(p.voiceAppRegion) == 'hn' ||
				yString.lowerCase(p.voiceAppRegion) == 'ka' ||
				yString.lowerCase(p.voiceAppRegion) == 'tu' ||
				yString.lowerCase(p.voiceAppRegion) == 'ul' ||
				yString.lowerCase(p.voiceAppRegion) == 'fr' ||
				yString.lowerCase(p.voiceAppRegion) == 'fn' ||
				yString.lowerCase(p.voiceAppRegion) == 'ko' ||
				yString.lowerCase(p.voiceAppRegion) == 'tr' ||
				yString.lowerCase(p.voiceAppRegion) == 'kl' ||
				yString.lowerCase(p.voiceAppRegion) == 'lu'
			)
		) {
			logger('error', 'googleHomeV1', "voiceAppRegion doesn't match requirements", { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: "voiceAppRegion doesn't match requirements",
			});
			return;
		}

		if (!p.voiceAppVersion) {
			logger('error', 'googleHomeV1', "voiceAppVersion doesn't match requirements", { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: "voiceAppVersion doesn't match requirements",
			});
			return;
		}

		if (!p.userId || p.userId.length < 10) {
			logger('error', 'googleHomeV1', "userId doesn't match requirements", { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: "userId doesn't match requirements",
			});
			return;
		}

		if (!p.sessionId || p.sessionId.length < 10) {
			logger('error', 'googleHomeV1', "sessionId doesn't match requirements", { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: "sessionId doesn't match requirements",
			});
			return;
		}

		if (!p.deviceId || p.deviceId.length < 10) {
			logger('error', 'googleHomeV1', "deviceId doesn't match requirements", { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: "deviceId doesn't match requirements",
			});
			return;
		}

		// Not checking intentType for googleHome!

		if (p.intentSlotsFilled == null) {
			logger('error', 'googleHomeV1', "intentSlotsFilled doesn't match requirements", { post: p });
			res.status(400).json({
				success: false,
				status: 400,
				error: "intentSlotsFilled doesn't match requirements",
			});
			return;
		}

		if (p.intentSlotsFilled) {
			if (!p.intentSlots) {
				logger('error', 'googleHomeV1', "intentSlots doesn't match requirements", { post: p });
				res.status(400).json({
					success: false,
					status: 400,
					error: "intentSlots doesn't match requirements",
				});
				return;
			}
		}

		if (p.voiceAppName == 'dasding') {
			p.voiceAppName = 'swr-' + p.voiceAppName;
		}

		if (p.voiceAppName == 'swraktuell') {
			p.voiceAppName = 'swr-aktuell';
		}

		// Build request
		var t = {};

		t.deviceType = 'googleHome';

		t.station = p.voiceAppRegion
			? yString.lowerCase(p.voiceAppName + '-skill-' + p.voiceAppRegion)
			: yString.lowerCase(p.voiceAppName) + '-skill';

		t.siteLevel2 = config.ati.siteLevel2[t.station];

		t.userAgent =
			t.deviceType == 'amazonAlexa'
				? yString.upperCase(t.station) + ' Voice Amazon Alexa'
				: t.deviceType == 'googleHome'
				? yString.upperCase(t.station) + ' Voice Google Home'
				: yString.upperCase(t.station) + ' Voice Unbekanntes Gerät';

		t.trackingType = 'pageview';

		// Analyse intentType
		if (p.intentSlotsFilled && p.intentSlots == '{}') {
			// unfulfilled but not needed
			t.path = [p.intentName];
			t.contentType = 'Intent';
			t.contentId = 'none';
		} else if (p.intentSlotsFilled && p.intentSlots != '{}') {
			// All information are available
			t.path = [p.intentName, yString.camelCase(p.intentSlots)];
			t.contentType = 'Intent';
			t.contentId = p.intentSlots;
		} else {
			// unfulfilled
			t.path = [p.intentName, 'SLOTS_UNFULFILLED', yString.camelCase(p.intentSlots)];
			t.contentType = 'Feedback';
			t.contentId = null;
		}

		// Matching Alexa/Google naming #hack
		if (p.intentName == 'WelcomeIntent') {
			p.intentName = 'LaunchRequest';
			p.contentId = null;
		}

		if (!t.siteLevel2) {
			if (t.station == 'swr4-skill' || t.station == 'swr1-skill') {
				res.sendStatus(200);
				console.warn('t.station == swr4-skill');
				return;
			} else {
				logger('error', 'googleHomeV1', "siteLevel2 can't be matched", {
					station: t.station,
					post: p,
				});
				res.status(400).json({
					success: false,
					status: 400,
					error: "siteLevel2 can't be matched",
				});
				return;
			}
		}

		var a = atiConfigBuild[t.trackingType](p, t);

		t.params = queryString.stringify(a, { sort: false });
		t.atiUrl = config.ati.baseUrl + '?' + t.params;
		t.userAgent =
			t.deviceType + '/' + p.voiceAppVersion + ' (' + p.voiceAppName + '; ' + p.voiceAppRegion + ')';
		t.atiOptions = {
			headers: {
				'user-agent': t.userAgent,
			},
		};

		if (IS_DEV) {
			console.log({ p });
			console.log({ t });
			console.log({ a });
		}

		if (a.s2 && t.trackingType == 'pageview') {
			var fetchThis = await fetch(t.atiUrl, t.atiOptions);
			console.log(
				'logged event in >',
				parseInt(moment().valueOf() - startTime),
				'ms',
				fetchThis.status
			);
		} else if (a.s2 && t.trackingType == 'media') {
			console.warn('t.trackingType', t.trackingType);
		}

		res.status(200).json({
			success: true,
			status: 200,
			error: null,
			ati: p.showAti ? a : null,
			post: p,
			this: p.showAti ? t : null,
		});
	} catch (err) {
		console.error('googleHomeV1', err);
		logger('error', 'googleHomeV1', 'general error', { error: err });
		res.sendStatus(500);
	}
};

// init express
app.use(bodyParser.json());
app.set('json spaces', 2);
app.disable('x-powered-by');

// set express routes
app.post('/alexa/v1', alexaV1);
app.post('/googlehome/v1', googleHomeV1);

// start express server
app.listen(8080);

// quit on github run
if (process.env.IS_GITHUB == 'true') {
	process.exit();
}
