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

	function playDing() {
		var audio = document.createElement('audio');
		audio.src = 'audio/ding.mp3';
		audio.play();
	}

	//setInterval(playDing, 3000);

	/** 
	* @todo Need to organize the views and UI elements...
	* want to write a simple MVC framework. Using one like 
	* Angular or Backbone would be excessive in this case.
	*/

	var EventDispatcher = (function () {
		var listeners = {}; 
		var publicAPI = {
			listen: listen, 
			broadcast: broadcast
		};

		function listen (eventName, callback) {
			if (!listeners[eventName]) {
				listeners[eventName] = []; 
			}
			listeners[eventName].push(callback); 
		}

		function broadcast (eventName, params) {
			var params = params || {}; 
			if (listeners[eventName]) {
				listeners[eventName].forEach(function (callback) {
					if (typeof callback == 'function') {
						callback.call(callback, params);
					} 
				});
			}
		}

		return publicAPI; 
	})(); 

    // Contains a reference to every UI element in the DOM. 
	var UI = {};
    var UIElements; 

    // Utility methods for DOM manipulation 
    var DOMHelpers; 

    // Utility methods for flow control and general logic
    var LogicHelpers = {};

    // Controls everything related to audio
    var RadioPlayer;
    var radioToggle;

    // Used for making minor design changes
	var smallScreen = window.screen.availWidth < 700; 
 
    // Instance of the StopWatch "class," which handles all 
    // time-related functionality  
	var stopwatch;
 
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
		},
		preloadMainBackground: function () {
			var img = new Image;
			img.onload = function () {
				document.body.classList.add('mainBackgroundImage'); 
			};
			img.src = 'bg.jpg'; 
		}
	};

	DOMHelpers.preloadMainBackground(); 

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

	UI.start.innerHTML = smallScreen ? 'Start' : 'Start Brushing';

	
	function trackGoogleAnalyticsView (viewKeyword) {
		window.location = '#' + viewKeyword; 

		var trackPage = location.pathname + location.search + location.hash;

		if (typeof _gaq == 'object' && 'push' in _gaq) {
			_gaq.push(['_trackPageview', trackPage]);
		}
	}

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
		var defaultStream = 'Top40'; 
		var API; 

		// When we should give up on starting a stream
		var timeout = 5000;

        var isLoading = false; 

		var streams = {
            'BobMarley' : 'http://streaming.radionomy.com/Bob-Marley',
			'NPR' : 'http://public.npr.org/anon.npr-mp3/npr/news/newscast.mp3',
			'HipHop' : 'http://174.37.110.72:8010/;?icy=http',
			'Top40' : 'http://listen.radionomy.com/101HitsRadio?icy=http',
			'Electronic' : 'http://37.59.122.23/;?icy=http',
			'Country' : 'http://206.190.136.212:1243/Live?icy=http'
		};

		var currentStream = streams[defaultStream];

		API = {
			start: start, 
			stop: stop, 
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

		EventDispatcher.listen('streamChanged', function (params) {
			console.log(params);
			currentStream = streams[params.currentStream];
			UI.mainSource.src = currentStream;
		});

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

	stopwatch = new StopWatch({
		maxSeconds: 120, 
		doOnStop: function (totalSeconds) {
			trackGoogleAnalyticsView('doneBrushing'); 

			if (totalSeconds >= 120) {
				UI.mouthQuadrant.innerHTML = "You're done!";  
			}
		},
		doOnEachIteration: function (seconds) {
			var message = 'Brush your <b>partOfMouth</b> mouth'; 

			// Update the time display 
			UI.progress.innerHTML = (120 - seconds) + ' seconds left';
			UI.progressBar.value = 100 -  ((seconds / 120) * 100).toFixed(0);

			// Change brushing instructions graphic and text 
			switch (seconds) {
				case 1: 
					UI.mouthQuadrant.innerHTML = message.replace('partOfMouth',
						'upper-left'); 
				break;
				case 30: 
					playDing();
					UI.mouthQuadrant.innerHTML = message.replace('partOfMouth',
					'upper-right'); 
					UI.mouth.classList.add('mouth-upper-right'); 
					UI.mouth.classList.remove('mouth-upper-left'); 
				break;
				case 60: 
					playDing();
					UI.mouthQuadrant.innerHTML = message.replace('partOfMouth',
					'bottom-left'); 
					UI.mouth.classList.add('mouth-bottom-left'); 
					UI.mouth.classList.remove('mouth-upper-right'); 
				break;
				case 90:
					playDing();
					UI.mouthQuadrant.innerHTML = message.replace('partOfMouth',
						'bottom-right'); 
					UI.mouth.classList.add('mouth-bottom-right'); 
					UI.mouth.classList.remove('mouth-bottom-left'); 
				break;
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
            el.innerHTML = 'Play Radio'; 
        }, 
        callbackForOn: function (el) {
            RadioPlayer.resume(); 
            el.innerHTML = 'Mute Radio'; 
        }
    });

    UI.audioSelection.addEventListener('change', function () {
    	EventDispatcher.broadcast('streamChanged', {currentStream: this.value});
    });

	UI.start.addEventListener('click', function () {
		trackGoogleAnalyticsView('loading'); 

        var startBrushing; 
        var streamTimedOut; 

        radioToggle.switchOn(); 

		UI.start.innerHTML = 'Loading...';
		UI.start.classList.add('disabled'); 

        window.setTimeout(function () {
            if (RadioPlayer.streamLoading()) {
            	trackGoogleAnalyticsView('slowLoad'); 
                UI.start.innerHTML = "Still Loading...";
            }
        }, 6000); 

		startBrushing = function () {
			trackGoogleAnalyticsView('brushing');  
			UI.start.innerHTML = smallScreen ? 'Start' : 'Start Brushing';
			UI.start.classList.remove('disabled'); 

			DOMHelpers.hide(UI.pageIntro); 
			DOMHelpers.show(UI.pageBrushing); 
			stopwatch.start(); 
		};

        streamTimedOut = function () {
            DOMHelpers.hide(UI.pageIntro); 
            DOMHelpers.show(UI.timeout);
            trackGoogleAnalyticsView('timeout'); 
        };

		if (UI.audioSelection.value.length > 0) {

			EventDispatcher.broadcast('streamChanged', 
				{currentStream: UI.audioSelection.value});

            // Start the music 
			RadioPlayer
            .setStreamTimeout(15000)
            .start(startBrushing, streamTimedOut); 
		} else {
			startBrushing(); 
		}

	});

    UI.restart.addEventListener('click', function () {
        DOMHelpers.hide(UI.timeout); 
        UI.start.classList.remove('disabled'); 
        UI.start.innerHTML = smallScreen ? 'Start' : 'Start Brushing';
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
