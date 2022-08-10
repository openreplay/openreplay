# OpenReplay snippet

Wrapper for the `@openreplay/tracker` that allows its hosting on CDN.


## Scripts

After installing dependencies
```sh
yarn
```
run 
```sh
yarn bundle:or
```
in order to bundle tracker, or
```sh
yarn bundle:assist
```
in order to build it with built-in tracker-assist plugin.

Output files along eith their minified versions can be found under the `dist` folder.

## Snippet

The bundled code can be hosted under a desired CDN.
It works with the following snippet that should be placed on a tracking site:

```js
var initOpts = {
  projectKey: "PROJECT_KEY",
  ingestPoint: "https://<OR_DOMAIN>/ingest",
  defaultInputMode: 0,
  obscureTextNumbers: true,
  obscureTextEmails: true,
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
})("//<CDN_HOST_AND_PATH>/openreplay.js",1,0,initOpts,startOpts);
```



