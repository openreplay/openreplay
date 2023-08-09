import React from 'react';
import Logo from 'App/layout/Logo';
import TopRight from 'App/layout/TopRight';
import ProjectDropdown from 'Shared/ProjectDropdown';
import { Layout } from 'antd';

const { Header } = Layout;

function TopHeader() {
  return (
    <Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        padding: '0 15px',
        display: 'flex',
        alignItems: 'center',
        height: '60px'
      }}
      className='justify-between bg-gray-lightest'
    >
      <div className='flex items-center'>
        <Logo siteId={1} />
        <div className='mx-1' />
        <ProjectDropdown />
      </div>

      <TopRight />
    </Header>
  );
}

export default TopHeader;