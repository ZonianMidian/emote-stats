function UpdateEmote(data, type) {
    const { count, amount, emote, key, id } = data;
    const emoteCount = document.getElementById(`${type}-${emote ?? key}`);

    if (emoteCount) {
        const oldCount = parseInt(emoteCount.innerHTML.replace(/\.|'|,/g, ""));
        const newCount = Number(oldCount) + Number(count ?? amount);
        emoteCount.innerHTML = newCount.toLocaleString("en-US");

        const emoteDiv = document.getElementById(`emote-${type}-${emote ?? key}`);
        emoteDiv.dataset.name = newCount;

        reorderDivs(type);
    } else if (type != '7tv') {
        const emoteDiv = document.getElementById(`${type}-emotes`);

        const divs = emoteDiv.querySelectorAll('div');
        const nextNumber = (divs.length)/4;

        const emoteRow = document.createElement('div');
        emoteRow.className = `row ${type}`;
        emoteRow.id = `emote-${type}-${key}`;
        emoteRow.dataset.name = amount;
        emoteDiv.appendChild(emoteRow);

        const emoteCount = document.createElement('div');
        emoteCount.className = 'col-2 flex-center countNumber';
        emoteCount.innerHTML = nextNumber;
        emoteRow.appendChild(emoteCount);

        const emoteImage = document.createElement('div');
        emoteImage.className = 'col-5 flex-center';
        emoteRow.appendChild(emoteImage);

        const emoteImageTag = document.createElement('img');
        emoteImageTag.className = 'emote_image';
        emoteImageTag.src = emoteLink(id, type);
        emoteImageTag.title = key;
        emoteImageTag.alt = key;
        emoteImageTag.draggable = false;
        emoteImageTag.onerror = "this.onerror=null;this.src='/static/unavailable.png';";
        emoteImage.appendChild(emoteImageTag);

        const counterNumber = document.createElement('div');
        counterNumber.className = 'col-5';
        emoteRow.appendChild(counterNumber);

        const emoteName = document.createElement('h3');
        emoteName.className = 'emote_name';
        emoteName.innerHTML = key;
        counterNumber.appendChild(emoteName);

        const emoteUsage = document.createElement('p');
        emoteUsage.className = 'emote_usage';
        emoteUsage.id = `${type}-${key}`;
        emoteUsage.innerHTML = amount;
        counterNumber.appendChild(emoteUsage);

        reorderDivs(type);
    }
}

function emoteLink(id, extension) {
    switch (extension) {
        case "bttv":
            return `https://cdn.betterttv.net/emote/${id}/2x`;
        case "ffz":
            return `https://cdn.frankerfacez.com/emoticon/${id}/2`;
        case "twitch":
            return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;
    }
}

function reorderDivs(type) {
    let divList = $(`.${type}`);
    divList.sort((a, b) => $(b).data('name') - $(a).data('name'));

    $(`#${type}-emotes`).html(divList);


    const emoteDiv = document.getElementById(`${type}-emotes`);
    const divs = emoteDiv.querySelectorAll('div');
    let i = 1;
    divs.forEach(div => {
        if (div.className == `row ${type}`) {
            const countNumber = div.querySelector('.countNumber');
            countNumber.innerHTML = i;
            i++;
        }
    });
}