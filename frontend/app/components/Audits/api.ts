import { client } from 'App/mstore';

import {
  ArtifactKind,
  ArtifactLink,
  Audit,
  AuditCounts,
  AuditList,
  CountsParams,
  CreateAuditRequest,
  DeleteResult,
  Estimate,
  ListAuditsParams,
  PatchAuditRequest,
  Report,
} from './types';

// `/audits` is in the API client's `newApiUrls`, so these land on /v2/{projectId}/audits.
const base = (projectId: string | number) => `/${projectId}/audits`;

const toJson = <T>(response: Response): Promise<T> =>
  response.json() as Promise<T>;

const defined = <T extends object>(params?: T): Partial<T> | undefined => {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
  ) as Partial<T>;
};

export function listAudits(
  projectId: string | number,
  params?: ListAuditsParams,
): Promise<AuditList> {
  return client.get(base(projectId), defined(params)).then(toJson<AuditList>);
}

export function auditCounts(
  projectId: string | number,
  params?: CountsParams,
): Promise<AuditCounts> {
  return client
    .get(`${base(projectId)}/counts`, defined(params))
    .then(toJson<AuditCounts>);
}

export function estimateAudit(
  projectId: string | number,
  body: CreateAuditRequest,
  signal?: AbortSignal,
): Promise<Estimate> {
  return client
    .post(`${base(projectId)}/estimate`, body, undefined, undefined, signal)
    .then(toJson<Estimate>);
}

export function createAudit(
  projectId: string | number,
  body: CreateAuditRequest,
): Promise<Audit> {
  return client.post(base(projectId), body).then(toJson<Audit>);
}

export function getAudit(
  projectId: string | number,
  auditId: string,
): Promise<Audit> {
  return client.get(`${base(projectId)}/${auditId}`).then(toJson<Audit>);
}

/** Only `name` and `notify`; any other key is a 400. */
export function patchAudit(
  projectId: string | number,
  auditId: string,
  body: PatchAuditRequest,
): Promise<Audit> {
  return client
    .patch(`${base(projectId)}/${auditId}`, body)
    .then(toJson<Audit>);
}

export function deleteAudit(
  projectId: string | number,
  auditId: string,
): Promise<DeleteResult> {
  return client
    .delete(`${base(projectId)}/${auditId}`)
    .then(toJson<DeleteResult>);
}

export function cancelAudit(
  projectId: string | number,
  auditId: string,
): Promise<Audit> {
  return client
    .post(`${base(projectId)}/${auditId}/cancel`, {})
    .then(toJson<Audit>);
}

/** Creates a new audit from the original's config; the original is untouched. */
export function rerunAudit(
  projectId: string | number,
  auditId: string,
): Promise<Audit> {
  return client
    .post(`${base(projectId)}/${auditId}/rerun`, {})
    .then(toJson<Audit>);
}

/** 409 until the audit is ready. */
export function getReport(
  projectId: string | number,
  auditId: string,
): Promise<Report> {
  return client
    .get(`${base(projectId)}/${auditId}/report`)
    .then(toJson<Report>);
}

/** Short-lived presigned URL; 404 unless `Audit.artifacts[kind]` is true. */
export function getArtifactLink(
  projectId: string | number,
  auditId: string,
  kind: ArtifactKind,
): Promise<ArtifactLink> {
  return client
    .get(`${base(projectId)}/${auditId}/artifacts/${kind}`)
    .then(toJson<ArtifactLink>);
}

/** HTTP status of a failed call (the client throws `Error` with the Response as `cause`). */
export function errorStatus(error: unknown): number | undefined {
  const cause = (error as { cause?: unknown } | null)?.cause;
  return cause instanceof Response ? cause.status : undefined;
}
