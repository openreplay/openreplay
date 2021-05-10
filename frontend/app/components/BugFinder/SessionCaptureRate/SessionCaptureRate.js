import React, { useState } from 'react'
import { Input, Slider, Button, Popup, CircularLoader } from 'UI';
import { saveCaptureRate, editCaptureRate } from 'Duck/watchdogs';
import { connect } from 'react-redux';
import stl from './sessionCaptureRate.css';

function isPercent(val) {
  if (isNaN(+val)) return false;
  if (+val > 100 || +val < 0) return false;
  return true;
}

const SessionCaptureRate = props => {
  const { captureRate, saveCaptureRate, editCaptureRate, loading, onClose } = props;
  const _sampleRate = captureRate.get('rate');
  if (_sampleRate == null) return null;

  const [sampleRate, setSampleRate] = useState(_sampleRate)

  const captureAll = captureRate.get('captureAll');

  const onSampleRateChange = (e) => {
    saveCaptureRate({ rate: sampleRate, captureAll: captureAll }).then(onClose);
  }
  const onCaptureAllChange = () => saveCaptureRate({ rate: sampleRate, captureAll: !captureAll });

  return (
    <div>
      <Popup
        trigger={
          <Slider
            name="sessionsLive"
            onChange={ onCaptureAllChange }
            checked={ captureAll }
            className={stl.customSlider}
            label="Capture All"
          />
        }
        content={ `Capture All` }
        size="tiny"
        inverted
        position="top center"
      />
      { !captureAll && (
        <div className="flex items-center justify-between mt-4 border-t pt-4">
          <Input            
            icon="percent"
            name="sampleRate"
            disabled={ captureAll }
            value={ captureAll ? '100' : sampleRate }            
            onChange={ ({ target: { value }}) => isPercent(value) && setSampleRate(+value) }            
            size="small"
            className={stl.inputField}
          />
          <div>
            <Button
              primary
              onClick={onSampleRateChange}
              disabled={loading}
            >
              <CircularLoader loading={ loading } style={ { marginRight: '8px' } } />
              Apply
            </Button>
            <Button outline onClick={onClose}>
              Cancel
            </Button>
          </div>      
        </div>
      )}
    </div>
  )
}

export default connect(state => ({
  currentProjectId: state.getIn([ 'user', 'siteId' ]),
  captureRate: state.getIn(['watchdogs', 'captureRate']),
  loading: state.getIn(['watchdogs', 'savingCaptureRate', 'loading']),
}), {
  saveCaptureRate, editCaptureRate
})(SessionCaptureRate);