// @flow
import React, { PureComponent } from 'react'
import logger from 'logger'

import { MODAL_RECEIVE } from 'config/constants'

import Modal from 'components/base/Modal'

import Body from './Body'

type State = {
  stepId: string,
  isAddressVerified: ?boolean,
  verifyAddressError: ?Error,
}

const INITIAL_STATE = {
  stepId: 'account',
  isAddressVerified: null,
  verifyAddressError: null,
}

class ReceiveModal extends PureComponent<{}, State> {
  state = INITIAL_STATE

  handleReset = () => this.setState({ ...INITIAL_STATE })

  handleStepChange = (stepId: string) => this.setState({ stepId })

  handleChangeAddressVerified = (isAddressVerified: ?boolean, err: ?Error) => {
    if (err && err.name !== 'UserRefusedAddress') {
      logger.critical(err)
    }
    this.setState({ isAddressVerified, verifyAddressError: err })
  }

  render() {
    const { stepId, isAddressVerified, verifyAddressError } = this.state

    const isModalLocked = stepId === 'receive' && isAddressVerified === null

    return (
      <Modal
        name={MODAL_RECEIVE}
        centered
        refocusWhenChange={stepId}
        onHide={this.handleReset}
        preventBackdropClick={isModalLocked}
        render={({ data, onClose }) => (
          <Body
            onClose={onClose}
            stepId={stepId}
            isAddressVerified={isAddressVerified}
            verifyAddressError={verifyAddressError}
            onChangeAddressVerified={this.handleChangeAddressVerified}
            onChangeStepId={this.handleStepChange}
            params={data || {}}
          />
        )}
      />
    )
  }
}

export default ReceiveModal
