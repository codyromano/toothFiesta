/** 
* @author Cody Romano
* @copyright 2014. All rights reserved. 
*
* This code follows Google's JavaScript Style Guide: 
*  - Always use "var" 
*  - Initialize variables at the top of each scope
*  - Lines should include 80 characters or fewer 
*  - Limit global scope exposure
*/

(function () {
	'use strict';

	var UI = {},
	var RadioPlayer; 
	var stopwatch;
	var DOMHelpers; 
	var UIElements; 

	DOMHelpers = {
		getEl: function (elementID) {
			return document.getElementById(elementID); 
		},
		hide: function (element) {
			element.style.display = 'none';
		},
		show: function (element) {
			element.style.display = 'block';
		}
	};

	// Build the UI 
	UIElements = [
		'mainAudio', 
		'mainSource',
		'audioSelection', 
		'start',
		'stopAudio',
		'stopBrushing',
		'pageIntro',
		'pageBrushing',
		'progress',
		'progressBar',
		'mouthQuadrant',
		'mouth'
	];

	UIElements.forEach(function (UIEl) {
		UI[UIEl] = DOMHelpers.getEl(UIEl); 
	});

	RadioPlayer = (function () {
		var _self = this;
		var streams; 
		var API; 

		streams = {
			'NPR' : 'http://public.npr.org/anon.npr-mp3/npr/news/newscast.mp3',
			'HipHop' : 'http://174.37.110.72:8010/;?icy=http',
			'Top40' : 'http://listen.radionomy.com/101HitsRadio?icy=http'
		};

		API = {
			start: start, 
			stop: stop, 
			setSource: setSource
		};

		function start (doWhenLoaded) {
			if (UI.mainSource.src.length > 0) {
				UI.mainAudio.addEventListener('loadedmetadata', function () {
					if (typeof doWhenLoaded == 'function') {

						// Add a small timeout here because it looks like a 
						// mistake if the view changes instantly 
						setTimeout(function () {
							doWhenLoaded(); 
							UI.mainAudio.play(); 
						}, 1000);  
					}
				}, false);

				UI.mainAudio.load(); 
			}

			// Return API to allow method chaining
			return API; 
		};

		function stop () {
			UI.mainAudio.pause(); 
			UI.mainAudio.currentTime = 0; 
			return API;  
		};

		function setSource (keyword) {
			UI.mainSource.src = streams[keyword]; 
			return API; 
		};

		return API; 
	})(); 

	function StopWatch (settings) {
		var _self = this; 

		var seconds = 0; 
		var maxSeconds = settings.maxSeconds || 0; 
		var doOnEachIteration = settings.doOnEachIteration;
		var doOnStop = settings.doOnStop;
		var counting = false;  

		this.start = function () {
			if (counting === false) {
				counting = true; 
				setTimeout(function timeOutFn () {
					if (!maxSeconds || seconds < maxSeconds) {
						++seconds; 
					}
					if (typeof doOnEachIteration == 'function') {
						doOnEachIteration(seconds); 
					}
					if (seconds == maxSeconds) {
						_self.stop(); 
					}
					if (counting) {
						setTimeout(timeOutFn, 1000); 
					}
				}, 1000); 
			}
		};

		this.stop = function () {
			counting = false; 
			if (typeof doOnStop == 'function') {
				doOnStop(seconds); 
			}
		};

		this.reset = function () {
			_self.stop(); 
			seconds = 0; 
		};
	}


	function getMouthQuadrant (secondsBrushing) {
		if (secondsBrushing <= 30) {
			return 'upper-left';
		}
		if (secondsBrushing > 30 && secondsBrushing <= 60) {
			return 'upper-right'; 
		}
		if (secondsBrushing > 60 && secondsBrushing <= 90) {
			return 'bottom-left'; 
		}
		if (secondsBrushing > 90 && secondsBrushing <= 120) {
			return 'bottom-right'; 
		}
	}

	var stopwatch = new StopWatch({
		maxSeconds: 120, 
		doOnStop: function (totalSeconds) {
			UI.mouthQuadrant.innerHTML = "You're done!";  
		},
		doOnEachIteration: function (seconds) {
			UI.mouthQuadrant.innerHTML = 'Brush your <b>' + 
			getMouthQuadrant(seconds) + '</b> mouth.'; 
			UI.progress.innerText = (120 - seconds) + ' seconds left';
			UI.progressBar.value = 100 -  ((seconds / 120) * 100).toFixed(0);

			if (seconds == 30) {
				UI.mouth.classList.add('mouth-upper-right'); 
				UI.mouth.classList.remove('mouth-upper-left'); 
			}
			if (seconds == 60) {
				UI.mouth.classList.add('mouth-bottom-left'); 
				UI.mouth.classList.remove('mouth-upper-right'); 
			}
			if (seconds == 90) {
				UI.mouth.classList.add('mouth-bottom-right'); 
				UI.mouth.classList.remove('mouth-bottom-left'); 
			}
		}
	});

	start.addEventListener('click', function () {

		UI.start.innerText = 'Loading...';
		UI.start.classList.add('disabled'); 

		var startBrushing = function () {
			UI.start.innerText = 'Start Brushing';
			UI.start.classList.remove('disabled'); 

			DOMHelpers.hide(UI.pageIntro); 
			DOMHelpers.show(UI.pageBrushing); 
			stopwatch.start(); 
		};

		if (UI.audioSelection.value.length > 0) {
			RadioPlayer.setSource(UI.audioSelection.value).start(startBrushing); 
		} else {
			startBrushing(); 
		}

	});

	UI.stopAudio.addEventListener('click', function () { 
		RadioPlayer.stop(); 
	});

	UI.stopBrushing.addEventListener('click', function () {
		RadioPlayer.stop();  
		stopwatch.reset(); 
		DOMHelpers.hide(UI.pageBrushing); 
		DOMHelpers.show(UI.pageIntro); 

		var resetMouth = function () {
			var classList = UI.mouth.classList; 
			var classes = Array.prototype.slice.call(classList); 

			classes.forEach(function (className) {
				if (className != 'mouth') {
					UI.mouth.classList.remove(className); 
				}
			});

			UI.mouth.classList.add('mouth-upper-left'); 
		}; 

		resetMouth(); 
	});

})(); 
