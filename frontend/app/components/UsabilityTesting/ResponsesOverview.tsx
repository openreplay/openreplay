import React from 'react';
import { useStore } from 'App/mstore';
import { numberWithCommas } from 'App/utils';
import { Step } from 'Components/UsabilityTesting/TestEdit';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import { Loader, NoContent, Pagination } from 'UI';
import { Button, Typography, Input } from 'antd';
import { observer } from 'mobx-react-lite';
import { DownOutlined } from '@ant-design/icons';
import { debounce } from 'App/utils'

let debounceUpdate: any = () => {}

const ResponsesOverview = observer(() => {
  const { uxtestingStore } = useStore();
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showAll, setShowAll] = React.useState(false);
  const [taskId, setTaskId] = React.useState<number | undefined>(undefined);

  React.useEffect(() => {
    setTaskId(uxtestingStore.instance?.tasks.filter((t) => t.allowTyping)[0].taskId);
  }, [uxtestingStore.instance?.tasks]);

  React.useEffect(() => {
    if (taskId) {
      void refreshData();
    }
  }, [page, taskId]);

  debounceUpdate = debounce((text: string) => {
    void refreshData(text);
  }, 200)

  const refreshDataQuery = (text: string) => {
    setSearch(text)
    debounceUpdate(text)
  }

  const refreshData = (searchText?: string) =>
    taskId
      ? uxtestingStore.fetchResponses(uxtestingStore.instance!.testId!, taskId, page, searchText || search)
      : null;

  const selectedIndex = uxtestingStore.instance?.tasks.findIndex((task) => task.taskId === taskId)!;
  const task = uxtestingStore.instance?.tasks.find((task) => task.taskId === taskId);

  return (
    <div style={{ width: 900 }} className={'h-screen p-4 bg-white flex flex-col gap-4'}>
      <Typography.Title style={{ marginBottom: 0 }} level={4}>
        Open-ended task responses
      </Typography.Title>
      <div className={'flex flex-col gap-1 relative'}>
        <Typography.Text strong>Select Task / Question</Typography.Text>
        <OutsideClickDetectingDiv onClickOutside={() => setShowAll(false)}>
          <div className={'cursor-pointer'} onClick={() => setShowAll(!showAll)}>
            <Step
              ind={selectedIndex ?? 0}
              title={task?.title ?? 'Title'}
              description={task?.description ?? 'Description'}
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
          </div>
        </OutsideClickDetectingDiv>
        {showAll ? (
          <div
            className={'flex flex-col overflow-auto absolute bottom-0 w-full z-20'}
            style={{ maxHeight: 300, transform: 'translateY(100%)' }}
          >
            {uxtestingStore.instance?.tasks
              .filter((t) => t.taskId !== taskId && t.allowTyping)
              .map((task) => (
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    setShowAll(false);
                    setTaskId(task.taskId);
                  }}
                >
                  <Step
                    hover
                    ind={uxtestingStore.instance?.tasks.findIndex((t) => t.taskId === task.taskId)!}
                    title={task.title}
                    description={task.description}
                  />
                </div>
              ))}
          </div>
        ) : null}
      </div>
      <div className={'grid grid-cols-9 border-b py-1'}>
        <div className={'col-span-1'}>
          <Typography.Text strong># Response</Typography.Text>
        </div>
        <div className={'col-span-2'}>
          <Typography.Text strong>Participant</Typography.Text>
        </div>
        <div className={'col-span-6 flex items-center'}>
          <div style={{ minWidth: 240 }}>
            <Typography.Text strong>Response</Typography.Text>
          </div>
          <Input.Search
            allowClear
            placeholder={'Filter by keyword or participant'}
            onChange={(e) => refreshDataQuery(e.target.value)}
            classNames={{ input: '!border-0 focus:!border-0' }}
            onSearch={() => refreshData()}
          />
        </div>
      </div>
      <Loader loading={uxtestingStore.isLoading}>
        <NoContent
          show={!uxtestingStore.responses[taskId!]?.list?.length}
          title={<div className={'col-span-9'}>No data yet</div>}
        >
          <div>
            {uxtestingStore.responses[taskId!]?.list.map((r, i) => (
              <div className={'grid grid-cols-9 py-2 border-b hover:bg-active-blue'}>
                <div className={'col-span-1'}>{i + 10 * (page - 1) + 1}</div>
                <div className={'col-span-2'}>{r.user_id || 'Anonymous User'}</div>
                <div className={'col-span-6'}>{r.comment}</div>
              </div>
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
