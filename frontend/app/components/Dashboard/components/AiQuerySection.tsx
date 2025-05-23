/** Saas:
import React from 'react'
import { Row } from 'antd'
import AiQuery from './DashboardView/AiQuery'
import { useTranslation } from 'react-i18next'

function AiQuerySection() {
  const { t } = useTranslation()
  return (
    <>
      <Row gutter={16} justify="center" className="py-2">
        <AiQuery />
      </Row>
      <div className="flex items-center justify-center w-full text-disabled-text">
        {t('or')}
      </div>
    </>
  )
}

export const panelSize = 900
 */

function AiQuerySection() {
  return null
}

export const panelSize = undefined

export default AiQuerySection
