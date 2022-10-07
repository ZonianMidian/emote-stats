const express = require('express');
const got = require('got');
const app = express();
const port = 2050;

app.use('/static', express.static(`${__dirname}/static`))
app.set('views', `${__dirname}/views`)
app.set('view engine', 'ejs')

async function getInfo(user) {

    const { body, statusCode } = await got(`https://api.ivr.fi/v2/twitch/user/${user}`, {
        throwHttpErrors: false,
        responseType: 'json'
    });
    if (statusCode < 200 || statusCode > 299) return null

    const displayName = body.displayName.toLowerCase() === user ? body.displayName : user
    return { name: displayName, avatar: body.logo, id: body.id }

}

function emoteLink (id, extension) {
    switch (extension) {
        case 'BTTV': return `https://cdn.betterttv.net/emote/${id}/2x`;
        case 'FFZ': return `https://cdn.frankerfacez.com/emoticon/${id}/2`;
        case 'Twitch': return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;
    }
}

async function parseEmotes(emotes, extension) {
    switch (extension) {
        case 'BTTV':
        case 'FFZ':
        case 'Twitch': {
            const emoteArray = []
            emotes.map(emote => {
                const emoteData = {
                name: emote.emote, 
                id: emote.id,
                link: emoteLink(emote.id, extension),
                usage: emote.amount
                }
                emoteArray.push(emoteData)
            })
            return emoteArray
        }
        case '7TV': {
            const emoteArray = []
            emotes.map(emote => {
                const emoteData = {
                name: emote.name,
                id: emote.emote,
                link: `https://cdn.7tv.app/emote/${emote.emote}/2x`,
                usage: emote.usage ?? 0
                }
                emoteArray.push(emoteData)
            })

            const sortedEmotes = emoteArray.sort((a, b) => b.usage - a.usage)
            return sortedEmotes
        }
    }

}

async function getChannel(channel) {
    const { body: SE_Stats, statusCode: SE_Status } = await got(`https://api.streamelements.com/kappa/v2/chatstats/${channel}/stats`, {
        throwHttpErrors: false,
        responseType: 'json'
    });
    const SE = (SE_Status < 200 || SE_Status > 299) ? null : {BTTV: await parseEmotes(SE_Stats.bttvEmotes, 'BTTV'),
    FFZ: await parseEmotes(SE_Stats.ffzEmotes, 'FFZ'), Twitch: await parseEmotes(SE_Stats.twitchEmotes, 'Twitch')}

    const { body: K_Stats, statusCode: K_Status } = await got(`https://api.kattah.me/c/${channel}`, {
        throwHttpErrors: false,
        responseType: 'json'
    });
    const K = (K_Status < 200 || K_Status > 299) ? null : {STV: await parseEmotes(K_Stats.data, '7TV')}

    if (!SE && !K) return null
    return Object.assign(SE, K)
}

async function getGlobals() {
    const { body: SE_Stats } = await got(`https://api.streamelements.com/kappa/v2/chatstats/global/stats`, {
        throwHttpErrors: false,
        responseType: 'json'
    });

    const { body: K_Stats_G } = await got(`https://api.kattah.me/global`, {
        throwHttpErrors: false,
        responseType: 'json'
    });

    const { body: K_Stats_T } = await got(`https://api.kattah.me/top`, {
        throwHttpErrors: false,
        responseType: 'json'
    });

    let sortedEmotes = [].concat(K_Stats_G.data.global, K_Stats_T.data).sort((a, b) => b.usage - a.usage);

    return {BTTV: await parseEmotes(SE_Stats.bttvEmotes, 'BTTV'), FFZ: await parseEmotes(SE_Stats.ffzEmotes, 'FFZ'), 
        Twitch: await parseEmotes(SE_Stats.twitchEmotes, 'Twitch'), STV: await parseEmotes(sortedEmotes, '7TV')}
}

app.get('/', (req, res) => {
    res.render('index')
})

app.get('/global', async (req, res) => {
    const globalData = await getGlobals()
    res.render('global', { data: globalData })
})

app.get('/faq', (req, res) => {
    res.render('faq')
})

app.get('/contact', async (req, res) => {
    const userInfo = await getInfo('zonianmidian')
    res.render('contact', userInfo)
})

app.get('/channel', (req, res) => {
    res.redirect('/global')
})

app.get('/channel/:name', async (req, res) => {
    const user = req.params.name.toLowerCase()

    if(user === 'global') {
        const globalData = await getGlobals()
        res.render('global', { data: globalData })
    } else {
        if(!(new RegExp(/^[a-z0-9]\w{0,24}$/i)).exec(user)) return res.render('error', { error: 'Invalid username', code: '' })

        const userInfo = await getInfo(user)
        if(!userInfo) return res.render('error', { error: 'User not found', code: '' })
    
        const channelData = await getChannel(user)
        if(!channelData) return res.render('error', { error: 'No statistics available', code: '' })

        res.render('channel', { data: channelData, user: userInfo })
    }
})

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
    console.log(`Statistics website listening on ${port}`)
})