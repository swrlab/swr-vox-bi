/*

	swr-vox-bi

	AUTHOR		Daniel Freytag
			https://twitter.com/FRYTG
			https://github.com/FRYTG


*/

module.exports = {
	serviceName:			'swr-vox-bi',

	atiEndpoint:			'https://YOUR_URL.xiti.com/hit.xiti',

	atiSiteLevel1: 	{
		dev:			12345,
		prod:			67890
	},
	atiSiteLevel2: {
		'swr1-skill-bw':	01,
		'swr1-skill-rp': 	02
		/* ... */
	},

	yLoggerInUse:			false,

	alexaV1token:			'SOMETHING_LONG_AND_CRYPTIC',
	googleHomeV1token:		'ALSO_SOMETHING_LONG_AND_CRYPTIC',

};
