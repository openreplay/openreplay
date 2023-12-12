export const bgStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0, 0, 0, 0.40)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 999999,
  fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
}

export const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
  alignItems: 'center',
  padding: '1.5rem',
  borderRadius: '2px',
  border: '1px solid #D9D9D9',
  background: '#FFF',
  width: '22rem',
}
export const containerWidgetStyle = {
  display: 'flex',
  'flex-direction': 'column',
  gap: 'unset',
  'align-items': 'center',
  padding: 'unset',
  fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
  'border-radius': '2px',
  border: '1px solid #D9D9D9',
  background: 'rgba(255, 255, 255, 0.75)',
  width: '22rem',
}

export const titleStyle = {
  fontFamily: 'Verdana, sans-serif',
  fontSize: '1.25rem',
  fontStyle: 'normal',
  fontWeight: '500',
  lineHeight: '1.75rem',
  color: 'rgba(0, 0, 0, 0.85)',
}

export const descriptionStyle = {
  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
  padding: '1.25rem 0rem',
  color: 'rgba(0, 0, 0, 0.85)',
  fontFamily: 'Verdana, sans-serif',
  fontSize: '13px',
  fontStyle: 'normal',
  fontWeight: '400',
  lineHeight: 'auto',
  whiteSpace: 'pre-wrap',
}

export const noticeStyle = {
  color: 'rgba(0, 0, 0, 0.85)',
  fontFamily: 'Verdana, sans-serif',
  fontSize: '0.875rem',
  fontStyle: 'normal',
  fontWeight: '400',
  lineHeight: '1.375rem',
}

export const buttonStyle = {
  display: 'flex',
  padding: '0.4rem 0.9375rem',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '0.625rem',
  borderRadius: '0.25rem',
  border: '1px solid #394EFF',
  background: '#394EFF',
  boxShadow: '0px 2px 0px 0px rgba(0, 0, 0, 0.04)',
  color: '#FFF',
  textAlign: 'center',
  fontFamily: 'Verdana, sans-serif',
  fontSize: '1rem',
  fontStyle: 'normal',
  fontWeight: '500',
  lineHeight: '1.5rem',
  cursor: 'pointer',
}

export const sectionTitleStyle = {
  fontFamily: 'Verdana, sans-serif',
  fontSize: '13px',
  fontWeight: '500',
  lineHeight: 'auto',
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
  cursor: 'pointer',
}

export const contentStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '0.625rem',
  fontSize: '13px',
  lineHeight: 'auto',
}

// New widget styles
export const titleWidgetStyle = {
  padding: '0.5rem',
  gap: '0.5rem',
  fontFamily: 'Verdana, sans-serif',
  fontSize: '16px',
  fontStyle: 'normal',
  fontWeight: '500',
  lineHeight: 'auto',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  borderRadius: '2px',
  background: 'rgba(0, 0, 0, 0.75)',
  boxSizing: 'border-box',
}

export const descriptionWidgetStyle = {
  boxSizing: 'border-box',
  display: 'block',
  width: '100%',
  borderBottom: '1px solid #D9D9D9',
  background: '#FFF',
  padding: '0.65rem',
  alignSelf: 'stretch',
  color: '#000',
  fontFamily: 'Verdana, sans-serif',
  // fontSize: '0.875rem',
  fontStyle: 'normal',
  fontWeight: '400',
  // lineHeight: '1.375rem',
}

export const endSectionStyle = {
  ...descriptionWidgetStyle,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.625rem',
}

export const symbolIcon = {
  fontSize: '1.25rem',
  fontWeight: '500',
  cursor: 'pointer',
  color: '#394EFF',
}

export const buttonWidgetStyle = {
  display: 'flex',
  padding: '0.4rem 0.9375rem',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '0.625rem',
  borderRadius: '0.25rem',
  border: '1px solid #394EFF',
  background: '#394EFF',
  boxShadow: '0px 2px 0px 0px rgba(0, 0, 0, 0.04)',
  color: '#FFF',
  textAlign: 'center',
  fontFamily: 'Verdana, sans-serif',
  fontSize: '1rem',
  fontStyle: 'normal',
  fontWeight: '500',
  lineHeight: '1.5rem',
  width: '100%',
  boxSizing: 'border-box',
  cursor: 'pointer',
}

export const stopWidgetStyle = {
  marginTop: '1rem',
  marginBottom: '1rem',
  cursor: 'pointer',
  display: 'block',
  fontWeight: '500',
  fontSize: '13px!important',
  lineHeight: 'auto',
}

export const paginationStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.5rem',
  width: '100%',
  boxSizing: 'border-box',
}

export const taskNumberActive = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '6.25em',
  outline: '1px solid #394EFF',
  fontSize: '13px',
  height: '24px',
  width: '24px',
}
export const taskNumberDone = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '6.25em',
  outline: '1px solid #D2DFFF',
  boxShadow: '0px 2px 0px 0px rgba(0, 0, 0, 0.04)',
  background: '#D2DFFF',
  fontSize: '13px',
  height: '24px',
  width: '24px',
}

export const taskDescriptionCard = {
  borderRadius: '0.375rem',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  background: '#F5F7FF',
  boxShadow: '0px 2px 0px 0px rgba(0, 0, 0, 0.04)',
  display: 'flex',
  flexDirection: 'column',
  padding: '0.625rem 0.9375rem',
  gap: '0.5rem',
  alignSelf: 'stretch',
}

export const taskTextStyle = {
  fontWeight: 'bold',
}

export const taskDescriptionStyle = {
  fontSize: '13px',
  lineHeight: 'auto',
}

export const taskButtonStyle = {
  marginRight: '0.5rem',
  cursor: 'pointer',
  color: '#394EFF',
  textAlign: 'center',
  fontFamily: 'Verdana, sans-serif',
  fontSize: '13px',
  fontStyle: 'normal',
  fontWeight: '500',
  lineHeight: 'auto',
}
export const taskButtonBorderedStyle = {
  ...taskButtonStyle,
  display: 'flex',
  padding: '0.25rem 0.9375rem',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '0.5rem',
  borderRadius: '0.25rem',
  border: '1px solid #394EFF',
}

export const taskButtonsRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  boxSizing: 'border-box',
}

export const spinnerStyles = {
  border: '4px solid rgba(255, 255, 255, 0.4)',
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  borderLeftColor: '#fff',
  animation: 'spin 0.5s linear infinite',
}
