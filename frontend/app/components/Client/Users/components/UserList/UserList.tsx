import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import UserListItem from '../UserListItem';
import { sliceListPerPage } from 'App/utils';
import { Pagination } from 'UI';

function UserList(props) {
    const { userStore } = useStore();
    const list = useObserver(() => userStore.list);
    const length = list.length;
    
    useEffect(() => {
        userStore.fetchUsers();
    }, []);

    return useObserver(() => (
        <div>
             <div className="mt-3 rounded bg-white">
                <div className="grid grid-cols-12 p-3 font-medium">
                    <div className="col-span-5">Name</div>
                    <div className="col-span-3">Role</div>
                    <div className="col-span-"></div>
                </div>

                {sliceListPerPage(list, userStore.page - 1, userStore.pageSize).map((user: any) => (
                    <div key={user.id} className="">
                        <UserListItem user={user} />
                    </div>
                ))}
            </div>

            <div className="w-full flex items-center justify-center py-6">
                <Pagination
                    page={userStore.page}
                    totalPages={Math.ceil(length / userStore.pageSize)}
                    onPageChange={(page) => userStore.updateKey('page', page)}
                    limit={userStore.pageSize}
                    debounceRequest={100}
                />
            </div>
          
        </div>
    ));
}

export default UserList;