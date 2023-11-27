import React from 'react';
import { useStore } from 'App/mstore';
import { numberWithCommas } from 'App/utils';
import { Step } from 'Components/UsabilityTesting/TestEdit';
import { Loader, NoContent, Pagination } from 'UI';
import { Button, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import { DownOutlined } from '@ant-design/icons';

const ResponsesOverview = observer(() => {
  const { uxtestingStore } = useStore();
  const [page, setPage] = React.useState(1);
  const [showAll, setShowAll] = React.useState(false);
  const [taskId, setTaskId] = React.useState(uxtestingStore.instance?.tasks[0].taskId);

  React.useEffect(() => {
    // @ts-ignore
    uxtestingStore.fetchResponses(uxtestingStore.instance?.testId, taskId, page);
  }, [page, taskId]);

  const selectedIndex = uxtestingStore.instance?.tasks.findIndex((task) => task.taskId === taskId)!;
  const task = uxtestingStore.instance?.tasks.find((task) => task.taskId === taskId);
  return (
    <div style={{ width: 900 }} className={'h-screen p-4 bg-white flex flex-col gap-4'}>
      <Typography.Title style={{ marginBottom: 0 }} level={4}>
        Open-ended task responses
      </Typography.Title>
      <div className={'flex flex-col gap-1'}>
        <Typography.Text strong>Select Task / Question</Typography.Text>
        <Step
          ind={selectedIndex}
          title={task!.title}
          description={task!.description}
          buttons={
            <div className={'self-center'}>
              <Button
                onClick={() => setShowAll(!showAll)}
                icon={<DownOutlined rotate={showAll ? 180 : 0} rev={undefined} />}
                size={'small'}
              />
            </div>
          }
        />
        {showAll
          ? uxtestingStore.instance?.tasks
              .filter((t) => t.taskId !== taskId && t.allow_typing)
              .map((task) => (
                <div className="cursor-pointer" onClick={() => setTaskId(task.taskId)}>
                  <Step
                    ind={uxtestingStore.instance?.tasks.findIndex((t) => t.taskId === task.taskId)!}
                    title={task.title}
                    description={task.description}
                  />
                </div>
              ))
          : null}
      </div>
      <div className={'grid grid-cols-9 border-b'}>
        <div className={'col-span-1'}>
          <Typography.Text strong># Response</Typography.Text>
        </div>
        <div className={'col-span-2'}>
          <Typography.Text strong>Participant</Typography.Text>
        </div>
        <div className={'col-span-6'}>
          <Typography.Text strong>Response (add search text)</Typography.Text>
        </div>
      </div>
      <Loader loading={uxtestingStore.isLoading}>
        <NoContent
          show={!uxtestingStore.responses[taskId!]?.list?.length}
          title={<div className={'col-span-9'}>No data yet</div>}
        >
          <div className={'grid grid-cols-9 border-b'}>
            {uxtestingStore.responses[taskId!]?.list.map((r, i) => (
              <>
                <div className={'col-span-1'}>{i + 10 * (page - 1) + 1}</div>
                <div className={'col-span-2'}>{r.user_id || 'Anonymous User'}</div>
                <div className={'col-span-6'}>{r.comment}</div>
              </>
            ))}
          </div>
          <div className={'p-2 flex items-center justify-between'}>
            <div className={'text-disabled-text'}>
              Showing <span className="font-medium">{(page - 1) * 10 + 1}</span> to{' '}
              <span className="font-medium">
                {(page - 1) * 10 + uxtestingStore.responses[taskId!]?.list.length}
              </span>{' '}
              of{' '}
              <span className="font-medium">
                {numberWithCommas(uxtestingStore.responses[taskId!]?.total)}
              </span>{' '}
              replies.
            </div>
            <Pagination
              page={page}
              totalPages={Math.ceil(uxtestingStore.responses[taskId!]?.total / 10)}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </NoContent>
      </Loader>
    </div>
  );
});

export default ResponsesOverview;
