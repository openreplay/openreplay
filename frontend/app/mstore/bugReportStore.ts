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
  pickedSubItems: Map<string, SubItem> = new Map()

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
    this.pickedSubItems = new Map();
  }

  toggleTitleEdit(isEdit: boolean) {
    this.isTitleEdit = isEdit;
  }

  setTitle(title: string) {
    this.reportTitle = title;

    this.bugReport = Object.assign(this.bugReport, { title: this.reportTitle });
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

    console.log(JSON.stringify(this.bugReport, undefined, 2))
    return this.bugReport
  }

  setDefaultSteps(steps: Step[]) {
    this.sessionEventSteps = steps;
  }

  setSteps(steps: Step[]) {
    this.chosenEventSteps = steps.map(step => ({ ...step, substeps: undefined }));
    this.pickedSubItems = new Map();
  }

  removeStep(step: Step) {
    this.chosenEventSteps = this.chosenEventSteps.filter(
      (chosenStep) => chosenStep.key !== step.key
    );
  }

  toggleSubStepModal(isOpen: boolean, type: 'note' | 'network' | 'error', stepKey?: string) {
    this.isSubStepModalOpen = isOpen;
    this.subModalType = type;
    this.targetStep = stepKey
  }

  toggleSubItem(isAdded: boolean, item: SubItem) {
    if (isAdded) {
      this.pickedSubItems.set(item.key, item)
    } else {
      this.pickedSubItems.delete(item.key)
    }
  }

  isSubItemChecked(item: SubItem) {
    return this.pickedSubItems?.get(item.key) !== undefined
  }

  saveSubItems() {
    const targetIndex = this.chosenEventSteps.findIndex(step => step.key === this.targetStep)
    const eventStepsCopy = this.chosenEventSteps
    const step = this.chosenEventSteps[targetIndex]
    if (this.pickedSubItems.size > 0) {
      step.substeps = Array.from(this.pickedSubItems, ([name, value]) => ({ ...value }));
    }
    eventStepsCopy[targetIndex] = step

    return this.chosenEventSteps = eventStepsCopy
  }

  resetSteps() {
    this.chosenEventSteps = [];
  }
}
