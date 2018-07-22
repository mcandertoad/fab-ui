var nit_alme_ui_version = "2017-04-05_01";

/* Manual fix for AGENT-2683. Remove upon resolution*/
(function(){
    var agent = null;
    define(
        'NIT.Agent',
        ['NIT.Agent.Types', 'NIT.Converse.Types', 'NIT.Converse', 'NIT.Session',
        'NIT.ResponseActionProvider', 'NIT.DeferredAppcallProvider', 'NIT.Utils', 'NIT.Logger'],
        function (AgentTypes, ConverseTypes, converse, session,
    responseActionProvider, deferredAppCallProvider, utils, logger) {
        'use strict';
        if(agent === null){
            agent = new AgentTypes.Agent(
                ConverseTypes,
                converse,
                session,
                responseActionProvider,
                deferredAppCallProvider,
                utils,
                logger);
        }
        return agent;
    });
})();



// load alme modules
var agent = require('NIT.Agent');
var settingsLoader = require('NIT.SettingsLoader');
var settings = require('NIT.Settings');
var NITAgentSettings = settings;
var cookieService = require('NIT.CookieUtils');
var logger = require('NIT.Logger');
var loggerTypes = require('NIT.Logger.Types');
var responseActionProvider = require('NIT.ResponseActionProvider');
	
