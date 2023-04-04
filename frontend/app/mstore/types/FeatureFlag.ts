import { makeAutoObservable } from "mobx";

export default class FeatureFlag {
  constructor(data?: any) {
    makeAutoObservable(this);
    if (data) {
      this._key = data._key;
      this._condition = data.condition;
      this._author = data.author;
      this._createdAt = data.createdAt;
      this._isEnabled = data.isEnabled;
      this._description = data.description;
      this._isPersist = data.isPersist;
      this._isSingleOption = data.isSingleOption;
    }
  }

  private _isSingleOption: boolean = true

  get isSingleOption(): boolean {
    return this._isSingleOption;
  }

  set isSingleOption(value: boolean) {
    this._isSingleOption = value;
  }

  private _isPersist: boolean = false

  get isPersist(): boolean {
    return this._isPersist;
  }

  set isPersist(value: boolean) {
    this._isPersist = value;
  }

  private _description: string = ''

  get description(): string {
    return this._description;
  }

  set description(value: string) {
    this._description = value;
  }

  private _key: string = ''

  get key(): string {
    return this._key;
  }

  set key(value: string) {
    this._key = value;
  }

  private _condition: string = ''

  get condition(): string {
    return this._condition;
  }

  set condition(value: string) {
    this._condition = value;
  }

  private _author: string = ''

  get author(): string {
    return this._author;
  }

  set author(value: string) {
    this._author = value;
  }

  private _createdAt: string = ''

  get createdAt(): string {
    return this._createdAt;
  }

  set createdAt(value: string) {
    this._createdAt = value;
  }

  private _isEnabled: boolean = false

  get isEnabled(): boolean {
    return this._isEnabled;
  }

  set isEnabled(value: boolean) {
    this._isEnabled = value;
  }
}