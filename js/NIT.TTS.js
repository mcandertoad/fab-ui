
/*!*************************************************************************
 [NIT.TTS.js]

 Copyright (C) 2014 Next IT Corporation, Inc. Spokane, WA. All Rights Reserved.
 This document is confidential work and intellectual property of Next IT
 Corporation. Permission to copy, distribute or use any portion of this file
 is prohibited without the express written consent of Next IT Corporation.

*****************************************************************************/
// Use NIT namespace or create it if it doesn't exist
var NIT = NIT || {};

/**
 * Top level namespace for the NIT.UI.Sound module.
 * UI component used for a TTS playback.
 * @namespace NIT.UI.Sound
 */

NIT.Sound = new function () {
    var self = this;
    this.soundMonitorTimer = null;
    this.audioPlayTimer = null;
    this.wasPlayed = false;

	var COOKIE_NAME = 'NIT_TTS';
	var PLAY_TTS_RESPONSE_ACTION = 'TTSResponseAction';

    var _ttsAudioId = 'aagent_audio';
    var _ttsDivId = 'aagent_tts';
    var _ttsCloseSoundId = 'aagent_close_sound_control';
    var _ttsMediaId = 'aagent_movie';

    var cookieService = require('NIT.CookieUtils');

    /**
     * Creates or returns the TTS div.  This div is initially hidden.
     * @see NITAgentSettings.ttsDivId
     * @see NITAgentSettings.ttsCloseSoundId
     * @returns {jQuery} a jQuery containing the audio element.
     */
    this.getTTSElement = function () {
        // Capturing $ or $NITJ as "jQuery $".
        return (function ($) {
            var ttsDivId = _ttsDivId;
            var tts = $('#' + ttsDivId);
            if (tts.length < 1) {
                // Create audio container Div.
                tts = $('<div />', {
                    id: ttsDivId
                }).hide();

                // Create close audio control div.
                var closeSoundControl = $('<div />', {
                    id: _ttsCloseSoundId
                }).click(function () {
                    self.stopSound();
                });
                tts.append(closeSoundControl);
                $('body').append(tts);
            }
            return tts;
        })((typeof $NITJ != 'undefined') ? $NITJ : jQuery);
    };

    /**
     * Creates and returns the audio element used for playing back TTS.
     * This element is wrapped in a TTS div and appended to the outer container.<br />
     * Adds handlers for the audio element.
     * These handlers are mainly used for determining if the audio control needs to be displayed on mobile devices.
     * If in debug mode log messages will be output for all audio events (Used to develop behaviors on mobile).
     * @returns {jQuery} A jQuery containing the audio element.
     */
    this.getAudioElement = function () {
        // Capturing $ or $NITJ as "jQuery $".
        return (function ($) {
            var audioId = _ttsAudioId;
            var audio = $('#' + audioId);
            if (audio.length < 1) {
                audio = $('<audio />');
                audio.attr('id', audioId);
                try {
                    audio.attr('autoplay', 'autoplay');
                } catch (e) {
                    // IE 9 autoplay throws error.
                }
                audio.attr('controls', 'controls');

                audio.on('play', function () {
                    self.wasPlayed = true;
                });
                audio.on('suspend', function () {
                    // Android stops at suspend and waits for user interaction.
                    self.displayAudioControlIfNotPlayed();
                });
                audio.on('loadstart', function () {
                    // iPhone stops at loadstart and waits for user interaction.
                    /*if (NIT.isAppleMobileDevice()) {
                        self.audioPlayTimer = setTimeout(self.displayAudioControlIfNotPlayed, 2);
                    }*/
                });
                audio.on("ended", function () {
                    self.stopSound();
                });
                audio.on('stalled', function () {
                    // some times iPhone stops with stalled.
                    self.stopSound();
                });
            }
            return audio;
        })((typeof $NITJ != 'undefined') ? $NITJ : jQuery);
    };

    /**
     * Used to determine if the sound is enabled.
     * Returns the value of {@link NIT.State.SessionState.soundEnabled} if exists. Else false.
     * @returns {boolean} True if the sound is enabled, else false.
     */

    this.getSoundEnabled = function () {
        var ttsCookie = cookieService.getCookie(COOKIE_NAME);
        if (ttsCookie.properties.enabled == "true") return true;
        else return false;
    };


    this.getPlayTTSOnNav = function () {
        var ttsCookie = cookieService.getCookie(COOKIE_NAME);
        if (ttsCookie != null) {
            if (ttsCookie.properties.PlayTTSOnNav == "true") return true;
            else return false;
        }
        return false;
    };


    /**
     * Enables the sound.  Sets the value of {@link NIT.State.SessionState.updateSoundEnabled} if exists.
     * @param {boolean} enabled - True to enable the sound, else false.
     */

    this.setSoundEnabled = function (enabled) {
        var ttsCookie = cookieService.getOrCreateCookie(COOKIE_NAME);
        ttsCookie.properties.enabled = enabled.toString();
        cookieService.saveCookie(ttsCookie);
    };

    /**
     * Adds the audio element with specified sources.  By default uses audio/mpeg (mp3), audio/wav,
     * and adds the .swf player for legacy support then plays the audio.<br/>
     * Fires the {@link NIT.supportedEvents.onSoundPlaying} event and sets up the sound finish monitor.
     * @param {string} url - The URL of the media handler audio stream.
     * @param {string} ttsInstance - The TTSMediaHandlerInstanceID query parameter
     * @param {array} ttsMimeTypes - The array of supported mime types.
     */
    this.playSound = function (url, ttsInstance, ttsMimeTypes) {
        // Capturing $ or $NITJ as "jQuery $".
        (function ($) {
            if (self.getSoundEnabled()) {

                var queryParams = '&TTSMediaHandlerInstanceID=' + ttsInstance;
                var mediaId = _ttsMediaId;
                var flashMediaSource = url + queryParams + '&mimeType=application/x-shockwave-flash&TTSMimeTypes=application/x-shockwave-flash';

                var audio = self.getAudioElement();
                // Wrap in try catch for browsers that do not support html5 audio.
                try {
                    audio[0].pause();
                } catch (e) {
                }

                audio.empty();

                if (typeof ttsMimeTypes != 'undefined' && ttsMimeTypes) {
                    $.each(ttsMimeTypes, function (index, element) {
                        var mimeTypeParams = '&mimeType=' + element + '&TTSMimeTypes=' + element;
                        var mediaSource = url + queryParams + mimeTypeParams;
                        var audioSource = $('<source />').attr('src', mediaSource).attr('type', element);
                        audio.append(audioSource);
                    });
                }

                // Append swf audio.
                if ($.inArray('"application/x-shockwave-flash', ttsMimeTypes)) {
                    // Old jQuery way.
                    audio.append(self.getFlashObjectHtml(mediaId, flashMediaSource));
                }

                self.getTTSElement().append(audio);
                if (!self.canPlayAudioTypes(ttsMimeTypes)) {
                    // The browser should default to flash (IE8 and below).
                    // Show the element or flash will not play.
                    // This also uses the IE8 and below specific style attributes to hide the element.
                    // See AlmeSound.css #aagent_tts for an example.
                    self.getTTSElement().show();
                }

                // Wrap in try catch for browsers that do not support html5 audio.
                try {
                    audio[0].load();
                } catch (e) { }
                try {
                    audio[0].play();
                } catch (e) { }

               // NIT.fireEvent(NIT.supportedEvents.onSoundPlaying, url);

                if (self.soundMonitorTimer) {
                    clearTimeout(self.soundMonitorTimer);
                }

                // Have to use SetTimeout initially, due to a FireFox issue (object isn't initialized right away)
                self.soundMonitorTimer = setTimeout(self.monitorSoundFinish, 30); // Checks for the end of playing, so it can start playing the next sound
            }
        })((typeof $NITJ != 'undefined') ? $NITJ : jQuery);
    };

    /**
     * Returns the flash object HTML as a string.
     * @param {string} mediaId - The id of the object element.
     * @param {string} flashMediaSource - The URL of the flash media.  To be used with embed element src attribute and movie param value.
     * @returns {string} The flash object HTML as a string.
     */
    this.getFlashObjectHtml = function (mediaId, flashMediaSource) {
        return '<object id="' + mediaId + '" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="https://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=4,0,0,0" width="2" height="1" type="application/x-shockwave-flash">' +
            '<param name="movie" value="' + flashMediaSource + '"/>' +
            '<param name="quality" value="low"/>' +
            '<param name="play" value="true"/>' +
            '<param name="loop" value="false"/>' +
            '<embed play="true" loop="false" quality="low" swliveconnect="true" width="1" height="2" name="' + mediaId + '" src="' + flashMediaSource + '" TYPE="application/x-shockwave-flash" pluginspage="https://www.macromedia.com/shockwave/download/index.cgi?P1_Prod_Version=ShockwaveFlash">' +
            '</embed>' +
            '</object>';
    };

    /**
     * Used to determine if the browser can play the audio elements.
     * @param {Array} audioTypes - An array of audio mime types.
     * @returns {boolean} True if the browser supports HTML5 and can play one of the types.  Else false.
     */
    this.canPlayAudioTypes = function (audioTypes) {
        for (var i = 0; i < audioTypes.length; i++) {
            var a = document.createElement('audio');
            if (a.canPlayType && a.canPlayType(audioTypes[i])) {
                return true;
            }
        }
        return false;
    };

    /**
     * Displays the audio control if not played.
     * Mainly used for mobile devices because most mobile browsers require user interaction before playing audio.
     */
    this.displayAudioControlIfNotPlayed = function () {
		if (!self.wasPlayed) {
			self.getTTSElement().slideDown();
			window.clearTimeout(self.audioPlayTimer);
		}
    };

    /**
     * Handler for the sound monitor timer.  Used for legacy .swf player.
     */
    this.monitorSoundFinish = function () {
		var movie = _ttsMediaId;
		try {
			/** {@link http://bugs.adobe.com/jira/browse/FP-240|Adobe JIRA} */
			if (document.title.indexOf('#') >= 0) {
				document.title = document.title.replace('#', '');
			}
		} catch (e) {
			logger.warn('Error while monitoring for sound finish: ' + e);
		}
    };

    /**
     * Handler for the stopping the sound or playback finish.
     * Hides the audio controls, empties the tts div, and fires the {@link NIT.supportedEvents.onSoundCompleted} event.
     */
    this.stopSound = function () {
        // Capturing $ or $NITJ as "jQuery $".
        (function ($) {
            //using toggleSound(false) updates the sound settings on UI so can't use that
            self.getTTSElement().slideUp();

            var audio = self.getAudioElement();
            // Wrap in try catch for browsers that do not support html5 audio.
            try {
                audio[0].pause();
            } catch (e) { }
            audio.empty();
            self.wasPlayed = false;
            self.onSoundCompleted
        })((typeof $NITJ != 'undefined') ? $NITJ : jQuery);
    };

    /** Handler for the {@link NIT.supportedEvents.onSoundInitialized} event. */
    this.onSoundInitialized = function () {
        var ttsCookie = cookieService.getCookie(COOKIE_NAME);
        if(ttsCookie != null)
        {
            NIT.Sound.playSound(ttsCookie.properties.LastTTSURL, ttsCookie.properties.LastTTSInstance, ttsCookie.properties.LastTTSMimeTypes);
            // it's played now so clear the cookie
            ttsCookie.properties.PlayTTSOnNav = "false";
            cookieService.saveCookie(ttsCookie);
        }
    };


    /** Handler for the {@link NIT.supportedEvents.onSoundCompleted} event. */
    this.onSoundCompleted = function () {
        self.storeLastTTSInfo('', '', '');
    };

    /**
     * Handler for the {@link NIT.supportedEvents.onMessageReceived} event.
     * Plays the message text via TTS if enabled.<br />
     * @param {NIT.Message} m - A message object.
     */
    this.handleTTSResponseAction = function (params, data) {
        try {
            if (typeof data !== 'undefined' && data && typeof params !== 'undefined' && params && params.Metadata)
            {
                var sound = params.Metadata.TTSFileID;
                var ttsInstance = params.Metadata.TTSMediaHandlerInstanceID;
                var ttsMimeTypes = params.Metadata.TTSMimeTypes;

                sound = NITAgentSettings.BaseUrl + 'MediaHandler.ashx?TTSFileID=' + sound;
				self.storeLastTTSInfo(sound, ttsInstance, ttsMimeTypes);

                if (data.navUrl && data.navUrl.AutoNavigationType && data.navUrl.AutoNavigationType == "MainPage")
                {
                    ttsCookie.properties.PlayTTSOnNav = "true";
                    cookieService.saveCookie(ttsCookie);
                }
                else
                {
                    NIT.Sound.playSound(sound, ttsInstance, ttsMimeTypes);
                }
            }
        } catch (e) {
            logger.error('Failed to play TTS ...' + e);
        }
    };

	this.storeLastTTSInfo = function(sound, instance, mimeTypes) {
		var ttsCookie = cookieService.getOrCreateCookie(COOKIE_NAME);
		ttsCookie.properties.LastTTSURL = sound;
		ttsCookie.properties.LastTTSInstance = instance;
		ttsCookie.properties.LastTTSMimeTypes = mimeTypes;
		cookieService.saveCookie(ttsCookie);
	}

	var responseActionProvider = require('NIT.ResponseActionProvider');
	responseActionProvider.registerHandler(PLAY_TTS_RESPONSE_ACTION, self.handleTTSResponseAction);
};
