import React from 'react';
import {connect} from "react-redux";
import {updateModule} from "Duck/user";
import {Space} from "antd";

const Logo = require('../../svg/logo-gray.svg').default;

function VersionTag({version}: { version: string }) {
    return (
        <Space>
            <img src={Logo} width={20}/>
            <div>{version}</div>
        </Space>
    );
}

export default connect((state: any) => ({
    version: state.getIn(['user', 'account', 'versionNumber'])
}), {updateModule})(VersionTag)
