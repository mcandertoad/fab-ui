/***********************************************************************
   Page Awareness
************************************************************************/

(function(){
	var agent = require('NIT.Agent');
	agent.addEventListener(agent.supportedEvents.BeforeInputSent, beforeRequestSentHandler);
	agent.addEventListener(agent.supportedEvents.BeforeUnitRequestSent, beforeRequestSentHandler);
	agent.addEventListener(agent.supportedEvents.BeforeAppEventSent, beforeRequestSentHandler);
	
	function beforeRequestSentHandler(request){
		if(typeof request === "undefined" || request === null || !request.parameters){
			return;
		}
		
		if(!request.parameters.Context){
			request.parameters.Context = {};
		}
		
		request.parameters.Context.CurrentUrl = generatePageAwarenessProperties();
	}
	
	function generatePageAwarenessProperties(){
		var pageAwareObj = {
            AbsolutePath: window.location.href,
            Protocol: window.location.protocol,
            Host: window.location.host,
            HostName: window.location.hostname,
            Port: window.location.port,
            Uri: window.location.pathname,
            Query: window.location.search,
            Fragment: window.location.hash,
            UserName: window.location.username,
            Password: window.location.password,
            Origin: window.location.origin,
            Type: 'type',
            PageName: window.location.href
        };
		
		return pageAwareObj;
	}
})();