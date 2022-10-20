import { makeAutoObservable } from "mobx"

enum SeverityLevels {
  Low,
  Medium,
  High
}

export default class BugReportStore {
  reportTitle = 'Untitled Report'
  isTitleEdit = false
  severity = SeverityLevels.High

  constructor() {
    makeAutoObservable(this)
  }

  toggleTitleEdit(isEdit: boolean) {
    this.isTitleEdit = isEdit
  }

  setTitle(title: string) {
    this.reportTitle = title
  }
}
