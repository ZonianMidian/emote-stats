function UpdateEmote(data, type) {
	const { count = 0, amount, name, alias, key, id } = data;
	const emoteCount = document.getElementById(`${type}-${id}`);

	if (emoteCount) {
		const oldCount = parseInt(emoteCount.innerHTML.replace(/\.|'|,/g, ''), 10);
		const newCount = oldCount + (count || amount);
		emoteCount.innerHTML = newCount.toLocaleString('en-US');

		const emoteDiv = document.getElementById(`emote-${type}-${id}`);
		emoteDiv.dataset.count = newCount;

		reorderDivs(type);
	} else {
		const emoteDiv = document.getElementById(`${type}-emotes`);
		const divs = emoteDiv.querySelectorAll('div');
		const nextNumber = divs.length / 4;

		const emoteRow = document.createElement('div');
		emoteRow.className = `row ${type}`;
		emoteRow.id = `emote-${type}-${id}`;
		emoteRow.dataset.count = amount || count;
		emoteDiv.appendChild(emoteRow);

		const emoteCount = document.createElement('div');
		emoteCount.className = 'col-2 flex-center countNumber';
		emoteCount.textContent = nextNumber;
		emoteRow.appendChild(emoteCount);

		const emoteImage = document.createElement('div');
		emoteImage.className = 'col-5 flex-center';
		emoteRow.appendChild(emoteImage);

		const emoteImageTag = document.createElement('img');
		emoteImageTag.className = 'emote_image';
		emoteImageTag.src = emoteLink(id, type);
		emoteImageTag.title = key || alias || name;
		emoteImageTag.alt = key || alias || name;
		emoteImageTag.draggable = false;
		emoteImageTag.onerror = () => {
			emoteImageTag.src = '/static/unavailable.png';
		};
		emoteImage.appendChild(emoteImageTag);

		const counterNumber = document.createElement('div');
		counterNumber.className = 'col-5';
		emoteRow.appendChild(counterNumber);

		const emoteName = document.createElement('h3');
		emoteName.className = 'emote_name';
		emoteName.textContent = key || alias || name;
		counterNumber.appendChild(emoteName);

		const emoteUsage = document.createElement('p');
		emoteUsage.className = 'emote_usage';
		emoteUsage.id = `${type}-${id}`;
		emoteUsage.textContent = amount || count;
		counterNumber.appendChild(emoteUsage);

		reorderDivs(type);
	}
}

function emoteLink(id, extension) {
	switch (extension) {
		case 'bttv':
			return `https://cdn.betterttv.net/emote/${id}/2x`;
		case 'ffz':
			return `https://cdn.frankerfacez.com/emoticon/${id}/2`;
		case 'twitch':
			return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;
		case '7tv':
			return `https://cdn.7tv.app/emote/${id}/2x.webp`;
	}
}

function reorderDivs(type) {
	type = type.toLowerCase().replace('7tv', 'stv');

	let divList = document.querySelectorAll(`.${type}`);
	divList = Array.from(divList).sort((a, b) => b.dataset.count - a.dataset.count);

	const emoteDiv = document.getElementById(`${type}-emotes`);
	emoteDiv.innerHTML = '';

	let i = 1;
	divList.forEach((div) => {
		if (div.className === `row ${type}`) {
			const countNumber = div.querySelector('.countNumber');
			countNumber.textContent = i;
			emoteDiv.appendChild(div);
			i++;
		}
	});
}
