import React from 'react';

class Crisp extends React.Component {
  componentDidMount () {
    if (!!window.$crisp) {
      window.$crisp.push(['do', 'chat:show']);
    } else {
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = "adc74d6f-70c5-4947-bdf1-c359f3becfaf";

      (function() {
        var d = document;
        var s = d.createElement("script");

        s.src = "https://client.crisp.chat/l.js";
        s.async = 1;        
        d.getElementById("crisp-chat").appendChild(s);
      })();
    }    
  }

  componentWillUnmount() {
    window.$crisp.push(['do', 'chat:hide']);
  }

  render () {
    return null;
  }
}

export default Crisp;