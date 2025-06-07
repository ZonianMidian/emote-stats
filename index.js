const express = require('express');
const got = require('got');
const app = express();
const port = 2050;

app.use('/static', express.static(`${__dirname}/static`));
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');

async function getInfo(user) {
	const { body, statusCode } = await got(`https://api.ivr.fi/v2/twitch/user?login=${user}`, {
		throwHttpErrors: false,
		responseType: 'json',
		headers: { 'User-Agent': 'Emote Stats by ZonianMidian' },
	});
	if (statusCode < 200 || statusCode > 299 || !body.length) return null;

	const displayName = body[0].displayName.toLowerCase() === user ? body[0].displayName : user;
	return { name: displayName, avatar: body[0].logo, id: body[0].id };
}

function emoteLink(id, extension) {
	switch (extension) {
		case 'BTTV':
			return `https://cdn.betterttv.net/emote/${id}/2x`;
		case 'FFZ':
			return `https://cdn.frankerfacez.com/emoticon/${id}/2`;
		case 'Twitch':
			return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;
	}
}

async function parseEmotes(emotes, extension) {
	switch (extension) {
		case 'BTTV':
		case 'FFZ':
		case 'Twitch': {
			const emoteArray = [];
			emotes.map((emote) => {
				const emoteData = {
					id: emote.id,
					name: emote.emote,
					link: emoteLink(emote.id, extension),
					usage: emote.amount ?? 0,
				};
				emoteArray.push(emoteData);
			});
			return emoteArray;
		}
		case '7TV': {
			const emoteArray = [];
			emotes.map((emote) => {
				const id = emote.id && emote.id.length === 24 ? objectIdToUlid(emote.id) : emote.id;

				const emoteData = {
					id,
					name: emote.name ?? emote.emote,
					alias: emote.alias ?? null,
					link: `https://cdn.7tv.app/emote/${id}/2x.webp`,
					usage: emote.count ?? emote.amount ?? 0,
				};
				if (emoteData.usage > 0) emoteArray.push(emoteData);
			});
			return emoteArray;
		}
	}
}

function objectIdToUlid(objectId) {
	const id = BigInt(`0x${objectId}`);

	const timestamp = (id >> 64n) * 1000n;
	const random = id & 0xffffffffffffffffn;

	return encodeULIDPart(timestamp, 10) + encodeULIDPart(random, 16);
}

function encodeULIDPart(part, size) {
	const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
	let result = '';

	for (let i = 0; i < size; i++) {
		result = alphabet[Number(part % 32n)] + result;
		part /= 32n;
	}

	return result;
}

async function getChannel(channel) {
	const { body: SE_Stats, statusCode: SE_Status } = await got(`https://api.streamelements.com/kappa/v2/chatstats/${channel}/stats`, {
		throwHttpErrors: false,
		responseType: 'json',
		headers: { 'User-Agent': 'Emote Stats by ZonianMidian' },
	});
	const SE =
		SE_Status < 200 || SE_Status > 299
			? {}
			: {
					BTTV: await parseEmotes(SE_Stats.bttvEmotes, 'BTTV'),
					FFZ: await parseEmotes(SE_Stats.ffzEmotes, 'FFZ'),
					Twitch: await parseEmotes(SE_Stats.twitchEmotes, 'Twitch'),
					STV: await parseEmotes(SE_Stats.sevenTVEmotes, '7TV'),
				};

	const { body: MZ_Stats, statusCode: MZ_Status } = await got(`https://7tv.markzynk.com/c/${channel}`, {
		throwHttpErrors: false,
		responseType: 'json',
		headers: { 'User-Agent': 'Emote Stats by ZonianMidian' },
	});
	const MZ = MZ_Status < 200 || MZ_Status > 299 ? {} : { STV: await parseEmotes(MZ_Stats.emotes, '7TV') };

	const sources = [SE, MZ].filter((obj) => Object.keys(obj).length > 0);

	if (sources.length === 0) return {};

	const allKeys = Array.from(new Set(sources.flatMap((obj) => Object.keys(obj))));
	let onlySE = false;
	const result = {};

	for (const key of allKeys) {
		const arrays = sources.map((obj) => obj[key]).filter(Boolean);

		if (arrays.length === 0) continue;
		if (arrays.length > 1) onlySE = true;

		const byId = {};

		for (const arr of arrays) {
			for (const emote of arr) {
				if (!byId[emote.id]) {
					byId[emote.id] = { ...emote };
				} else {
					const existing = byId[emote.id];
					if (emote.alias != null) {
						byId[emote.id] = {
							...existing,
							...emote,
							usage: Math.max(existing.usage, emote.usage),
						};
					} else {
						byId[emote.id] = {
							...emote,
							...existing,
							usage: Math.max(existing.usage, emote.usage),
						};
					}
				}
			}
		}
		result[key] = Object.values(byId);
	}

	if (Object.keys(result).length === 0) return {};

	for (const key in result) {
		if (Array.isArray(result[key])) {
			result[key].sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0));
		}
	}

	result.onlySE = onlySE;
	return result;
}

async function getGlobals() {
	const { body: SE_Stats } = await got(`https://api.streamelements.com/kappa/v2/chatstats/global/stats`, {
		throwHttpErrors: false,
		responseType: 'json',
		headers: { 'User-Agent': 'Emote Stats by ZonianMidian' },
	});

	const { body: K_Stats } = await got(`https://7tv.markzynk.com/top`, {
		throwHttpErrors: false,
		responseType: 'json',
		headers: { 'User-Agent': 'Emote Stats by ZonianMidian' },
	});

	return {
		BTTV: await parseEmotes(SE_Stats.bttvEmotes, 'BTTV'),
		FFZ: await parseEmotes(SE_Stats.ffzEmotes, 'FFZ'),
		Twitch: await parseEmotes(SE_Stats.twitchEmotes, 'Twitch'),
		STV: await parseEmotes(K_Stats.emotes, '7TV'),
	};
}

app.get('/', (req, res) => {
	res.render('index');
});

app.get('/global', async (req, res) => {
	const globalData = await getGlobals();
	res.render('global', { data: globalData });
});

app.get('/faq', (req, res) => {
	res.render('faq');
});

app.get('/contact', async (req, res) => {
	const userInfo = await getInfo('zonianmidian');
	res.render('contact', userInfo);
});

app.get('/channel', (req, res) => {
	res.redirect('/global');
});

app.get('/c', (req, res) => {
	res.redirect('/global');
});

app.get('/channel/:name', (req, res) => {
	res.redirect(`/c/${req.params.name}`);
});

app.get('/c/:name', async (req, res) => {
	const user = req.params.name.toLowerCase();

	if (user === 'global') {
		const globalData = await getGlobals();
		res.render('global', { data: globalData });
	} else {
		if (!new RegExp(/^[a-z0-9]\w{0,24}$/i).exec(user)) return res.render('error', { error: 'Invalid username', code: '' });

		const userInfo = await getInfo(user);
		if (!userInfo) return res.render('error', { error: 'User not found', code: '' });

		const channelData = await getChannel(user);
		if (!channelData)
			return res.render('error', {
				error: 'No statistics available',
				code: '',
			});

		res.render('channel', { data: channelData, user: userInfo });
	}
});

app.use(function (req, res, next) {
	const err = new Error('Not found');
	err.status = 404;
	next(err);
});

app.use(function (err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', { error: err.message, code: `${err.status} - ` });
});

app.listen(port, () => {
	console.log(`Statistics website listening on ${port}`);
});
