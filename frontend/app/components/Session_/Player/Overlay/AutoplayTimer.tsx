import React, { useEffect, useState } from 'react';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import { useNavigate } from "react-router";
import { Link } from 'UI';
import { Button } from 'antd'
import { session as sessionRoute, withSiteId } from 'App/routes';
import stl from './AutoplayTimer.module.css';
import clsOv from './overlay.module.css';
import AutoplayToggle from 'Shared/AutoplayToggle';
import { useStore } from 'App/mstore';

function AutoplayTimer() {
  const navigate = useNavigate();
  let timer: NodeJS.Timer;
  const [cancelled, setCancelled] = useState(false);
  const [counter, setCounter] = useState(5);
  const { projectsStore, sessionStore } = useStore();
  const nextId = sessionStore.nextId;

  useEffect(() => {
    if (counter > 0) {
      timer = setTimeout(() => {
        setCounter(counter - 1);
      }, 1000);
    }

    if (counter === 0) {
      const siteId = projectsStore.activeSiteId;
      navigate(withSiteId(sessionRoute(nextId), siteId));
    }

    return () => clearTimeout(timer);
  }, [counter]);

  const cancel = () => {
    clearTimeout(timer);
    setCancelled(true);
  };

  if (cancelled) return null;

  return (
    <div className={cn(clsOv.overlay, stl.overlayBg)}>
      <div className="border p-5 shadow-lg bg-white rounded">
        <div className="mb-5">
          Autoplaying next session in <span className="font-medium">{counter}</span> seconds
        </div>

        <div className="flex items-center justify-between">
          <div className="mr-10">
            <AutoplayToggle />
          </div>
          <div className="flex items-center">
            <Button variant="text" onClick={cancel}>
              Cancel
            </Button>
            <div className="px-2" />
            <Link to={sessionRoute(nextId)} disabled={!nextId}>
              <Button type="default">Play Now</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default observer(AutoplayTimer)

