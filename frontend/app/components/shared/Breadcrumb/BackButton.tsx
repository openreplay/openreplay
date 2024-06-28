import React from 'react';
import { Button } from 'antd';
import { useHistory } from 'react-router-dom';
import { LeftOutlined } from '@ant-design/icons';

function BackButton({ siteId }) {
    const history = useHistory();

    const handleBackClick = () => {
        history.goBack();
    };

    return (
        <Button type="text" onClick={handleBackClick} icon={<LeftOutlined />} className='px-1 pe-2 me-2 gap-1' >
            Back
        </Button>
    );
}

export default BackButton;
