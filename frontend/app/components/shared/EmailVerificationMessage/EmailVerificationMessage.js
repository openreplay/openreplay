import React from 'react'
import { connect } from 'react-redux';
import { Popup } from 'UI'
import { resendEmailVerification } from 'Duck/user'
import { toast } from 'react-toastify';

function EmailVerificationMessage(props) {
  const { email } = props;
  const send = () => {
    props.resendEmailVerification(email).then(function() {
      toast.success(`Verification email sent to ${email}`);
    })
  }
  return (
    <Popup
      size="tiny"
      inverted
      position="top center"
      trigger={
        <div
          className="mt-3 px-3 rounded-2xl font-medium"
          style={{ paddingTop: '3px', height: '28px', backgroundColor: 'rgba(255, 239, 239, 1)', border: 'solid thin rgba(221, 181, 181, 1)' }}
        >
          <span>Please, verify your email.</span> <a href="#" className="link" onClick={send}>Resend</a>
        </div>
      }
      content={
        `We've sent a verification email to "${email}" please follow the instructions in it to use OpenReplay uninterruptedly.`
      }
    />
  )
}

export default connect(null, { resendEmailVerification })(EmailVerificationMessage)
