import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import UserListItem from '../UserListItem';
import { sliceListPerPage, getRE } from 'App/utils';
import { Pagination, NoContent, Loader } from 'UI';
import { useModal } from 'App/components/Modal';
import UserForm from '../UserForm';

function UserList(props) {
    const { userStore } = useStore();
    const loading = useObserver(() => userStore.loading);
    const users = useObserver(() => userStore.list);
    const searchQuery = useObserver(() => userStore.searchQuery);
    const { showModal } = useModal();

    const filterList = (list) => {
        const filterRE = getRE(searchQuery, 'i');
        let _list = list.filter(w => {
            return filterRE.test(w.email) || filterRE.test(w.roleName);
        });
        return _list
    }
    
    const list: any = searchQuery !== '' ? filterList(users) : users;
    const length = list.length;
    
    useEffect(() => {
        userStore.fetchUsers();
    }, []);

    const editHandler = (user) => {
        userStore.initUser(user).then(() => {
            showModal(<UserForm />, { right: true });
        });
    }

    return useObserver(() => (
        <Loader loading={loading}>
            <NoContent show={!loading && length === 0} animatedIcon="empty-state">
                <div className="mt-3 rounded bg-white">
                    <div className="grid grid-cols-12 p-3 border-b font-medium">
                        <div className="col-span-5">Name</div>
                        <div className="col-span-3">Role</div>
                        <div className="col-span-"></div>
                    </div>

                    {sliceListPerPage(list, userStore.page - 1, userStore.pageSize).map((user: any) => (
                        <div key={user.id} className="">
                            <UserListItem user={user} editHandler={() => editHandler(user)} />
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