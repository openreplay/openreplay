import { makeAutoObservable } from "mobx"
import { BugReportPdf, ReportDefaults, Step } from 'Components/Session_/BugReport/types'

export enum SeverityLevels {
  Low,
  Medium,
  High
}

export default class BugReportStore {
  reportTitle = 'Untitled Report'
  comment = ''
  severity = SeverityLevels.High

  isCommentEdit = false
  isTitleEdit = false

  bugReport: Partial<BugReportPdf>
  sessionEventSteps: Step[] = []

  constructor() {
    makeAutoObservable(this)
  }

  toggleTitleEdit(isEdit: boolean) {
    this.isTitleEdit = isEdit
  }

  setTitle(title: string) {
    this.reportTitle = title

    this.bugReport = Object.assign(this.bugReport, { title: this.reportTitle })
  }

  setSeverity(severity: SeverityLevels) {
    this.severity = severity

    this.bugReport = Object.assign(this.bugReport, { severity: this.severity })
  }

  toggleCommentEditing(isEdit: boolean) {
    this.isCommentEdit = isEdit
  }

  setComment(comment: string) {
    this.comment = comment

    this.bugReport = Object.assign(this.bugReport, { comment: this.comment.length > 0 ? this.comment : undefined })
  }

  updateReportDefaults(defaults: ReportDefaults) {
    this.bugReport = Object.assign(this.bugReport || {}, defaults)
  }

  setSteps(steps: Step[]) {
    this.sessionEventSteps = steps
  }
}
