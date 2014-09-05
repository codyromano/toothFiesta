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

    // Contains a reference to every UI element in the DOM. 
	var UI = {};
    var UIElements; 

    // Utility methods for DOM manipulation 
    var DOMHelpers; 

    // Utility methods for flow control and general logic
    var LogicHelpers = {};

    // Controls everything related to audio
    var RadioPlayer;

    // Used for making minor design changes
	var smallScreen = window.screen.availWidth < 700; 
 
    // Instance of the StopWatch "class," which handles all 
    // time-related functionality  
	var stopwatch;
 
    // Call a function if it exists. This is most useful for
    // handling user callbacks that are optional. 
    LogicHelpers.callMeMaybe = function (fn, fnArgs) {
        if (typeof fn != 'function') { return false; }
        fn.apply(null, fnArgs); 
        return true; 
    }

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
		'mouth',
        'timeout',
        'restart'
	];

	UIElements.forEach(function (UIEl) {
		UI[UIEl] = DOMHelpers.getEl(UIEl); 
	});

	UI.start.innerText = smallScreen ? 'Start' : 'Start Brushing';

	RadioPlayer = (function () {
		var _self = this;
		var streams; 
		var API; 

		// When we should give up on starting a stream
		var timeout = 5000;

        var isLoading = false; 

		streams = {
            'Broken' : 'http://dkdkdkdkdkdkdkdkdkd.org/asdfasdf.mp3',
			'NPR' : 'http://public.npr.org/anon.npr-mp3/npr/news/newscast.mp3',
			'HipHop' : 'http://174.37.110.72:8010/;?icy=http',
			'Top40' : 'http://listen.radionomy.com/101HitsRadio?icy=http',
			'Electronic' : 'http://37.59.122.23/;?icy=http',
			'Country' : 'http://206.190.136.212:1243/Live?icy=http'
		};

		API = {
			start: start, 
			stop: stop, 
			setSource: setSource,
            setStreamTimeout: setStreamTimeout,
            streamLoading: streamLoading
		};

        function setStreamTimeout (newTimeout) {
            if (typeof newTimeout == 'number' && newTimeout > 0) {
                timeout = newTimeout; 
            }
            return API; 
        }

        function streamLoading () {
            return isLoading; 
        }

		function start (doWhenLoaded, doOnTimeout) {
            var streamTimedOut = false; 
            isLoading = true; 

			// No source means nothing to play 
			if (UI.mainSource.src.length === 0) {
				return; 
			}

            // Trigger an error if loading takes too long
            var triggerError = window.setTimeout(function () {
                isLoading = false; 
                streamTimedOut = true; 
                LogicHelpers.callMeMaybe(doOnTimeout);
            }, timeout); 

			UI.mainAudio.addEventListener('loadedmetadata', function () {
                clearTimeout(triggerError); 

                // Add a small timeout here because it looks like a 
                // mistake if the view changes instantly 
                setTimeout(function () {
                    // Prevent the stream from playing after the 
                    // timeout error has fired
                    if (!streamTimedOut) {
                        isLoading = false; 
                        LogicHelpers.callMeMaybe(doWhenLoaded); 
                        UI.mainAudio.play(); 
                    }
                }, 1000); 
			}, false);

			UI.mainAudio.load(); 

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

	stopwatch = new StopWatch({
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

	UI.start.addEventListener('click', function () {
        var startBrushing; 
        var streamTimedOut; 

		UI.start.innerText = 'Loading...';
		UI.start.classList.add('disabled'); 

        window.setTimeout(function () {
            if (RadioPlayer.streamLoading()) {
                UI.start.innerText = "Still Loading...";
            }
        }, 6000); 

		startBrushing = function () {
			UI.start.innerText = smallScreen ? 'Start' : 'Start Brushing';
			UI.start.classList.remove('disabled'); 

			DOMHelpers.hide(UI.pageIntro); 
			DOMHelpers.show(UI.pageBrushing); 
			stopwatch.start(); 
		};

        streamTimedOut = function () {
            DOMHelpers.hide(UI.pageIntro); 
            DOMHelpers.show(UI.timeout);
        };

		if (UI.audioSelection.value.length > 0) {
            // Start the music 
			RadioPlayer
            .setStreamTimeout(15000)
            .setSource(UI.audioSelection.value)
            .start(startBrushing, streamTimedOut); 
		} else {
			startBrushing(); 
		}

	});

    UI.restart.addEventListener('click', function () {
        DOMHelpers.hide(UI.timeout); 
        UI.start.classList.remove('disabled'); 
        UI.start.innerText = smallScreen ? 'Start' : 'Start Brushing';
        DOMHelpers.show(UI.pageIntro); 
    }, false);

	UI.stopAudio.addEventListener('click', function () { 
		RadioPlayer.stop(); 
	}, false);

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
	}, false);

})(); 
