import { makeAutoObservable } from 'mobx';
import { BugReportPdf, ReportDefaults, Step, Activity } from 'Components/Session_/BugReport/types';
import { SubItem } from 'App/components/Session_/BugReport/components/StepsComponents/SubModalItems';

export enum SeverityLevels {
  Low,
  Medium,
  High,
}

export default class BugReportStore {
  reportTitle = 'Untitled Report';
  comment = '';
  severity = SeverityLevels.High;

  isCommentEdit = false;
  isTitleEdit = false;
  isSubStepModalOpen = false;

  bugReport: Partial<BugReportPdf>;
  sessionEventSteps: Step[] = [];
  chosenEventSteps: Step[] = [];
  subModalType: 'note' | 'network' | 'error';
  targetStep: string
  pickedSubItems: Record<string, Map<string, SubItem>> = {}

  constructor() {
    makeAutoObservable(this);
  }

  clearStore() {
    this.reportTitle = 'Untitled Report';
    this.comment = '';
    this.severity = SeverityLevels.High;

    this.isCommentEdit = false;
    this.isTitleEdit = false;

    this.bugReport = undefined;
    this.sessionEventSteps = [];
    this.chosenEventSteps = [];
    this.subModalType = undefined;
    this.isSubStepModalOpen = false;
    this.targetStep = undefined;
    this.pickedSubItems = {};
  }

  toggleTitleEdit(isEdit: boolean) {
    this.isTitleEdit = isEdit;
  }

  setTitle(title: string) {
    if (title.length < 40) {
      this.reportTitle = title;
      this.bugReport = Object.assign(this.bugReport, { title: this.reportTitle });
    }
  }

  setSeverity(severity: SeverityLevels) {
    this.severity = severity;

    this.bugReport = Object.assign(this.bugReport, { severity: this.severity });
  }

  toggleCommentEditing(isEdit: boolean) {
    this.isCommentEdit = isEdit;
  }

  setComment(comment: string) {
    this.comment = comment;

    this.bugReport = Object.assign(this.bugReport, {
      comment: this.comment.length > 0 ? this.comment : undefined,
    });
  }

  updateReportDefaults(defaults: ReportDefaults) {
    this.bugReport = Object.assign(this.bugReport || {}, defaults);
  }

  composeReport(activity: Activity) {
    const reportObj = {
      title: this.reportTitle,
      comment: this.comment,
      severity: this.severity,
      steps: this.chosenEventSteps,
      activity
    }
    this.bugReport = Object.assign(this.bugReport, reportObj)

    return this.bugReport
  }

  setDefaultSteps(steps: Step[]) {
    this.sessionEventSteps = steps;
  }

  setSteps(steps: Step[]) {
    this.chosenEventSteps = steps.map(step => ({ ...step, substeps: undefined }));
    this.pickedSubItems = {};
  }

  removeStep(step: Step) {
    this.chosenEventSteps = this.chosenEventSteps.filter(
      (chosenStep) => chosenStep.key !== step.key
    );
    if (this.pickedSubItems[step.key]) this.pickedSubItems[step.key] = new Map()
  }

  toggleSubStepModal(isOpen: boolean, type: 'note' | 'network' | 'error', stepKey?: string) {
    this.isSubStepModalOpen = isOpen;
    this.subModalType = type;
    this.targetStep = stepKey
    if (!this.pickedSubItems[this.targetStep]) this.pickedSubItems[this.targetStep] = new Map()
  }

  toggleSubItem(isAdded: boolean, item: SubItem) {
    if (isAdded) {
      this.pickedSubItems[this.targetStep].set(item.key, item)
    } else {
      this.pickedSubItems[this.targetStep].delete(item.key)
    }
  }

  isSubItemChecked(item: SubItem) {
    return this.pickedSubItems[this.targetStep]?.get(item.key) !== undefined
  }

  saveSubItems() {
    const targetIndex = this.chosenEventSteps.findIndex(step => step.key === this.targetStep)
    const eventStepsCopy = this.chosenEventSteps
    const step = this.chosenEventSteps[targetIndex]
    if (this.pickedSubItems[this.targetStep].size > 0) {
      step.substeps = Array.from(this.pickedSubItems[this.targetStep], ([name, value]) => ({ ...value }));
    }
    eventStepsCopy[targetIndex] = step

    return this.chosenEventSteps = eventStepsCopy
  }

  resetSteps() {
    this.chosenEventSteps = [];
  }
}
