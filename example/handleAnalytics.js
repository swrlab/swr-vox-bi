/*

	swr-vox-bi

	AUTHOR		Daniel Freytag
			https://twitter.com/FRYTG
			https://github.com/FRYTG

*/

const request			= require('request');
const os			= require('os');
const fetch			= require('node-fetch');
const dateFormat		= require('dateformat');
const rpn			= require('request-promise-native');
const xml			= require('xml-js');

const IS_LOCAL			= (os.hostname().indexOf('.local') !== -1 || os.hostname().indexOf('s000') !== -1) ? true : false;
const IS_DEV 			= (process.env.STAGE == 'DEV') ? true : false;
const STATION 			= process.env.STATION ? process.env.STATION : 'fallback';
console.log({ IS_LOCAL }, { IS_DEV }, { STATION });

global.serviceName 		= STATION + '-vox';
global.serviceStage 		= IS_DEV ? 'dev': 'prod';
global.serviceNameCombined	= IS_LOCAL ? os.hostname() + '/' + global.serviceName : 'gcf/' + global.serviceName;
process.env.TZ 			= 'Europe/Amsterdam';

const yLoggerConfig 		= require('../config/yLoggerConfig');
const yLogger 			= require('ylogger');
const logger 			= new yLogger(yLoggerConfig).log;


// Import Configs and Mappings
const {
	stationConfig
}				= require('../config/index')


const handleAnalytics = async function(agent, conv, analyticsObject) {
	try {
		console.log('disabledMonitoring?', conv.user.storage.disabledMonitoring);

		// Analytics are second- not third-tier region based, so manually map them
		if(analyticsObject.voiceAppRegion == 'ma' ||
		   analyticsObject.voiceAppRegion == 'hn' ||
		   analyticsObject.voiceAppRegion == 'ka' ||
		   analyticsObject.voiceAppRegion == 'tu' ||
		   analyticsObject.voiceAppRegion == 'ul' ||
		   analyticsObject.voiceAppRegion == 'fr' ||
		   analyticsObject.voiceAppRegion == 'fn') {
			console.log('overwriting voiceAppRegion to > bw');
			analyticsObject.voiceAppRegion = 'bw'

		} else if (analyticsObject.voiceAppRegion == 'ko' ||
		   analyticsObject.voiceAppRegion == 'tr' ||
   		   analyticsObject.voiceAppRegion == 'kl' ||
	   	   analyticsObject.voiceAppRegion == 'lu') {
			console.log('overwriting voiceAppRegion to > rp');
			analyticsObject.voiceAppRegion = 'rp'

		}

		if(!conv.user.storage.disabledMonitoring && stationConfig.analyticsAreSupported) {
			IS_DEV ? console.log('analytics enabled') : null
			IS_DEV ? console.log({analyticsObject}) : null

			var fetchOptions= {
					method: 'POST',
					body: JSON.stringify(analyticsObject),
					headers: { 'Content-Type': 'application/json' }
				}
			var fetchThis	= await fetch(stationConfig.analyticsUrl, fetchOptions)
			var fetchJson	= await fetchThis.json()

			IS_DEV ? console.log({fetchJson}) : null

		} else {
			IS_DEV ? console.log('analytics disabled') : null
		}
	} catch(err) {
		logger("error", "handleAnalytics", "error", {error: err});
	}
};

module.exports = handleAnalytics;
