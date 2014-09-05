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

    var radioToggle;
 
    // A shortcut for handling optional callbacks; 
    // only call a function if it exists
    LogicHelpers.callMeMaybe = function (fn, fnArgs) {
        if (typeof fn != 'function') { 
            return false; 
        }
        fn.apply(null, fnArgs); 
        return true; 
    };

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
		'toggleAudio',
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

    /** 
    * This can be used for any UI element that has 
    * an on and off state. Customize with on/off callbacks
    */ 
    function UIToggle (settings) {
        var _self = this; 

        // Optional callbacks for on state and off state
        var callbackForOn = settings.callbackForOn || null; 
        var callbackForOff = settings.callbackForOff || null; 

        // Associated DOM element 
        this.el = settings.el || document.createElement('a'); 

        // If the toggle is turned on or off 
        this.on = settings.initialState || false; 

        // CSS classes for state change 
        this.classForOn = settings.classForOn || 'toggleOn'; 
        this.classForOff = settings.classForOff || 'toggleOff';

        this.switchOn = function () {
            _self.el.classList.add(_self.classForOn); 
            _self.el.classList.remove(_self.classForOff); 

            LogicHelpers.callMeMaybe(callbackForOn, [_self.el]);
        };

        this.switchOff = function () {
            _self.el.classList.add(_self.classForOff);
            _self.el.classList.remove(_self.classForOn); 

            LogicHelpers.callMeMaybe(callbackForOff, [_self.el]); 
        };

        this.handleState = function () {
            _self.on === true ? _self.switchOn() : _self.switchOff(); 
        };

        // Init
        (function () {
            _self.handleState(); 

            _self.el.addEventListener('click', function () {
                // Toggle on or off state 
                _self.on = !!!_self.on; 
                _self.handleState(); 
            }, false); 
        })();
    }

	RadioPlayer = (function () {
		var _self = this;
		var streams; 
		var API; 

		// When we should give up on starting a stream
		var timeout = 5000;

        var isLoading = false; 

		streams = {
            'BobMarley' : 'http://streaming.radionomy.com/Bob-Marley',
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
            streamLoading: streamLoading,
            resume: resume,
            pause: pause
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

        function resume () {
            UI.mainAudio.play(); 
            return API; 
        }

		function stop () {
			UI.mainAudio.pause(); 
			UI.mainAudio.currentTime = 0; 
			return API;  
		}

        function pause () {
            UI.mainAudio.pause(); 
            return API; 
        }

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
				window.setTimeout(function timeOutFn () {
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

    // Button for toggling radio on or off 
    radioToggle = new UIToggle({
        el: UI.toggleAudio,
        initialState: true,

        classForOff: 'audioPaused', 
        classForOn: 'audioPlaying', 

        callbackForOff: function (el) {
            RadioPlayer.pause(); 
            el.innerText = 'Play Radio'; 
        }, 
        callbackForOn: function (el) {
            RadioPlayer.resume(); 
            el.innerText = 'Mute Radio'; 
        }
    });

	UI.start.addEventListener('click', function () {
        var startBrushing; 
        var streamTimedOut; 

        radioToggle.switchOn(); 

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
