import { Button, Card } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { Icon } from 'UI';

function AccessError() {
  const { t } = useTranslation();
  return (
    <div className="w-full h-full block ">
      <div className="flex bg-white border-b text-center justify-center py-4">
        <a href="https://openreplay.com/spot" target="_blank" rel="noreferrer">
          <Button
            type="text"
            className="orSpotBranding flex gap-1 items-center"
            size="large"
          >
            <Icon size={40} name="integrations/openreplay" />
            <div className="flex flex-row gap-2 items-center text-start">
              <div className="text-3xl font-semibold ">
                {t('OpenReplay Spot')}
              </div>
            </div>
          </Button>
        </a>
      </div>
      <Card className="w-1/2 mx-auto rounded-b-full shadow-sm text-center flex flex-col justify-center items-center z-50 min-h-60">
        <div className="font-semibold text-xl">
          {t('The Spot link has expired.')}
        </div>
        <p className="text-lg">
          {t('Contact the person who shared it to re-spot.')}
        </p>
      </Card>
      <div className="rotate-180 -z-10 w-fit mx-auto -mt-5 hover:mt-2 transition-all ease-in-out hover:rotate-0 hover:transition-all hover:ease-in-out duration-500 hover:duration-150">
        <AnimatedSVG name={ICONS.NO_RECORDINGS} size={60} />
      </div>
    </div>
  );
}

export default AccessError;
