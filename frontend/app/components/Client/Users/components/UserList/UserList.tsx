import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import UserListItem from '../UserListItem';
import { sliceListPerPage, getRE } from 'App/utils';
import { Pagination, NoContent, Loader } from 'UI';
import { useModal } from 'App/components/Modal';
import UserForm from '../UserForm';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

interface Props {
    isOnboarding?: boolean;
    isEnterprise?: boolean;
}
function UserList(props: Props) {
    const { isEnterprise = false, isOnboarding = false } = props;
    const { userStore } = useStore();
    const loading = useObserver(() => userStore.loading);
    const users = useObserver(() => userStore.list);
    const searchQuery = useObserver(() => userStore.searchQuery);
    const { showModal } = useModal();

    const filterList = (list) => {
        const filterRE = getRE(searchQuery, 'i');
        let _list = list.filter((w) => {
            return filterRE.test(w.email) || filterRE.test(w.roleName);
        });
        return _list;
    };

    const list: any = searchQuery !== '' ? filterList(users) : users;
    const length = list.length;

    useEffect(() => {
        userStore.fetchUsers();
    }, []);

    const editHandler = (user: any) => {
        userStore.initUser(user).then(() => {
            showModal(<UserForm />, { right: true });
        });
    };

    return useObserver(() => (
        <Loader loading={loading}>
            <NoContent
                title={
                    <div className="flex flex-col items-center justify-center">
                    <AnimatedSVG name={ICONS.NO_AUDIT_TRAIL} size={80} />
                    <div className="text-center text-gray-600 my-4">No matching results.</div>
                    </div>
                }
                size="small"
                show={!loading && length === 0}
            >
                <div className="mt-3 rounded bg-white">
                    <div className="grid grid-cols-12 py-3 px-5 font-medium">
                        <div className="col-span-5">Name</div>
                        <div className="col-span-3">Role</div>
                        {!isOnboarding && <div className="col-span-2">Created On</div>}
                        <div className="col-span-2"></div>
                    </div>

                    {sliceListPerPage(list, userStore.page - 1, userStore.pageSize).map((user: any) => (
                        <div key={user.id} className="">
                            <UserListItem
                                user={user}
                                editHandler={() => editHandler(user)}
                                generateInvite={(e: any) => {
                                    e.stopPropagation();
                                    userStore.generateInviteCode(user.userId);
                                }}
                                copyInviteCode={(e) => {
                                    e.stopPropagation();
                                    userStore.copyInviteCode(user.userId);
                                }}
                                isEnterprise={isEnterprise}
                                isOnboarding={isOnboarding}
                            />
                        </div>
                    ))}
                </div>

                <div className="w-full flex items-center justify-center py-10">
                    <Pagination
                        page={userStore.page}
                        totalPages={Math.ceil(length / userStore.pageSize)}
                        onPageChange={(page) => userStore.updateKey('page', page)}
                        limit={userStore.pageSize}
                        debounceRequest={100}
                    />
                </div>
            </NoContent>
        </Loader>
    ));
}

export default UserList;
