import React from 'react';
import { CopyButton } from 'UI';
import Highlight from 'react-highlight';

const inputModeOptions = [
    { label: 'Record all inputs', value: 'plain' },
    { label: 'Obscure all inputs', value: 'hidden' },
    { label: 'Ignore all inputs', value: 'obscured' },
];
  
const inputModeOptionsMap: any = {}
inputModeOptions.forEach((o: any, i: any) => inputModeOptionsMap[o.value] = i)

interface Props {
    isAssistEnabled: boolean;
    host: string;
    projectKey: string;
    ingestPoint: string;
    defaultInputMode: any;
    obscureTextNumbers: boolean;
    obscureTextEmails: boolean;
}
function CodeSnippet(props: Props) {
    const { host, projectKey, ingestPoint, defaultInputMode, obscureTextNumbers, obscureTextEmails, isAssistEnabled } = props;
    const codeSnippet = `<!-- OpenReplay Tracking Code for ${host} -->
<script>
  var initOpts = {
    projectKey: "${projectKey}",
    ingestPoint: ${ingestPoint},
    defaultInputMode: ${inputModeOptionsMap[defaultInputMode]},
    obscureTextNumbers: ${obscureTextNumbers},
    obscureTextEmails: ${obscureTextEmails},
  };
  var startOpts = { userID: "" };
  (function(A,s,a,y,e,r){
    r=window.OpenReplay=[e,r,y,[s-1, e]];
    s=document.createElement('script');s.src=A;s.async=!a;
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
  })("${window.env.TRACKER_HOST || '//static.openreplay.com'}/${window.env.TRACKER_VERSION}/openreplay${isAssistEnabled ? '-assist.js' : '.js'}",1,0,initOpts,startOpts);
</script>`;

    return (
        <div className="relative">
            <div className="absolute top-0 right-0 mt-2 mr-2">                
                <CopyButton content={codeSnippet} className="uppercase" />
            </div>
            <Highlight className="html">
                {codeSnippet}
            </Highlight>
        </div>
    );
}

export default CodeSnippet;