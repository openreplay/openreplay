import React, { useState } from 'react'
import { connect } from 'react-redux';
import { editGDPR, saveGDPR } from 'Duck/site';
import copy from 'copy-to-clipboard';
import { Checkbox } from 'UI';
import GDPR from 'Types/site/gdpr';
import cn from 'classnames'
import styles from './projectCodeSnippet.module.css'
import Highlight from 'react-highlight'
import Select from 'Shared/Select'
import CodeSnippet from '../../CodeSnippet';

const inputModeOptions = [
  { label: 'Record all inputs', value: 'plain' },
  { label: 'Ignore all inputs', value: 'obscured' },
  { label: 'Obscure all inputs', value: 'hidden' },
];

const inputModeOptionsMap = {}
inputModeOptions.forEach((o, i) => inputModeOptionsMap[o.value] = i)


const ProjectCodeSnippet = props  => {
  const { gdpr, site } = props;
  const [changed, setChanged] = useState(false)
  const [copied, setCopied] = useState(false)

  const codeSnippet = `<!-- OpenReplay Tracking Code for HOST -->
<script>
  var initOpts = {
    projectKey: "PROJECT_KEY",
    ingestPoint: "https://${window.location.hostname}/ingest",
    defaultInputMode: ${inputModeOptionsMap[gdpr.defaultInputMode]},
    obscureTextNumbers: ${gdpr.maskNumbers},
    obscureTextEmails: ${gdpr.maskEmails},
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
  })("//static.openreplay.com/${window.env.TRACKER_VERSION}/openreplay.js",1,0,initOpts,startOpts);
</script>`;

  const saveGDPR = (value) => {
    setChanged(true)
    props.saveGDPR(site.id, GDPR({...value}));
  }

  const onChangeSelect = ({ name, value }) => {
    const { gdpr } = site;
    props.editGDPR({ [ name ]: value });
    saveGDPR({ ...gdpr, [ name ]: value });
  };

  const onChangeOption = ({ target: { name, checked }}) => {
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
      //.replace('XXX', getOptionValues())
      //.replace('HOST', site && site.host);   
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
        <div className="font-semibold mb-2">1. Choose data recording options</div>
        <div className="flex items-center justify-between">
          <Select
            name="defaultInputMode"
            options={ inputModeOptions }
            onChange={ ({ value }) => onChangeSelect({ name: 'defaultInputMode', value: value.value }) }
            placeholder="Default Input Mode"
            value={ inputModeOptions.find(o => o.value === gdpr.defaultInputMode) }
          />

          <Checkbox
            name="maskNumbers"
            type="checkbox"
            checked={ gdpr.maskNumbers }
            onChange={ onChangeOption }
            className="mr-2"
            label="Do not record any numeric text"
          />

          <Checkbox
            name="maskEmails"
            type="checkbox"
            checked={ gdpr.maskEmails }
            onChange={ onChangeOption }
            className="mr-2"
            label="Do not record email addresses"
          />
        </div>
      </div>
      <div className={ cn(styles.info,'rounded bg-gray mt-2 mb-4', { 'hidden': !changed })}>
        Below code snippet changes depending on the data recording options chosen.
      </div>
      <div className={ styles.instructions }>
        <div>
          <span className="font-semibold">2. Paste this snippet </span><span>{ 'before the ' } </span>
          <span className={ styles.highLight }> { '</head>' } </span>
          <span>{ ' tag of your page.' }</span>
        </div>
        <div className={ styles.siteId }>{ 'Project Key: ' } <span>{ site.projectKey }</span></div>
      </div>
      <div className={ styles.snippetsWrapper }>
        <CodeSnippet
          host={ site && site.host }
          projectKey={ site && site.projectKey }
          ingestPoint={`"https://${window.location.hostname}/ingest"`}
          defaultInputMode={ gdpr.defaultInputMode }
          obscureTextNumbers={ gdpr.maskNumbers }
          obscureTextEmails={ gdpr.maskEmails }
        />
      </div>
      <div className="my-4">You can also setup OpenReplay using <a className="link" href="https://docs.openreplay.com/integrations/google-tag-manager" target="_blank">Google Tag Manager (GTM)</a>. </div>
    </div>
  )
}

export default connect(state => ({
  // siteId: state.getIn([ 'site', 'siteId' ]),
  // site: state.getIn([ 'site', 'instance' ]),
  gdpr: state.getIn([ 'site', 'instance', 'gdpr' ]),
  saving: state.getIn([ 'site', 'saveGDPR', 'loading' ])
}), { editGDPR, saveGDPR })(ProjectCodeSnippet)
