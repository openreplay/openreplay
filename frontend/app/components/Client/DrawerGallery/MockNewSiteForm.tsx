import { Segmented, Button, Input } from 'antd';
import { Trash2 } from 'lucide-react';
import React from 'react';

/** Static visual replica of Client/Sites/NewSiteForm (the "Add Project" drawer).
 *  No interaction — reference only. Real width: 350px. */
function MockNewSiteForm() {
  return (
    <div className="bg-white h-screen overflow-y-auto" style={{ width: 350 }}>
      <h3 className="p-5 text-2xl">New Project</h3>
      <div className="px-5 pb-5">
        <div className="mb-6">
          <label className="block mb-1.5 font-medium">Name</label>
          <Input placeholder="Ex. openreplay" value="Checkout Web" readOnly />
        </div>
        <div className="mb-6">
          <label className="block mb-1.5 font-medium">Project Type</label>
          <Segmented
            value="web"
            options={[
              { value: 'web', label: 'Web' },
              { value: 'ios', label: 'Mobile' },
            ]}
          />
        </div>
        <div className="mt-6 flex justify-between">
          <Button type="primary" className="mr-2">
            Add
          </Button>
          <Button type="text" disabled>
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MockNewSiteForm;
