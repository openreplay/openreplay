import { useStore } from "App/mstore";
import React from 'react'
import { observer } from 'mobx-react-lite'
import { Typography, Switch, Button, Space } from "antd";
import { ExportOutlined } from "@ant-design/icons";

const SidePanel = observer(({ onSave, onPreview }: any) => {
  const { uxtestingStore } = useStore();
  return (
    <div className={'flex flex-col gap-2 col-span-1'}>
      <div className={'p-4 bg-white rounded border flex flex-col gap-2'}>
        <Typography.Text strong>Participant Requirements</Typography.Text>
        <div className={'flex justify-between'}>
          <Typography.Text>Mic</Typography.Text>
          <Switch
            checked={uxtestingStore.instance!.requireMic}
            defaultChecked={uxtestingStore.instance!.requireMic}
            onChange={(checked) => uxtestingStore.instance!.setProperty('requireMic', checked)}
            checkedChildren="Yes"
            unCheckedChildren="No"
          />
        </div>
        <div className={'flex justify-between'}>
          <Typography.Text>Camera</Typography.Text>
          <Switch
            checked={uxtestingStore.instance!.requireCamera}
            defaultChecked={uxtestingStore.instance!.requireCamera}
            onChange={(checked) => uxtestingStore.instance!.setProperty('requireCamera', checked)}
            checkedChildren="Yes"
            unCheckedChildren="No"
          />
        </div>
      </div>

      <Button onClick={onPreview}>
        <Space align={'center'}>
          Preview <ExportOutlined rev={undefined} />
        </Space>
      </Button>
      <Button type={'primary'} onClick={onSave}>
        Publish Test
      </Button>
    </div>
  );
});

export default SidePanel