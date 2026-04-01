Module.register("MMM-NMBS-Connection", {

	defaults: {
		from: "http://irail.be/stations/NMBS/008893120",
		humanizeDuration: true,
		initialLoadDelay: 1000, // 1 second delay
		language: config.language,
		results: 3,
		showStationNames: false,
		text: "Loading",
		to: "http://irail.be/stations/NMBS/008821196",
		updateInterval: 10 * 60 * 1000, // 10 * 60 * 1000 = every 10 minutes
		url: "https://api.irail.be/connections",
	},
	getScripts: function () {
		return ["moment.js"];
	},
	getStyles: function () {
		return ["MMM-NMBS-Connection.css", "font-awesome.css"];
	},
	getTranslations: function () {
		return {
			en: "translations/en.json",
			fr: "translations/fr.json",
			nl: "translations/nl.json",
		};
	},
	start: function () {
		Log.info("Starting module: " + this.name);

		this.loaded = false;
		this.forecast = this.config.text;
		this.updateTimer = null;
		this.scheduleUpdate(this.config.initialLoadDelay);
	},
	getDom: function () {
		let wrapper = document.createElement("div");
		if (!this.loaded) {
			wrapper.innerHTML = this.forecast;
			wrapper.className = "MMM-NMBS-Connection dimmed light small";
			return wrapper;
		}

		wrapper = this.forecast;
		return wrapper;
	},
	updateTemp: function () {
		const self = this;
		const url = `${self.config.url}/?to=${self.config.to}&from=${self.config.from}&timeSel=depart&format=json&lang=${self.config.language}`;

		//fetch(url, {headers: {"User-Agent": "Mozilla/5.0 (Node.js) MagicMirror (https://github.com/MichMich/MagicMirror/)"}})
		fetch(url, {})
			.then(function (response) {
				return response.json();
			})
			.then(function (json) {
				self.scheduleUpdate((self.loaded) ? -1 : self.config.updateInterval);

				return self.processConnections(json);
			})
			.catch(error => Log.error("Fetch Error =\n", error));
	},
	processConnections: function (data) {
		let table = document.createElement("div");
		table.className = "stib-table small MMM-NMBS-Connection";
		let connections = data.connection || [];

		if (!Number.isFinite(this.config.results) || this.config.results > 6) {
			this.config.results = 6;
		}

		const now = moment();
		const resultCount = Math.min(this.config.results, connections.length);
		if (resultCount > 0) {
			const firstConnection = connections[0];
			const destination = firstConnection.arrival && firstConnection.arrival.station ? firstConnection.arrival.station : "";
			const firstDepartureMoment = moment.unix(firstConnection.departure.time);
			const firstMinutesUntilDeparture = Math.max(0, firstDepartureMoment.diff(now, "minutes"));

			table.style.gridTemplateColumns = `auto auto 1fr repeat(${resultCount}, auto)`;

			let mode = document.createElement("span");
			mode.className = "stib-stopname dimmed";
			mode.style.gridRow = "1 / span 1";
			mode.innerHTML = "Train";
			table.appendChild(mode);

			let lineContainer = document.createElement("div");
			lineContainer.className = "stib-linenumber-container";
			lineContainer.style.gridRow = "1 / span 1";
			let lineNumber = document.createElement("span");
			lineNumber.className = "stib-linenumber";
			lineNumber.innerHTML = firstMinutesUntilDeparture;
			lineContainer.appendChild(lineNumber);
			let lineIcon = document.createElement("span");
			lineIcon.className = "stib-linenumber-icon";
			lineContainer.appendChild(lineIcon);
			table.appendChild(lineContainer);

			let routeName = document.createElement("span");
			routeName.className = "stib-routename";
			routeName.style.gridRow = "1 / span 1";
			routeName.innerHTML = destination;
			table.appendChild(routeName);

			for (let i = 0; i < resultCount; i++) {
				let connection = connections[i];
				const departureMoment = moment.unix(connection.departure.time);
				const minutesUntilDeparture = Math.max(0, departureMoment.diff(now, "minutes"));
				const durationMinutes = Math.max(0, Math.round(connection.duration / 60));
				const platformValue = connection.departure.platform || "?";
				const changes = connection.vias && connection.vias.number ? parseInt(connection.vias.number, 10) : 0;
				const changesDisplay = Number.isFinite(changes) && changes > 0 ? ` ${changes}🚉` : " 0🚉";

				let departureInfo = document.createElement("div");
				departureInfo.className = `stib-times ${i > 0 ? "dimmed" : ""}`.trim();
				departureInfo.style.gridRow = "1 / span 1";
				departureInfo.innerHTML = `<span>${minutesUntilDeparture}m p${platformValue} ${durationMinutes}m${changesDisplay}</span>`;
				table.appendChild(departureInfo);
			}
		}

		this.forecast = table;

		this.show(this.config.animationSpeed, { lockString: this.identifier });
		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
	},
	scheduleUpdate: function (delay) {
		let nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		const self = this;
		clearTimeout(this.updateTimer);
		this.updateTimer = setTimeout(function () {
			self.updateTemp();
		}, nextLoad);
	},

});
