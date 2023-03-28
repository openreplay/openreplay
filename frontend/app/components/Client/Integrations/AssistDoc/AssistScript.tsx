import React from 'react';
import Highlight from 'react-highlight'

function AssistScript(props) {
  return (
    <div>
      <p>If your OpenReplay tracker is set up using the JS snippet, then simply replace the .../openreplay.js occurrence with .../openreplay-assist.js. Below is an example of how the script should like after the change:</p>
      <div className="py-3" />

      <Highlight className="js">
        {`<!-- OpenReplay Tracking Code -->
<script>
(function(A,s,a,y,e,r){
  r=window.OpenReplay=[s,r,e,[y-1]];
  s=document.createElement('script');s.src=a;s.async=!A;
  document.getElementsByTagName('head')[0].appendChild(s);
  r.start=function(v){r.push([0])};
  r.stop=function(v){r.push([1])};
  r.setUserID=function(id){r.push([2,id])};
  r.setUserAnonymousID=function(id){r.push([3,id])};
  r.setMetadata=function(k,v){r.push([4,k,v])};
  r.event=function(k,p,i){r.push([5,k,p,i])};
  r.issue=function(k,p){r.push([6,k,p])};
  r.isActive=function(){return false};
  r.getSessionToken=function(){};
})(0, "${props.projectKey}", "${window.env.TRACKER_HOST || '//static.openreplay.com'}/${window.env.TRACKER_VERSION}/openreplay-assist.js", 1, 28);
</script>`}
      </Highlight>
    </div>
  );
}

export default AssistScript;