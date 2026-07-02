import { ArrowUpOutlined, FilePdfOutlined } from '@ant-design/icons';
import { Button, Input, Select, Table, Typography } from 'antd';
import React from 'react';

/** Static visual replica of AssistStats ("Co-browsing Reports" drawer, Co-Browse page,
 *  Enterprise + admin only). No interaction — reference only. Real width: 960px. */

const CARDS = [
  { label: 'Total Live Duration', value: '14h 22m', delta: 12, up: true },
  { label: 'Avg Live Duration', value: '6m 48s', delta: 4, up: true },
  { label: 'Total Call Duration', value: '3h 11m', delta: 8, up: false },
  { label: 'Avg Call Duration', value: '2m 02s', delta: 3, up: false },
  { label: 'Total Remote Duration', value: '1h 47m', delta: 21, up: true },
  { label: 'Avg Remote Duration', value: '1m 12s', delta: 6, up: true },
];

function Sparkline() {
  const pts = [8, 12, 9, 16, 11, 19, 14, 22, 17, 25];
  const max = Math.max(...pts);
  const w = 260;
  const h = 60;
  const step = w / (pts.length - 1);
  const line = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - (p / max) * (h - 8)}`)
    .join(' ');
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={area} fill="rgba(57,78,255,0.08)" />
      <path d={line} fill="none" stroke="#394EFF" strokeWidth={1.5} />
    </svg>
  );
}

const MEMBERS = [
  { key: 1, name: 'Jane Mercer', assisted: 142, live: '4h 02m', calls: 38 },
  { key: 2, name: 'Omar Haddad', assisted: 118, live: '3h 21m', calls: 29 },
  { key: 3, name: 'Lena Park', assisted: 97, live: '2h 48m', calls: 22 },
  { key: 4, name: 'Tom Reyes', assisted: 64, live: '1h 55m', calls: 11 },
];

const SESSIONS = [
  { key: 1, date: 'Jun 26, 14:02', members: 'Jane Mercer', live: '8m 12s', call: '3m 04s', remote: '1m 20s' },
  { key: 2, date: 'Jun 26, 12:47', members: 'Omar Haddad, Lena Park', live: '12m 40s', call: '6m 18s', remote: '—' },
  { key: 3, date: 'Jun 26, 11:09', members: 'Lena Park', live: '4m 55s', call: '—', remote: '2m 02s' },
  { key: 4, date: 'Jun 26, 09:33', members: 'Tom Reyes', live: '6m 11s', call: '1m 47s', remote: '—' },
];

function MockAssistStats() {
  return (
    <div className="p-4 bg-white overflow-y-auto h-screen">
      <div className="w-full flex items-center mb-3">
        <Typography.Title style={{ marginBottom: 0 }} level={4}>
          Co-browsing Reports
        </Typography.Title>
        <div className="ml-auto flex items-center gap-2">
          <Input.Search placeholder="Search user" style={{ width: 180 }} size="small" />
          <Select
            size="small"
            value="24h"
            style={{ width: 130 }}
            options={[
              { value: '24h', label: 'Last 24 Hours' },
              { value: '7d', label: 'Last 7 Days' },
            ]}
          />
          <Button size="small" icon={<FilePdfOutlined rev={undefined} />} />
        </div>
      </div>

      {/* 6 stat cards */}
      <div className="w-full grid grid-cols-3 gap-2">
        {CARDS.map((c) => (
          <div key={c.label} className="bg-white rounded-sm border">
            <div className="pt-2 px-2">
              <Typography.Text strong>{c.label}</Typography.Text>
              <div className="flex gap-1 items-center">
                <Typography.Title style={{ marginBottom: 0 }} level={5}>
                  {c.value}
                </Typography.Title>
                <div
                  className={`flex items-center gap-1 ${
                    c.up ? 'text-green' : 'text-red'
                  }`}
                >
                  <ArrowUpOutlined rev={undefined} rotate={c.up ? 0 : 180} />
                  {c.delta}%
                </div>
              </div>
            </div>
            <Sparkline />
          </div>
        ))}
      </div>

      {/* Team members */}
      <div className="w-full mt-3">
        <Typography.Text strong>Top Team Members</Typography.Text>
        <Table
          className="mt-1"
          size="small"
          pagination={false}
          dataSource={MEMBERS}
          columns={[
            { title: 'Member', dataIndex: 'name' },
            { title: 'Sessions Assisted', dataIndex: 'assisted' },
            { title: 'Live Duration', dataIndex: 'live' },
            { title: 'Calls', dataIndex: 'calls' },
          ]}
        />
      </div>

      {/* Sessions table */}
      <div className="w-full mt-3">
        <div className="flex items-center mb-1">
          <Typography.Text strong>Sessions</Typography.Text>
          <Button size="small" className="ml-auto">
            Export CSV
          </Button>
        </div>
        <Table
          size="small"
          pagination={{ pageSize: 4, total: 128, current: 1 }}
          dataSource={SESSIONS}
          columns={[
            { title: 'Date', dataIndex: 'date' },
            { title: 'Team Members', dataIndex: 'members' },
            { title: 'Live Duration', dataIndex: 'live' },
            { title: 'Call Duration', dataIndex: 'call' },
            { title: 'Remote Duration', dataIndex: 'remote' },
          ]}
        />
      </div>
    </div>
  );
}

export default MockAssistStats;
