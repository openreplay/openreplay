import { useObserver } from 'mobx-react-lite';
import React from 'react';
import { Input } from 'UI';
import cn from 'classnames';
import { useStore } from 'App/mstore';

interface Props {
}

function DashboardForm(props: Props) {
    const { dashboardStore } = useStore();
    const dashboard = dashboardStore.dashboardInstance;

    const write = ({ target: { value, name } }) => dashboard.update({ [ name ]: value })
    const writeRadio = ({ target: { value, name } }) => {
        dashboard.update({ [name]: value === 'team' });
    }

    return useObserver(() => (
        <div className="mb-8 grid grid-cols-2 gap-8">
            <div className="form-field flex flex-col">
                <label htmlFor="name" className="font-medium mb-2">Title</label>
                <Input type="text" autoFocus name="name" onChange={write} value={dashboard.name} maxLength={100} />
            </div>

            <div className="form-field flex flex-col">
                <label htmlFor="name" className="font-medium mb-2">Visibility and Editing</label>

                <div className="flex items-center py-2">
                    <label className="inline-flex items-center mr-6">
                        <input
                            type="radio"
                            className="form-radio h-5 w-5"
                            name="isPublic"
                            value="team"
                            checked={dashboard.isPublic}
                            onChange={writeRadio}
                        />
                        <span className={cn("ml-2", { 'color-teal' : dashboard.isPublic})}>Team</span>
                    </label>

                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            className="form-radio h-5 w-5"
                            name="isPublic"
                            value="personal"
                            checked={!dashboard.isPublic}
                            onChange={writeRadio}
                        />
                        <span className={cn("ml-2", { 'color-teal' : !dashboard.isPublic})}>Personal</span>
                    </label>
                </div>
            </div>
        </div>
    ));
}

export default DashboardForm;
