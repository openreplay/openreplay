import React, { useState } from 'react'
import { connect } from 'react-redux';
import { editGDPR, saveGDPR } from 'Duck/site';
import copy from 'copy-to-clipboard';
import { Select, Checkbox } from 'UI';
import GDPR from 'Types/site/gdpr';
import cn from 'classnames'
import stl from './projectCodeSnippet.css'
import CircleNumber from '../../CircleNumber';
import Highlight from 'react-highlight'

const inputModeOptions = [
  { text: 'Record all inputs', value: 'plain' },
  { text: 'Ignore all inputs', value: 'obscured' },
  { text: 'Obscure all inputs', value: 'hidden' },
];

const codeSnippet = `<!-- OpenReplay Tracking Code for HOST -->
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
  r.isActive=r.active=function(){return false};
  r.getSessionToken=r.sessionID=function(){};
})(0,PROJECT_HASH,"//${window.location.hostname}/static/openreplay.js",1,XXX);
</script>`;


const ProjectCodeSnippet = props  => {
  const { site, gdpr } = props;
  const [changed, setChanged] = useState(false)
  const [copied, setCopied] = useState(false)

  const saveGDPR = (value) => {
    setChanged(true)
    props.saveGDPR(site.id, GDPR({...value}));
  }

  const onChangeSelect = (event, { name, value }) => {
    const { gdpr } = site;
    const _gdpr = { ...gdpr.toData() };
    props.editGDPR({ [ name ]: value });
    _gdpr[name] = value;
    props.editGDPR({ [ name ]: value }); 
    saveGDPR(_gdpr)
  };

  const onChangeOption = (event, { name, checked }) => {
    const { gdpr } = props.site;
    const _gdpr = { ...gdpr.toData() };
    _gdpr[name] = checked;
    props.editGDPR({ [ name ]: checked });
    saveGDPR(_gdpr)
  }

  const getOptionValues = () => {
    const { gdpr } = props.site;
    return (!!gdpr.maskEmails)|(!!gdpr.maskNumbers << 1)|(['plain' , 'obscured', 'hidden'].indexOf(gdpr.defaultInputMode) << 5)|28
  }


  const getCodeSnippet = site => {
    let snippet = codeSnippet;
    if (site && site.id) {
      snippet = snippet.replace('PROJECT_KEY', site.projectKey);
    }
    return snippet
      .replace('XXX', getOptionValues())
      .replace('HOST', site && site.host);   
  }   

  const copyHandler = (code) => {
    setCopied(true);
    copy(code);
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };  

  const _snippet = getCodeSnippet(site);
  
  return (
    <div>
      <div className="mb-4">
        <div className="font-semibold mb-2 flex items-center">
          <CircleNumber text="1" /> Choose data recording options:
        </div>
        <div className="flex items-center ml-10">
          <Select
            name="defaultInputMode"
            options={ inputModeOptions }
            onChange={ onChangeSelect }
            placeholder="Default Input Mode"
            value={ gdpr.defaultInputMode }
          />
          <div className="mx-4" />

          <Checkbox
            name="maskNumbers"
            type="checkbox"
            checked={ gdpr.maskNumbers }
            onClick={ onChangeOption }
            className="mr-2"
            label="Do not record any numeric text"
          />

          <div className="mx-4" />

          <Checkbox
            name="maskEmails"
            type="checkbox"
            checked={ gdpr.maskEmails }
            onClick={ onChangeOption }
            className="mr-2"
            label="Do not record email addresses"
          />
        </div>
      </div>
      <div className={ cn(stl.info,'rounded bg-gray mt-2 mb-4', { 'hidden': !changed })}>
        Below code snippet changes depending on the data recording options chosen.
      </div>
      
      <div className={ cn(stl.instructions, 'mt-8') }>
        <div className="font-semibold flex items-center">
          <CircleNumber text="2" />
          <span>Install SDK</span>
        </div>
        <div className={ stl.siteId }>{ 'Project Key: ' } <span>{ site.projectKey }</span></div>
      </div>

      <div className="ml-10 mb-2 text-sm">
        Paste this snippet <span>{ 'before the ' }</span>
        <span className={ stl.highLight }> { '</head>' } </span>
        <span>{ ' tag of your page.' }</span>
      </div>
      <div className={ cn(stl.snippetsWrapper, 'ml-10') }>
        <button className={ stl.codeCopy } onClick={ () => copyHandler(_snippet) }>{ copied ? 'copied' : 'copy' }</button>
        <Highlight className="html">
          {_snippet}
        </Highlight>
      </div>
      {/* TODO Extract for SaaS */}
      <div className="my-4">You can also setup OpenReplay using <a className="link" href="https://docs.openreplay.com/integrations/google-tag-manager" target="_blank">Google Tag Manager (GTM)</a> or <a className="link" href="https://docs.openreplay.com/integrations/segment" target="_blank">Segment</a>. </div>
    </div>
  )
}

export default connect(state => ({
  site: state.getIn([ 'site', 'instance' ]),
  gdpr: state.getIn([ 'site', 'instance', 'gdpr' ]),
  saving: state.getIn([ 'site', 'saveGDPR', 'loading' ])
}), { editGDPR, saveGDPR })(ProjectCodeSnippet)