var NIT = NIT || {};
// anonymous function to encapsilate jquery
(function($) {
    NIT.ui = (function()
    {
        var settings = {
            // available ui states: "dockable" || "sidebar"
            uiLayout: "dockable",
            multipleUiStates: false,

            // default dimensions
            dockableWidth: 425,
            sidebarWidth: 400,
            dockableHeight: 580,

            // engagement point types: "button" || "input"
            engagementType: "button",

            // responsive design settings: edits also need to be made to css
            isResponsive: true,
            responsiveTakeoverWidth: 765,

            // font changer available / min + max settings
            fontChangerAvailable: true,
            fontMin: 12,
            fontMax: 25,

            // sound options
            soundAvailable: false,
            soundOn: false,

            // limits number of characters that can be put in input box
            characterLimit: 200,

            // draggable and resizeable
            isDraggable: true,
            isResizable: true,
            resizeMinWidth: 400,
            resizeMinHeight: 380,
            resizeMaxWidth: 665,
            resizeMaxHeight: 600
        };

        // initialize references to UI elements
        var $globalWrap, $almeWindow, $ui, $contentWrap, $header, $body, $chatHistory, $footer, $input, $pageWrap, $newMessages;

        // initializes button references
        var $soundOnButton, $soundOffButton, $toSidebarButton, $toDockableButton, $minimizeButton, $closeButton, $fontIncreaseButton, $fontDecreaseButton, $inputButton, $helpButton;

        // initalizes input box reference
        var $inputBox;

        // variables for remembering location and size
        var lastState = {};
	    var unreadMessages = 0;

        // keep track of if draggable and resizable have be started or not;
        var draggableStarted = false;
        var resizableStarted = false;

        // grab window element for later use
        var $window = $(window);

        /*
        * Set references to UI elements
        */
        function getUiReferences()
        {
        	$globalWrap = $("#alme-global-wrapper");
        	$almeWindow = $("#alme-window");
        	$ui = $("#alme-wrap");
        	$contentWrap = $("#alme-content-wrap");
        	$header = $("#alme-header");
        	$body = $("#alme-body");
        	$chatHistory = $("#alme-chat-history");
        	$footer = $("#alme-footer");
        	$input = $("#alme-input-field");
        	$pageWrap = $("#alme-page-wrap");
        	$newMessages = $('.alme-new-messages');
        }

        /*
        * Set references for Buttons
        */
        function getButtonReferences()
        {
        	$soundOnButton = $("#alme-sound-on");
        	$soundOffButton = $("#alme-sound-off");
        	$toSidebarButton = $("#alme-to-sidebar");
            $toDockableButton = $("#alme-to-dockable");
            $minimizeButton = $("#alme-minimize-button");
        	$closeButton = $("#alme-close-button");
        	$fontIncreaseButton = $("#alme-font-up");
        	$fontDecreaseButton = $("#alme-font-down");
        	$inputButton = $("#alme-input-button");
        	$helpButton = $("#alme-help-button");
        }

        /*
        * connects buttons
        */
        function buttonsSetup()
        {
            $soundOnButton.on("click", NIT.ui.soundOn);
            $soundOffButton.on("click", NIT.ui.soundOff);
            $toSidebarButton.on("click", NIT.ui.toSidebar);
            $toDockableButton.on("click", NIT.ui.toDockable);
            $closeButton.on("click", NIT.ui.close);
            $minimizeButton.on("click", NIT.ui.minimize);
            $fontIncreaseButton.on("click", NIT.ui.increaseFontSize);
            $fontDecreaseButton.on("click", NIT.ui.decreaseFontSize);
            $helpButton.on("click", NIT.ui.help);
            $newMessages.on("click", NIT.ui.scrollChatHistory);
	        $body.on("scroll", NIT.ui.onScroll);
        }

        /*
        * Sets up the current state of the UI
        */
        function setUiState()
        {
            // get last known ui layout or default
            var uiLayout = getLayout();

            // if input engagement add engagement class
            if ( settings.engagementType === "input" )
            {
                $ui.addClass("input-engagement");
            }

            // if sidebar: add sidebar class && remove dockable class
            if ( uiLayout === "sidebar" )
            {
                $ui.removeClass("dockable").addClass("sidebar");
            }

            if ( settings.isResponsive && $window.width() <= settings.responsiveTakeoverWidth ) {
                $ui.addClass("mobile");
            }
        }

        /*
        * Adjusts the website content to make room for the sidebar ui
        */
        function adjustWebsiteIn()
        {
            //slide over page content
            $globalWrap.animate({
                marginRight: settings.sidebarWidth
            });
        }

        /*
        * Adjusts the website content to full width
        */
        function adjustWebsiteOut()
        {
            //slide over page content
            $globalWrap.animate({
                marginRight: 0
            });
        }

        /*
        * sets the body height for alme.
        * Argument is the planned height for the entire UI
        */
        function setBodyHeight( uiHeight )
        {
            $body.css({
                height: uiHeight - $footer.outerHeight() - $header.outerHeight()
            });
        }

        /*
        * set last ui state if not in sidebar
        */
        function rememberLastState()
        {
            if ( lastState.layout !== "sidebar" )
            {
                lastState.position = $ui.position();
                lastState.size = {};
                lastState.size.uiWidth = $ui.outerWidth();
                lastState.size.uiHeight = $ui.outerHeight()
            }
        }

        /*
        * gets the last known size of the UI dockable state
        * If no latest state is avialble, go back to default dimensions
        * returns an object of the new size
        */
        function getLastSize()
        {
            var newSize;

            // get last known ui sizes and dimensions or defaults
            if ( typeof lastState.size !== "undefined" )
            {
                newSize = {
                    uiWidth: lastState.size.uiWidth,
                    uiHeight: lastState.size.uiHeight
                }
            }

            // if no previous size, use defaults
            else
            {
                newSize = {
                    uiWidth: settings.dockableWidth,
                    uiHeight: settings.dockableHeight
                }
            }

            return newSize;
        }

        /*
        * gets the last known position of the UI dockable state
        * If no latest state is avialble, go back to default location
        * returns an object of the new location
        */
        function getLastPosition()
        {
            var newSize;

            // get last known ui position
            if ( typeof lastState.position !== "undefined" )
            {
                newPosition = {
                    left: lastState.position.left,
                    top: lastState.position.top
                }
            }

            // if no previous position, use defaults
            else
            {
                var lastSize = getLastSize();
                newPosition = {
                    left: $window.width() - lastSize.uiWidth,
                    top: $window.height() - lastSize.uiHeight
                }
            }

            return newPosition;
        }

        /*
        * gets the current layout of the UI
        */
        function getLayout()
        {
            return ( typeof lastState.layout !== "undefined" ) ? lastState.layout : settings.uiLayout;
        }

        /*
        * gets the sound state of the UI
        */
        function getSoundState()
        {
            return ( lastState.sound !== undefined ) ? lastState.sound : settings.soundOn;
        }

        /*
        * updates the change state buttons
        * arg is text representing which state the ui is going to
        */
        function updateChangeStateButtons(toState)
        {
            // if multiple ui states are availble
            if ( settings.multipleUiStates )
            {
                // if is going to sidebar state
                if ( toState === "sidebar" )
                {
                    // hide to sidebar button, show to dockable button
                    $toSidebarButton.addClass("display-none");
                    $toDockableButton.removeClass("display-none");
                }

                else if ( toState === "dockable" )
                {
                    // hide to dockable button, show to sidebar button
                    $toDockableButton.addClass("display-none");
                    $toSidebarButton.removeClass("display-none");
                }
            }
        }

        /*
        * resizes #alme-window to be full browser screen
        * used for boundries on resizable and draggable
        */
        function setAlmeWindowLimits()
        {
            $almeWindow.css({
                height: $window.height()
            })
        }

        /*
        * starts resizability
        */
        function startResizable()
        {
            if ( !resizableStarted )
            {
                $ui.resizable({
                    containment: "#alme-window",
                    alsoResize: "#resize-wrapper",
                    handles: "all",
                    minWidth: settings.resizeMinWidth,
                    minHeight: settings.resizeMinHeight,
                    maxWidth: settings.resizeMaxWidth,
                    maxHeight: settings.resizeMaxHeight,

                    create: function()
                    {
                        var position = getLastPosition();

                        $ui.css({
                            top: position.top ,
                            left: position.left,
                            right: "auto",
                            bottom: "auto",
                        });
                    },

                    // fires while resizing
                    resize: function(e)
                    {
                        e.stopPropagation();
                        setBodyHeight( $ui.height() );
                    },

                    stop: function()
                    {
                        // remember ui state in cookie
                        rememberLastState();
                        setUiCookie();
                    }
                });

                resizableStarted = true;
            }
            else
            {
                prepResize();
                $ui.resizable( "enable" );
            }
        }

        function prepResize()
        {
            var position = getLastPosition();

            $ui.css({
                top: position.top ,
                left: position.left,
                right: "auto",
                bottom: "auto",
            });
        }

        /*
        * disables resizability
        */
        function disableResize()
        {
            $ui.resizable( "disable" );
        }

        /*
        * initializes dragability
        */
        function startDraggable()
        {
            if ( !draggableStarted )
            {
                $ui.draggable({
                    snap: "#alme-window",
                    snapMode: "inner",
                    snapTolerance: 50,
                    containment: "#alme-window",
                    cancel: "#alme-body, .alme-input-wrap, #alme-input-button, #alme-header ul li",
                    stop: function() {
                        // remember ui state in cookie
                        rememberLastState();
                        setUiCookie();
                    }
                });

                draggableStarted = true;
            }
            else
            {
                $ui.draggable("enable");
            }
        }

        /*
        * turns off dragability
        */
        function disableDraggable()
        {
            $ui.draggable("disable");
        }

        /*
        * fires whenever the browser is resized
        */
        function onWindowResize()
        {
            fitUiVertically();

            // keep in bounds for desktop view
            if ( settings.isResponsive )
            {
                // if desktop size
                if ( $window.width() > settings.responsiveTakeoverWidth )
                {
                    // remove mobile class
                    $ui.removeClass("mobile");

                    if ( lastState.layout === "dockable" )
                    {
                        var size = getLastSize();

                        setBodyHeight( size.uiHeight );
                        $ui.css({
                            width: size.uiWidth
                        })
                    }

                    else if ( lastState.layout === "sidebar" )
                    {
                        $ui.css({
                            right: 0,
                            top: 0
                        });

                        setBodyHeight( $window.height() );
                    }
                }

                // if mobile size
                else
                {
                    // add mobile styles
                    $ui.addClass("mobile");

                    $ui.css({ height: "auto" });
                    $contentWrap.css({ height: "auto" });

                    setBodyHeight($window.height());
                }
            }

            resetUiBounds();
        }

        /*
        * fits the ui within the window height: if possible
        */
        function fitUiVertically() {
            var $windowHeight = $window.height();
            var $uiHeight = $ui.height();

            // fit ui in window if possible
            if ( $uiHeight > $windowHeight )
            {
                // make ui minimum size
                $ui.css({
                    height: settings.resizeMinHeight
                });

                // adjust body height
                setBodyHeight();

                $ui.css({
                    height: "auto"
                });

                // stick ui to bottom of the page
                $ui.css({
                    top: $windowHeight - $ui.height()
                });
            }
        }

        /*
        * prepares UI for desktop layout
        */
        function prepDesktop()
        {
            // if dockable
            if ( lastState.layout === "dockable" )
            {
                // set to last width and height
                // move to last known position
                var lastPosition = getLastPosition();
                var lastSize = getLastSize();

                $ui.css({
                    right: "",
                    bottom: "",

                    left: lastPosition.left,
                    top: lastPosition.right,

                    width: lastSize.uiWidth,
                    height: lastSize.uiHeight
                });

                //adjust chat history height
                setBodyHeight( lastSize.uiHeight )
            }

            // if sidebar
            else if ( lastState.layout === "sidebar" )
            {
                // dock to right side of page
                // set to sidebar width
                var newRight = ( lastState.isOpen ) ? 0 : - settings.sidebarWidth;

                $ui.css({
                    left: "",
                    top: "",
                    bottom: 0,
                    right: newRight,
                    width: settings.sidebarWidth
                });
            }

        }

        /*
        * prepares UI for responsive layout
        */
        function prepResponsive()
        {
            // stick ui to bottom of the screen and make full width
            $ui.css({
                top: "auto",
                left: 0,
                right: "auto",
                bottom: 0,
                width: "100%",
                height: "auto"
            });

            // if ui is open
            if ( lastState.isOpen )
            {
                var windowHeight = $window.height();

                // make chat history fill available area
                setBodyHeight( windowHeight );
            }
        }

        /*
        * resize the ui containment, and move ui on page if it is off
        */
        function resetUiBounds()
        {
            // if ui is off the page, relocate it
            var lastPosition = getLastPosition();
            var lastSize = getLastSize();
            var windowWidth = $window.width();
            var windowHeight = $window.height();

            // resize alme window
            $almeWindow.css({
                width: windowWidth,
                height: windowHeight
            });

            // if ui is open
            if ( lastState.isOpen !== undefined && lastState.isOpen && lastState.layout !== "sidebar" )
            {
                prepResize();

                // if off the right side of the screen, relcate to right edge
                if ( lastPosition.left + lastSize.uiWidth > windowWidth )
                {
                    var newLeft = windowWidth - lastSize.uiWidth;
                    $ui.css({
                        left: newLeft
                    });

                    // remember new position
                    lastState.position.left = newLeft;
                }

                // if off left move onto screen
                if ( lastPosition.left < 0 )
                {
                    $ui.css({
                        left: 0
                    });
                }

                // if ui is off the top of the page && ui is shorter than window height
                if ( lastPosition.top < 0 && lastSize.uiHeight < windowHeight )
                {
                    // set position to top edge
                    $ui.css({
                        top: 0
                    });

                    // remember new position
                    lastState.position.top = 0;
                }

                // if ui is off the bottom of the page
                if ( lastPosition.top + lastSize.uiHeight > windowHeight )
                {
                    var newTop = windowHeight - lastSize.uiHeight;
                    $ui.css({
                        top: newTop
                    });

                    // remember new position
                    lastState.position.top = newTop;
                }
            }
        }

        /*
        * Set cookie to remember state
        */
        function setUiCookie()
        {
            var uiCookie = cookieService.getOrCreateCookie('NIT_UI');
            uiCookie.properties['dockableUISettings'] = JSON.stringify(lastState);
            cookieService.saveCookie(uiCookie);
        }

        /*
        *  updates states based on UI cookie
        */
        function getUiCookie()
        {
            // get ui cookie
            var uiSettings = cookieService.getCookie("NIT_UI");

            // if cookie doesn't exist: exit
            if ( uiSettings === null )
            {
                return false;
            }

            uiSettings = JSON.parse( uiSettings.properties['dockableUISettings'] ) ;

            // if is open, update last state
            if ( uiSettings.isOpen != undefined && uiSettings.isOpen )
            {
                lastState["isOpen"] = true;
            }

            // if cookie position is set
            if ( uiSettings.position != undefined )
            {
                // initialize lastState position
                lastState.position = {};

                // set position left
                if ( uiSettings.position.left != undefined)
                {
                    lastState.position.left = uiSettings.position.left;
                }

                // set position top
                if ( uiSettings.position.left != undefined )
                {
                    lastState.position.top = uiSettings.position.top;
                }
            }

            // if cookie size is set
            if ( uiSettings.size != undefined )
            {
                // set initialize lastState size
                lastState.size = {};

                // set width
                if ( uiSettings.size.uiWidth != undefined )
                {
                    lastState.size.uiWidth = uiSettings.size.uiWidth;
                }

                // set height
                if ( uiSettings.size.uiHeight != undefined )
                {
                    lastState.size.uiHeight = uiSettings.size.uiHeight;
                }

            }

            // if cookie layout is set
            if ( uiSettings.layout != undefined )
            {
                // set last uiSate
                lastState.layout = uiSettings.layout;

                // update change state buttons
                updateChangeStateButtons( uiSettings.layout );
            }

            // if cookie sound is set and sound is available
            if ( uiSettings.sound != undefined && settings.soundAvailable )
            {
                lastState.sound = uiSettings.sound;
            }
            else {
                lastState.sound = settings.soundOn;
            }

            // if cookie font is set and font changer is available
            if ( uiSettings.layout != undefined && settings.fontChangerAvailable )
            {
                // remember font size
                lastState.fontSize = uiSettings.fontSize;

                // update font size
                $chatHistory.css({
                    fontSize: uiSettings.fontSize + "px"
                });

                // display decrease font size button
                $fontDecreaseButton.removeClass("display-none");
            }
        }

        /*
        * starts alme service and loads dependencies
        */
        function initAlmeService()
        {
            // fires after an input is processed
            agent.addEventListener(agent.supportedEvents.ResponseReceived, almeResponseHandler);
            agent.addEventListener(agent.supportedEvents.ErrorReceived, almeErrorHandler);

            // fired after chat history is loaded
            agent.addEventListener( agent.supportedEvents.HistoryLoaded, onChatHistoryLoaded );
            // if error loading alme
            agent.addEventListener(agent.supportedEvents.ErrorReceived, onAlmeError);

            /*Register response action handlers */
            responseActionProvider.registerHandler("RequestUploadImage", handleRequestUploadImageResponseAction);

            settings.UiLogLevel = loggerTypes.WARN;

            if ( window.addEventListener )
            {
                window.addEventListener('load', onWindowLoaded, false);
            }
            else
            {
                window.attachEvent("onload", onWindowLoaded, false);

            }


            function onWindowLoaded()
            {
                logger.debug('Loading settings...');
                settingsLoader.loadSettings('Web', function(){
                    logger.debug('Settings load succesful. Injecting Agent...');
                },
                function(xhr, statusText, error){
                    var logger = require('NIT.Logger');
                    logger.fatal('Settings load failed: ' + statusText + ' - ' + error.name);
                });
            }


        }



        /*
        *  Notifies users if there is an error while loading service
        */
        function onAlmeError()
        {
            //notify that the service isn't available
            if (httpRequest.status >= 500 && httpRequest.status <= 599)
            {
                if (settings.ClientLanguage && settings.ClientLanguage.lastIndexOf("en", 0) === 0)
                {
                    renderAlmeInput({ text: "Sorry, I am unavailable right now. Please try again later." });
                }
            }
        }

        /*
            Appends a link to the last response that will allow a user to upload an image
        */
        function handleRequestUploadImageResponseAction(action, response) {
            var label = action.Metadata.Label || "Upload Image"
            response.displayLinkCollection.Sections.push({
                "SectionID": 0,
                "HeaderText": "",
                "FoldLocation": 6,
                "FoldText": "Click for more...",
                "Links": [
                    {
                        "DisplayText": label,
                        "TargetType": "Image Upload",
                        "SectionID": 0,
                        "Metadata": {
                            "InputText": "Yes",
                            "Source": {
                                "Origin": "responseset",
                                "UID": "91ca2411-1a37-4e1e-88ae-e8ada46afcba"
                            },
                            "DisplayStyle": "Default"
                        }
                    }
                ]
            });
        }

        /*
        *  prepares an alme response for display
        */
        function almeResponseHandler(response) {
	        var doScroll = isLastInputVisible();

            // adds user input to chat history
            if ( response.maskedInput !== null )
            {
                renderUserInput( response.maskedInput, !doScroll );
            }

            // adds alme input to chat history
            renderAlmeInput(response, !doScroll);

        	// keep track of unread messages
	        updateNewMessagesNotice(true);

	        // enaable input box
            enableInput();
        }

		function updateNewMessagesNotice(updateUnread) {
			if (isLastInputVisible()) {
				unreadMessages = 0;
				$newMessages.stop().animate({ height: 0 });
			} else {
				if (updateUnread) {
					unreadMessages++;
					$newMessages.text(unreadMessages + ' unread message' + (unreadMessages < 2 ? '' : 's'));
					$newMessages.stop().animate({ height: 20 });
				}
			}
		}

		function isLastInputVisible() {
			var currentHistoryBottom = $body.scrollTop() + $body.innerHeight();
			var lastInputTop = $chatHistory.outerHeight() - $chatHistory.children(".chat-input").last().innerHeight();
			return currentHistoryBottom > lastInputTop;
		}

        /*
        *  shows error with retriveing alme response
        */
        function almeErrorHandler(response)
        {
            // enaable input box
            enableInput();
        }

        /*
        *  loads chat history
        */
        function loadChatHistory()
        {
            agent.getConversationHistory();

            // play sound after navigation TTS
            //if ( NIT.Sound.getPlayTTSOnNav() )
            //{
            //    NIT.Sound.onSoundInitialized();
            //}
        }

        /*
        *  adds chat history to window once it is loaded
        */
        function onChatHistoryLoaded( chatHistory )
        {
            // If no chat history display welcome
            if (chatHistory.length == 0)
            {
				// 161102 - Disabling contact ID parameter until other issues 
				// are resolved. Invalid contact IDs currently freeze UI. 

                // ALME INTEGRATION
                var params = {},
					contactId = null;

                // Try to get the contactId for the logged in user from the Oracle page
                try {
				  // NDH-128 - Check both contactId and contactID
                  var getContactIdFunc = RightNow.Profile.contactID || 
                                         RightNow.Profile.contactId || 
                                         function getEmptyString() { return null; };
                  contactId = getContactIdFunc();
                } catch (err) {

                }

				// NDH-129 - Capitalize ContactId. Only add if non-empty.
				if (contactId) {
					params.ContactId = contactId;
				}

                agent.sendAppEvent('WelcomeUser', params); 

            }

            else
            {
            	if ($(".chat-input").length == 0)
                {

                    for ( var i = 0, n = chatHistory.length; i < n; i++ )
                    {
                        // if user input
                        if ( chatHistory[i].maskedInput != null )
                        {

                            renderUserInput( chatHistory[i].maskedInput, true );
                        }

                        // if alme input
                        if ( chatHistory[i].text != null )
                        {
                            renderAlmeInput( chatHistory[i], true, false );
                        }
                    }

                    var toBottom = setTimeout(function () {
	                    unreadMessages = 0;
                        $body.scrollTop( $chatHistory.outerHeight() );
                    }, 200);
                }
            }


        }

        /*
        * disable input box after submission
        */
        function disableInput()
        {
            if($inputBox) {
                // turn input box off
                $inputBox.attr("disabled", true);

                // add disabled styles
                $inputBox.addClass("disabled");

                // put placeholder message
                $inputBox.val("Please wait...");
            }
        }

        /*
        * enable input box after submission is processed
        */
        function enableInput()
        {
            // remove placeholder value
            $inputBox.val("");

            // remove disabled styles
            $inputBox.removeClass("disabled");

            // turn input box back off
            $inputBox.attr("disabled", false);

            // put focus back in input box
            if(!$ui.hasClass("mobile")) {
                $inputBox.trigger("focus");
            }
            
        }

        /*
        * render a user input
        */
        function renderUserInput( text, skipScroll )
        {
            result = '<div class="chat-input">\
            <div class="ui-user-avatar user-avatar"></div>\
            <div class="user-text">\
            <div class="ui-user-carrot carrot"></div><p>' + text + '</p></div></div>';

            $chatHistory.append( result );

            // make conversation history scrollable if conversation is taller than history window
            checkConversationHeight();

            // move chat history to last input
            if ( !skipScroll )
            {
                scrollChatHistory();
            }
        }

		function renderLiveChatLink(response) {
			return ' <a class="alme-nav-link" href="javascript:void(0);" onclick="window.open(\'' + 
				response.navUrl.UrlAddress + '\', \'LiveChat\', \'width=400,height=800\'); ' + 
				// NDH-64 - Disable live chat link
				'NIT.ui.disableLink(this);">' + 
				response.navUrl.DisplayText + '</a>';
		}

		// NDH-64 - Disable live chat link
		function disableLink(link) {
			link.setAttribute('onclick', 'return 0;');
			link.style.color = '#aaa';
			link.style.cursor = 'default';
		}

        function removeFileUpload() {
            $(".alme-file-upload-label").remove()
        }

        function setUploadPreview(event) {
            let numFiles = event.files.length;

            if(numFiles === 0) return;

            NIT.previewedFiles = [];

            for(let i = 0; i < numFiles; i++) {
                let file = event.files[i]
                NIT.previewedFiles.push(file);

                let reader = new FileReader()

                reader.onload = function (e) {
                    var previewElm = document.createElement("img");
                    previewElm.style.backgroundImage = 'url("' + reader.result + '")';
                    previewElm.className = ".alme-file-upload-preview"

                    $(".alme-file-upload-label").after(previewElm)
                }

                reader.readAsDataURL(file);
            }

            var confirmElm = document.createElement("button")
            confirmElm.className = ".alme-file-upload-confirm"
            confirmElm.onclick = function() {
                NIT.ui.submitAppEvent('UserFileUploaded'); 
                NIT.ui.removeFileUpload()
            }
            $(".alme-file-upload-label").after(confirmElm)
        }
        /*
        * render a alme input
        */
        function renderAlmeInput( response, skipScroll, allowNav )
        {
            if (allowNav == null)
            {
                allowNav = true;
            }

            // set up containment styling for the Alme response
            var almeFront  = '<div class="chat-input">\
            <div class="ui-alme-avatar alme-avatar"></div>\
            <div class="alme-text">\
            <div class="ui-alme-carrot carrot"></div>';

            var almeBack = '</div></div>';

            // start value as blank
            var output = almeFront,
                text = response && response.text || "";

            // include standard response text
            if (text)
            {
                text = text.replace(/(UI Version: )(null)/g, ("$1" + NIT.ui.version));
                output += '<p>';
                output += text;

                // adds url to the response
                if ( response.navUrl )
                {
                    var isPopup = (response.navUrl.LinkNavigationType == "Popup") ? 'target="_blank"' : '';

                    if(response.navUrl.LinkNavigationType == "Popup"){
                      output += renderLiveChatLink(response);
                    }
                    else{
                      output += ' <a class="alme-nav-link" href="' + response.navUrl.UrlAddress + '"' + isPopup + '>' + response.navUrl.DisplayText + '</a>';
                    }

                }

                output += '</p>';
            }

            // check for link sections and add them to output
            output += renderAlmeLinks( response.displayLinkCollection );

            output += almeBack;

            // add to chat history
            $chatHistory.append( output );

            // navigate if allowed
            if ( response.navUrl && allowNav)
            {
                if ( response.navUrl.AutoNavigationType == "MainPage" )
                {
                    window.location.href = response.navUrl.UrlAddress;
                }
                else if ( response.navUrl.AutoNavigationType == "Popup" )
                {
                    window.open(response.navUrl.UrlAddress, "_blank");
                }
            }

            // make conversation history scrollable if conversation is taller than history window
            checkConversationHeight();

            // move chat history to last input
            if ( !skipScroll )
            {
                scrollChatHistory();
            }
        }

        /*
        * render the links in alme the alme input,
        * return the formatted link html
        */
        function renderAlmeLinks( linkCollection )
        {
            var formattedLinks = "";

            // if no sections exit
            if ( linkCollection.Sections.length == 0 )
            {
                return "";
            }

            for ( var obj in linkCollection.Sections )
            {
                var section = linkCollection.Sections[obj];

                // open link section
                formattedLinks += '<div class="alme-link-section">';

                // include header text
                if (section.HeaderText != ("" || undefined)) {
                    formattedLinks += '<p class="alme-list-title">' + section.HeaderText + '</p>';
                }

                // write links
                var moreLink = false;
                if (section.Links.length > 0) {
                    formattedLinks += '<ul class="suggested-link-list">';

                    // Prepares links
                    for (j = 0; j < section.Links.length; j++) {
                        // above fold links
                        if (j < section.FoldLocation) {
                            formattedLinks += makeResponseLink( section.Links[j] );
                        }

                         // below fold links
                        else {
                            moreLink = true;
                            formattedLinks += makeResponseLink( section.Links[j], true );
                        }
                    }

                    formattedLinks += '</ul>';
                }

                if (moreLink) {
                    formattedLinks += '<p class="alme-section-more-link" ><a onclick="NIT.ui.showMoreLinks(event)">' + section.FoldText + '</a></p>';
                    formattedLinks += '<p class="alme-section-less-link" ><a onclick="NIT.ui.showLessLinks(event)">< Less</a></p>';
                }

                // close link section
                formattedLinks += '</div>';
            }

            // return links
            return formattedLinks;
        }

        /*
        * generates response link sections: returns for rendering
        */
        function makeResponseLink(target, isHidden)
        {
            // initialize output
            var output = "";

            // if link is not hidden
            if ( !isHidden )
            {
                output += '<li>';
            }

            // if link is hidden
            else
            {
                output += '<li class="fold" style="display: none;">';
            }

            // if link is an input
            if ( target.TargetType === "Input")
            {
                output += '<a href="javascript:void(0);" class="suggested-link" onclick="NIT.ui.submitInput(\'' +  escapeCharacters(target.Metadata.InputText) + '\')">';
                output += target.DisplayText;
                output += '</a>';
            }

            // if link is unit
            else if ( target.TargetType === "Unit" )
            {
                output += '<a class="suggested-link" onclick="NIT.ui.submitInput(\'' + escapeCharacters(target.DisplayText) + '\',\'' + target.Metadata.UnitUID + '\')">';
                output += target.DisplayText;
                output += '</a>';
            }

            // if link is a url
            else if ( target.TargetType === "Url" )
            {
                var url = escapeCharacters(target.Metadata.UrlAddress);

                // if navigates current page
                if ( target.Metadata.NavigationType == "MainPage" )
                {
                    output += '<a href="' + url + '" class="suggested-link">' + target.DisplayText + '</a>';
                }

                //
                else if ( target.Metadata.NavigationType == "None" )
                {
                    //NIT.logToDebugConsole('Display Link has Navigation type = None.');
                }

                // if opens in new tab
                else
                {
                    output += '<a href="' + url + '" target="_blank" class="suggested-link">' + target.DisplayText + '</a>';
                }
            }

            else if (target.TargetType === "Image Upload") {
                output += `<label class="alme-file-upload-label">
                                <input type="file" accept="image/*,video/*" id="file-input" onchange="NIT.ui.setUploadPreview(this);" onclick="NIT.ui.scrollChatHistory()" multiple>
                                <span>${target.DisplayText}</span>
                            </label>
                            `
            }

            else
            {
                output += '<a href="javascript:void(0);" target="_blank" class="suggested-link">' + target.DisplayText + '</a>';
            }

            // close link
            output += '</li>';
            return output;
        }

        /*
        * checks the height of a conversation
        * makes history scrollable if conversation is taller than window
        */
        function checkConversationHeight( chatHeight )
        {
            var testHeight = (chatHeight !== undefined) ? chatHeight : $chatHistory.outerHeight();

            // if conversation is taller than window make scrollable
            if ( testHeight  > $body.height() )
            {
                $chatHistory.css({ position: "relative" });
            }

            else
            {
                $chatHistory.css({ position: "absolute" });
            }
        }

        /*
        * Scrolls chat history to latest input
        */
        function scrollChatHistory()
        {
            // get last element
            var $last = $chatHistory.children(".chat-input").last();

            var numChats = $(".chat-input").length;

            // if more than one chat
            if ( numChats > 1 )
            {
                // get second to last element
                var $prev = $last.prev();

                var padding = $prev.outerHeight() - $prev.height();

                // animate to latest input or bottom
                $body.stop().animate({
                    scrollTop: $prev.position().top - padding + 1
                });
            }
        }

        /*
        * escape special characters
        */
        function escapeCharacters( string )
        {
            return String(string).replace(/\\/g, "\\\\").replace(/\'/g, "\\'").replace(/\"/g, "\\\"");
        }

        var prepAgentContext = function()
        {
            var match,
            pl     = /\+/g,  // Regex for replacing addition symbol with a space
            search = /([^&=]+)=?([^&]*)/g,
            decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
            query  = window.location.hash.substring(2);

            var urlParams = {};
            while (match = search.exec(query)) {
                urlParams[decode(match[1])] = decode(match[2]);
            }

            window.NIT.context = {
                qsParams: urlParams
            };

            if(!urlParams.debug)
                window.location.hash = ''
        }

        var fauxClearSession = function() {
            cookieService.deleteCookie('NIT_SessionState');
            cookieService.deleteCookie('NIT_UI');
            $("#alme-chat-history").empty()
        }

        var handleProactiveInput = function(input, clearSession) {
            if(clearSession === "true") {
                fauxClearSession()
            }

            // hide button if available
            if ( settings.engagementType === "button" )
            {
                NIT.engagement.hide();
            }

            NIT.ui.open(input, undefined, !clearSession);
            lastState.isOpen = false;
        }

        var handleProactiveEvent = function(event, input, clearSession) {
            if(clearSession === "true") {
                fauxClearSession()
            }

            // hide button if available
            if ( settings.engagementType === "button" )
            {
                NIT.engagement.hide();
            }
            
            if(input) {
                input = JSON.parse(input);
            } else {
                input = {}
            }

            NIT.ui.openWithEvent(event, input, !clearSession); 
            lastState.isOpen = false;
        }

        var handleProactiveUnitRequest = function(unitId, input, clearSession) {
            if(clearSession === "true") {
                fauxClearSession()
            }

            // hide button if available
            if ( settings.engagementType === "button" )
            {
                NIT.engagement.hide();
            }

            NIT.ui.open(input, unitId, !clearSession);
            lastState.isOpen = false;
        }

        var handleQuerystring = function() {
            var params = NIT.context.qsParams;

            
            switch(params.type) {
                case "input":
                    handleProactiveInput(params.input, params.new)
                break;
                case "appevent":
                    handleProactiveEvent(params.event, params.input, params.new)
                break;
                case "unit":
                    handleProactiveUnitRequest(params.unit, params.input, params.new)
                break;
                default:
                    handleProactiveInput(params.input, params.new)
                break;
            }
        }
        //public functions
        return {
            /*
            * initialize the Alme UI
            */
            init: function()
            {
                // starts the alme service / allows reference to the api
                initAlmeService();

                // create content wrapper for page adjustment
                //$("body").children().wrapAll('<div id="alme-global-wrapper" />');

                // set ui elements to variables for continued use
                getUiReferences();

                // set buttons to variables for continued use
                getButtonReferences();
                buttonsSetup();

                // update UI settings based on cookie
                getUiCookie();

                // update state of the ui to match last known state or defaults
                setUiState();

                //Pulls qs and launches with question if needed
                prepAgentContext()

                // intializes sound
                if ( settings.soundAvailable )
                {
                    if ( getSoundState() )
                    {
                        NIT.ui.soundOn(); // TTS
                    }
                    else
                    {
                        NIT.ui.soundOff();
                    }
                }
                else
                {
                    //NIT.Sound.setSoundEnabled(false); // TTS
                }

                // if input type is button: render button
                if ( settings.engagementType === "button" )
                {
                    NIT.engagement.init();
                }

                // make sure appropriate stateButton is available
                var layout = getLayout();
                if ( settings.uiLayout === "sidebar" )
                {
                    $toSidebarButton.addClass("display-none");
                    $toDockableButton.removeClass("display-none");
                }

                // if not multi layout, hide layout change buttons
                if ( !settings.multipleUiStates )
                {
                    $toDockableButton.addClass("display-none");
                    $toSidebarButton.addClass("display-none");
                }

                // if sound isn't available, hide buttons
                if ( !settings.soundAvailable )
                {
                    $soundOnButton.addClass("display-none");
                    $soundOffButton.addClass("display-none");
                }

                // if font changer isn't available remove buttons
                if ( !settings.fontChangerAvailable )
                {
                    $fontIncreaseButton.addClass("display-none");
                    $fontDecreaseButton.addClass("display-none");
                }

                // setup window resize function
                $window.on("resize", onWindowResize);

                // prevents resizing the UI from firing the window resize event
                $ui.on("resize", function(e) { e.stopPropagation() });

                // set window limits
                setAlmeWindowLimits();

                // enables input box, limits character input
                $inputBox = $("#alme-input-field");
                $inputBox.on( "keyup", function() {
                    if ( $inputBox.val().length > settings.characterLimit - 1 )
                    {
                        $inputBox.val( $inputBox.val().substring(0, settings.characterLimit) );
                    }
                });

                // allows inputs to be submitted
                var $inputForm = $("#alme-input-form");
                $inputForm.on( "submit", function() {
                    NIT.ui.submitInput()
                    return false;
                });
                $inputButton.on( "click", function() {
                    NIT.ui.submitInput();
                    return false;
                });

                var launched;

                if (NIT.context && NIT.context.qsParams && Object.keys(NIT.context.qsParams).length > 0) {
                    launched = true;
                    handleQuerystring();
                }

                // if was previously open
                if ( lastState.isOpen && !launched)
                {
                    // hide button if available
                    if ( settings.engagementType === "button" )
                    {
                        NIT.engagement.hide();
                    }

                    // open ui
                    NIT.ui.open();
                }
            },

            /*
            * Opens the Alme ui
            */
            open: function( openInput, unitId, loadHistory = true )
            {
                console.log('open called')

                if(loadHistory) {
                    // loads the chat history
                    loadChatHistory();
                }

                // get the last known layout of the UI
                var uiLayout = getLayout();

                // if ui is responsive and the window width is less than set responsive width
                if ( settings.isResponsive && $window.width() <= settings.responsiveTakeoverWidth )
                {
                    // set chat history height to fill available area
                    setBodyHeight( $window.height() );

                    if ( settings.engagementType === "button" )
                    {
                        $contentWrap.css({
                            height: "auto"
                        });

                        $ui.fadeIn();
                    }

                    if ( settings.engagementType === "input")
                    {
                        // animate alme wrapper to full page height
                        $contentWrap.animate({
                            height: $window.height() - $footer.outerHeight()
                        });
                    }
                }

                // if ui is in dockable state
                else if ( uiLayout === "dockable" )
                {
                    // if engagement type is button
                    if ( settings.engagementType === "button" )
                    {
                        // set ui dimensions to last known size or default size
                        // set ui to last known position, or default position
                        var newSize = getLastSize();
                        var newPosition = getLastPosition();

                        //var setPosition = lastPosition;
                        $ui.css({
                            width: newSize.uiWidth,
                            height: newSize.uiHeight,
                            top: newPosition.top,
                            left: newPosition.left
                        });

                        // set chat history to fill available space
                        setBodyHeight( newSize.uiHeight );

                        // fade ui in
                        $ui.fadeIn(function() {
                            // set up draggable and resize
                            if ( settings.isResizable )
                            {
                                startResizable();
                            }

                            if ( settings.isDraggable )
                            {
                                startDraggable();
                            }
                        });
                    }

                    // if engagement type is input
                    else if ( settings.engagementType === "input")
                    {
                        var lastSize = getLastSize();
                        var lastPosition = getLastPosition();

                        // set height of chat history
                        setBodyHeight( lastSize.uiHeight );

                        var currentPosition = $ui.position();
                        $ui.css({
                            top: currentPosition.top,
                            left: currentPosition.left,
                            bottom: "auto",
                            right: "auto"
                        }).animate({
                            width: lastSize.uiWidth,
                            left: lastPosition.left,
                            top: lastPosition.top,
                        });

                        // animate content wrap body to last known height - footer
                        $contentWrap.animate({
                            height: lastSize.uiHeight - $footer.outerHeight()
                        }, function() {
                            $contentWrap.css({
                                height: "auto"
                            });

                            // set up draggable and resize
                            if ( settings.isResizable )
                            {
                                startResizable();
                            }

                            if ( settings.isDraggable )
                            {
                                startDraggable();
                            }
                        });
                    }

                    // make sure UI is on screen
                    resetUiBounds();
                }

                // if ui is in sidebar state
                else if ( uiLayout === "sidebar" )
                {
                    // set chat content area to be full height - footer height
                    setBodyHeight( $window.height() );

                    // move ui to onto screen by width defined by settings
                    $ui.animate({
                        right: 0,
                        width: settings.sidebarWidth
                    });

                    // adjust website content over
                    adjustWebsiteIn();
                }

                // focus on the input box if possible
                //$inputBox.trigger("focus");

                // remember that ui is open
                lastState.isOpen = true;

                // remember ui state in cookie
                setUiCookie();

                // submit provided input, if availble
                if ( openInput != null )
                {
                    NIT.ui.submitInput( openInput, unitId );
                }
            },

            /*
            * Opens the Alme ui
            */
           openWithEvent: function( eventName, parameters, loadHistory = true )
           {
               if(loadHistory) {
                   // loads the chat history
                   loadChatHistory();
               }

               // get the last known layout of the UI
               var uiLayout = getLayout();

               // if ui is responsive and the window width is less than set responsive width
               if ( settings.isResponsive && $window.width() <= settings.responsiveTakeoverWidth )
               {
                   // set chat history height to fill available area
                   setBodyHeight( $window.height() );

                   if ( settings.engagementType === "button" )
                   {
                       $contentWrap.css({
                           height: "auto"
                       });

                       $ui.fadeIn();
                   }

                   if ( settings.engagementType === "input")
                   {
                       // animate alme wrapper to full page height
                       $contentWrap.animate({
                           height: $window.height() - $footer.outerHeight()
                       });
                   }
               }

               // if ui is in dockable state
               else if ( uiLayout === "dockable" )
               {
                   // if engagement type is button
                   if ( settings.engagementType === "button" )
                   {
                       // set ui dimensions to last known size or default size
                       // set ui to last known position, or default position
                       var newSize = getLastSize();
                       var newPosition = getLastPosition();

                       //var setPosition = lastPosition;
                       $ui.css({
                           width: newSize.uiWidth,
                           height: newSize.uiHeight,
                           top: newPosition.top,
                           left: newPosition.left
                       });

                       // set chat history to fill available space
                       setBodyHeight( newSize.uiHeight );

                       // fade ui in
                       $ui.fadeIn(function() {
                           // set up draggable and resize
                           if ( settings.isResizable )
                           {
                               startResizable();
                           }

                           if ( settings.isDraggable )
                           {
                               startDraggable();
                           }
                       });
                   }

                   // if engagement type is input
                   else if ( settings.engagementType === "input")
                   {
                       var lastSize = getLastSize();
                       var lastPosition = getLastPosition();

                       // set height of chat history
                       setBodyHeight( lastSize.uiHeight );

                       var currentPosition = $ui.position();
                       $ui.css({
                           top: currentPosition.top,
                           left: currentPosition.left,
                           bottom: "auto",
                           right: "auto"
                       }).animate({
                           width: lastSize.uiWidth,
                           left: lastPosition.left,
                           top: lastPosition.top,
                       });

                       // animate content wrap body to last known height - footer
                       $contentWrap.animate({
                           height: lastSize.uiHeight - $footer.outerHeight()
                       }, function() {
                           $contentWrap.css({
                               height: "auto"
                           });

                           // set up draggable and resize
                           if ( settings.isResizable )
                           {
                               startResizable();
                           }

                           if ( settings.isDraggable )
                           {
                               startDraggable();
                           }
                       });
                   }

                   // make sure UI is on screen
                   resetUiBounds();
               }

               // if ui is in sidebar state
               else if ( uiLayout === "sidebar" )
               {
                   // set chat content area to be full height - footer height
                   setBodyHeight( $window.height() );

                   // move ui to onto screen by width defined by settings
                   $ui.animate({
                       right: 0,
                       width: settings.sidebarWidth
                   });

                   // adjust website content over
                   adjustWebsiteIn();
               }

               // focus on the input box if possible
               //$inputBox.trigger("focus");

               // remember that ui is open
               lastState.isOpen = true;

               // remember ui state in cookie
               setUiCookie();

               // submit provided input, if availble
               agent.sendAppEvent(eventName, parameters); 
           },

            /*
            * Closes the alme ui
            */
            close: function()
            {
                // get the last known layout of the UI
                var uiLayout = getLayout();

                // if is responsive and the window width is less than the responsive takeover width
                if ( settings.isResponsive && $window.width() <= settings.responsiveTakeoverWidth )
                {

                    if ( settings.engagementType === "button" )
                    {
                        $ui.fadeOut();
                    }

                    if ( settings.engagementType === "input")
                    {
                        // animate content wrap to height 0
                        $contentWrap.animate({
                            height: 0
                        });
                    }


                }

                // if ui state is dockable
                else if ( uiLayout === "dockable" )
                {
                    // if engagement type is button
                    if ( settings.engagementType === "button" )
                    {
                        // fade ui out
                        $ui.fadeOut();
                    }

                    // if engagement type is input
                    else if ( settings.engagementType === "input")
                    {
                        // animate ui to bottom right and to original width
                        $ui.css({
                            right: $window.width() - ( $ui.position().left + $ui.outerWidth() ),
                            bottom: $window.height() - ( $ui.position().top + $ui.outerHeight() ),
                            left: "auto",
                            top: "auto",
                            height: "auto"
                        }).animate({
                            bottom: 0,
                            right: 0,
                            width: settings.dockableWidth
                        });

                        // animate content wrap height to 0
                        $contentWrap.animate({
                            height: 0
                        });
                    }

                    // disable resize if it is available
                    if ( settings.isResizable )
                    {
                        disableResize();
                    }
                }

                // if ui state is sidebar
                else if ( uiLayout === "sidebar" )
                {
                    // animate ui off right side of the screen
                    $ui.animate({
                        right: - settings.sidebarWidth
                    });

                    // adjust website content to full screen
                    adjustWebsiteOut();
                }

                // if engagement type is button dispatch close event for communication with buttons
                if ( settings.engagementType === "button" )
                {
                    NIT.engagement.show();
                }
                // remember that ui is open
                lastState.isOpen = false;

                // remember ui state in cookie
                setUiCookie();
                cookieService.deleteCookie('NIT_SessionState');
                cookieService.deleteCookie('NIT_UI');
                location.href="";
                $("#alme-chat-history").empty()
            },

            minimize: function()
            {
                // get the last known layout of the UI
                var uiLayout = getLayout();

                // if is responsive and the window width is less than the responsive takeover width
                if ( settings.isResponsive && $window.width() <= settings.responsiveTakeoverWidth )
                {

                    if ( settings.engagementType === "button" )
                    {
                        $ui.fadeOut();
                    }

                    if ( settings.engagementType === "input")
                    {
                        // animate content wrap to height 0
                        $contentWrap.animate({
                            height: 0
                        });
                    }


                }

                // if ui state is dockable
                else if ( uiLayout === "dockable" )
                {
                    rememberLastState();

                    // if engagement type is button
                    if ( settings.engagementType === "button" )
                    {
                        // fade ui out
                        $ui.fadeOut();
                    }

                    // if engagement type is input
                    else if ( settings.engagementType === "input")
                    {
                        // animate ui to bottom right and to original width
                        $ui.css({
                            right: $window.width() - ( $ui.position().left + $ui.outerWidth() ),
                            bottom: $window.height() - ( $ui.position().top + $ui.outerHeight() ),
                            left: "auto",
                            top: "auto",
                            height: "auto"
                        }).animate({
                            bottom: 0,
                            right: 0,
                            width: settings.dockableWidth
                        });

                        // animate content wrap height to 0
                        $contentWrap.animate({
                            height: 0
                        });
                    }

                    // disable resize if it is available
                    if ( settings.isResizable )
                    {
                        disableResize();
                    }
                }

                // if ui state is sidebar
                else if ( uiLayout === "sidebar" )
                {
                    // animate ui off right side of the screen
                    $ui.animate({
                        right: - settings.sidebarWidth
                    });

                    // adjust website content to full screen
                    adjustWebsiteOut();
                }

                // if engagement type is button dispatch close event for communication with buttons
                if ( settings.engagementType === "button" )
                {
                    NIT.engagement.show();
                }

                // remember that ui is closed
                lastState.isOpen = false;

                // remember ui state in cookie
                setUiCookie();
            },

            /*
            * Turns audio on
            */
            soundOn: function()
            {
                //// hide sound on button, show sound off button
                //$soundOnButton.addClass("display-none");
                //$soundOffButton.removeClass("display-none");

                //// remember sound state
                //lastState.sound = true;

                //// turn sound on
                //NIT.Sound.setSoundEnabled(true); // TTS

                //// remember ui state in cookie
                //setUiCookie();
            },

            /*
            * Turns audio off
            */
            soundOff: function()
            {
                //// hide sound off button, show sound on button
                //$soundOnButton.removeClass("display-none");
                //$soundOffButton.addClass("display-none");

                //// remember sound state
                //lastState.sound = false;

                //// turn sound off
                //NIT.Sound.stopSound();  //NIT.TTS.js
                //NIT.Sound.setSoundEnabled(false);  //NIT.TTS.js

                //// remember ui state in cookie
                //setUiCookie();
            },

            /*
            * Increases the font size of the chat history area
            */
            increaseFontSize: function()
            {
                // if font size is less than maximum: increase it by 2
                var currentSize = Number($chatHistory.css("font-size").split("px")[0]);
                var newSize = currentSize + 2;
                if ( currentSize < settings.fontMax )
                {
                    $chatHistory.css({
                        fontSize: newSize,
                        lineHeight: "1.4"
                    });
                }

                // display decrease font size button
                $fontDecreaseButton.removeClass("display-none");

                // set last known font size
                lastState.fontSize = newSize;

                // remember ui state in cookie
                setUiCookie();
            },

            /*
            * Increases the font size of the chat history area
            */
            decreaseFontSize: function()
            {
                // get current font size and increase it by 2
                var currentSize = Number($chatHistory.css("font-size").split("px")[0]);
                var newSize = currentSize - 2;

                if ( currentSize > settings.fontMin )
                {
                    $chatHistory.css({
                        fontSize: newSize,
                        lineHeight: "1.4"
                    });
                }

                // set last known font size
                lastState.fontSize = newSize;

                // remember ui state in cookie
                setUiCookie();
            },

            /*
            * changes UI to sidebar state
            */
            toSidebar: function()
            {
                // remember chat history height for later calculations
                var chatHeight = $chatHistory.outerHeight();

                // remember last position and size
                rememberLastState();

                // remember layout
                lastState.layout = "sidebar";

                // fade out dockable ui and do other processes after complete
                $ui.fadeOut( 400, changeUi );

                // remove Resizability and dragability
                disableResize();
                disableDraggable();

                function changeUi() {
                    // remove dockable class and add sidebar class
                    // make sure ui fills screen and is on screen
                    $ui.removeClass("dockable").addClass("sidebar");

                    $ui.css({
                        height: $window.height(),
                        right: 0,
                        top: "",
                        left: "auto",
                        bottom: "auto",
                        width: ""
                    });


                    // set chat history height to fill available space
                    setBodyHeight( $window.height() );

                    checkConversationHeight( chatHeight );

                    updateChangeStateButtons( "sidebar" );

                    // fade in sidebar ui
                    $ui.fadeIn( function() { scrollChatHistory(); } );

                    // adjust website content over
                    adjustWebsiteIn();
                }

                // remember ui state in cookie
                setUiCookie();
            },

            /*
            * changes ui to dockable state
            */
            toDockable: function()
            {
                // remember chat history height for later calculations
                var chatHeight = $chatHistory.outerHeight();

                // fade out sidebar ui: do other processes after complete
                $ui.fadeOut( 400, changeUi );

                // remember layout
                lastState.layout = "dockable";

                function changeUi()
                {
                    // remove sidebar class + add dockable class
                    $ui.removeClass("sidebar").addClass("dockable");

                    // get last size and position of dockable state
                    var newSize = getLastSize();
                    var newPosition = getLastPosition( newSize.uiHeight );

                    // adjust ui to last known position and last known size
                    $ui.css({
                        width: newSize.uiWidth,
                        height: newSize.uiHeight,
                        left: newPosition.left,
                        top: newPosition.top
                    });

                    // adjust body to take available space
                    setBodyHeight( newSize.uiHeight );

                    // make sure content wrap doesn't hide anything
                    $contentWrap.css({
                        height: "auto"
                    });

                    checkConversationHeight( chatHeight );

                    // updated change state buttons
                    updateChangeStateButtons( "dockable" );

                    // fade in dockable ui
                    $ui.fadeIn(function() { scrollChatHistory(); });

                    // adjust website content to full screen
                    adjustWebsiteOut();

                    // enable Resizability and draggability
                    startResizable();
                    startDraggable();

                    resetUiBounds();
                }

                // remember ui state in cookie
                setUiCookie();
            },

            submitAppEvent: function(name, params) {
                agent.sendAppEvent(name, params || {}); 
            },

            /*
            * submits the text currently placed in the input box
            */
            submitInput: function(inputValue, unitID)
            {
                // set channel to web
                channel = "Web";

                // get current value from
                var input = (inputValue !== undefined) ? inputValue : $inputBox.val();

                // if submitted via unit id
                if ( unitID != null ) {
                    // disable input box to prevent multiple questions at once
                    disableInput();

                    agent.getUnit( unitID, input );
                    return false;
                }

                // make sure input is not an empty string
                if ( /\S/.test(input) )
                {
                    // disable input box to prevent multiple questions at once
                    disableInput();

                    // send input to alme for processing
                    agent.sendInput( input );

                    return false;
                }

                return false;
            },

            /*
            * opens agent and gets a help message
            */
            help: function()
            {
                // if agent isn't open, open it
                if ( typeof lastState.isOpen === "undefined" || !lastState.isOpen )
                {
                    NIT.ui.open();
                }

                // display help message from alme
                NIT.ui.submitInput(null, "Help");
            },

            /*
                    * Shows hidden links in agent responses
                    */
            showMoreLinks: function(e) {
                var target = e.originalTarget || e.target;
                var $this = $(target).parent();
                var scrollPosition = $body.scrollTop();

                $this.hide();
                $this.next().show();
                $this.prev().children(".fold").fadeIn();

                $body.scrollTop(scrollPosition);

                // make conversation history scrollable if conversation is taller than history window
                checkConversationHeight();
            },

            /*
            * Shows hidden links in agent responses
            */
            showLessLinks: function(e) {
                var target = e.originalTarget || e.target;
                var $this = $(target).parent();

                $this.hide();
                $this.prev().show();
                $this.prev().prev().children(".fold").fadeOut();
            },

			scrollChatHistory: function(e) {
				scrollChatHistory();
			},

			onScroll: function(e) {
				updateNewMessagesNotice(false);
			},

            /*
            * injects the alme ui
            */
            inject: function()
            {
                // prep ui
                var injection = '<div id="alme-window"></div>\
                <div id="alme-wrap" class="dockable">\
                    <div id="inset-shadow"></div>\
                    <div id="alme-content-wrap">\
                        <div id="alme-header">\
                            <div id="alme-header-banner">Ask Sarah - Your Claims Expert</div>\
                            <ul>\
                                <li><a id="alme-minimize-button" class="ui-minimize button"  title="Minimize"></a></li>\
                                <li><a id="alme-close-button" class="ui-close button"  title="Close"></a></li>\
                            </ul>\
                        </div><!-- #alme-header -->\
                        <div id="alme-body">\
                            <div id="alme-chat-history">\
                            </div><!-- #chat-history -->\
                        </div><!-- .alme-body -->\
						<div class="alme-new-messages"></div>\
                    </div><!-- #alme-content-wrap -->\
                    <div id="alme-footer">\
                        <div id="alme-avatar"></div>\
                        <div id="alme-input-section">\
                            <form id="alme-input-form">\
                            <table cellpadding="0" cellspacing="0" width="100%">\
                            <tbody>\
                            <tr>\
                            <td  id="table-input">\
                                <div class="alme-input-wrap">\
                                <a href="javascript:void(0);" id="alme-help-button" class="button ui-question-mark" title="Need help?"></a>\
                                <div class="alme-input">\
                                <input id="alme-input-field" type="text" placeholder="Type your question here." autocomplete="off" onkeyup="this.placeholder = \'\'" onblur="this.placeholder = \'Type your question here.\'" />\
                                </div><!-- .alme-input -->\
                                </div><!-- .alme-input-wrap -->\
                            </td>\
                            <td class="alme-input-button-wrap">\
                                <a type="submit" id="alme-input-button">Send</a>\
                            </td>\
                            </tr>\
                            </tbody>\
                            </table>\
                            </form>\
                        </div><!-- #alme-input-section-->\
                    </div><!-- .alme-footer -->\
                </div><!-- #alme-sidebar-wrap -->';

                // add ui to page
                $("body").append(injection);

                // start up ui
                NIT.ui.init();
            },

            disableLink: disableLink,
            removeFileUpload : removeFileUpload,
            setUploadPreview : setUploadPreview,
            version: nit_alme_ui_version
        }

    }());

    NIT.engagement = (function() {
        settings = {
            expandOnHover: true,
            expandedWidth: 157
        }

        // initialize references to button items for future use
        var $engagementButton, $collapsedText, $expandedText;

        /*
        * Adds the enagagement button to the page
        */
        var renderEngagementPoint = function()
        {
            // prepare enagement button html
            var engagementPoint = '<a id="launch-button" class="button-launch button">\
            <div id="alme-engagement-agent" class="launch-button-agent"></div>\
            <div class="preview">Severe<br /> Weather</div>\
            <div class="full">Claims Demo<strong><br />Click to start</strong></div>\
            </a>';

            // add engagement button to page
            $("body").append(engagementPoint);

            // remember engagement button for future use
            $engagementButton = $("#launch-button");
            $collapsedText = $engagementButton.children(".preview");
            $expandedText = $engagementButton.children(".full");
        }

        /*
        * Opens alme ui and hides button
        */
        var onEngagementClick = function()
        {
            // open alme ui
            NIT.ui.open();

            // hide engagement button
            $engagementButton.fadeOut();
        }

        /*
        * expands engagement point on mouseover
        */
        var onEngagementMouseover = function()
        {
            // hide preview text and show expanded text
            $collapsedText.stop().css("display","none");
            $expandedText.stop().animate({ width: settings.expandedWidth }, "fast");
        }

        /*
        * collapses enagement point on mouseout
        */
        var onEngagementMouseout = function()
        {
            $expandedText.stop().animate({ width: "0" }, "fast", function() {
                $collapsedText.stop().css("display","block");
            });
        }

        return {
            /*
            * Initializes engagement button
            */
            init: function()
            {
                // renders engagement button
                renderEngagementPoint();

                // open alme on click
                $engagementButton.on("click", onEngagementClick);

                if ( settings.expandOnHover )
                {
                    // maintain initial width (for transitions)
                    $engagementButton.css({
                        minWidth: $engagementButton.width()
                    });

                    // expand on mouseover
                    $engagementButton.on("mouseover", onEngagementMouseover);

                    // collapse on mouseout
                    $engagementButton.on("mouseout", onEngagementMouseout);
                }

                
            },

            /*
            * hides engagement point
            */
            hide: function()
            {
                $engagementButton.fadeOut();
            },

            /*
            * shows engagement point
            */
            show: function()
            {
                $engagementButton.fadeIn();
            }
        }
    }());

})( jQuery.noConflict() );


// Launch alme UI when document is loaded
if ( window.addEventListener )
{
    window.addEventListener( "load", onDOMReady , false );
}
// fix for ie8
else
{
    window.attachEvent( "onload", onDOMReady, false );
}

function onDOMReady() {
    NIT.ui.inject();
}
