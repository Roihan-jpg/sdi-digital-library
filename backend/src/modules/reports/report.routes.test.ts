import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, it } from 'node:test';
import express from 'express';
import { errorHandler } from '../../common/middleware/error-handler.js';
import { AppError } from '../../common/errors/app-error.js';
import type { AuthContext, AuthServicePort } from '../auth/auth.types.js';
import { createReportRouter, type ReportServicePort } from './report.routes.js';

const id = '10000000-0000-4000-8000-000000000001';
function context(role: AuthContext['profile']['role']): AuthContext { return { accessToken: role, user: { id, email: null }, profile: { id, role, fullName: role, avatarPath: null, isActive: true }, member: null }; }
const auth: AuthServicePort = { async authenticate(token) { if (!['master_admin','head_librarian','librarian','member'].includes(token)) throw new AppError(401,'INVALID','Sesi tidak valid.'); return context(token as AuthContext['profile']['role']); }, async logout() {} };
const school = { schoolName: 'SDI', schoolAddress: null, schoolPhone: null, schoolEmail: null, schoolLogoPath: null };
const service: ReportServicePort = { async dashboard(){return{kpis:{}}},async schoolIdentity(){return school},async updateSchoolIdentity(){return school},async report(kind,filters){return{kind,title:'Laporan',columns:[],rows:[],summary:{},filters}},async export(){return{buffer:Buffer.from('%PDF-test'),fileName:'report.pdf',mimeType:'application/pdf'}} };
let server: Server | undefined; afterEach(() => server?.close());
function base(){const app=express();app.use(express.json());app.use('/api/reports',createReportRouter(auth,service));app.use(errorHandler({warn(){},error(){}} as never));server=app.listen(0);return `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/reports`;}

describe('report HTTP authorization',()=>{
  it('allows management roles and blocks members',async()=>{const url=base();const head=await fetch(`${url}/dashboard`,{headers:{authorization:'Bearer head_librarian'}});assert.equal(head.status,200);const member=await fetch(`${url}/dashboard`,{headers:{authorization:'Bearer member'}});assert.equal(member.status,403);});
  it('keeps school configuration exclusive to master admin while allowing head export',async()=>{const url=base();const forbidden=await fetch(`${url}/settings/school`,{headers:{authorization:'Bearer librarian'}});assert.equal(forbidden.status,403);const master=await fetch(`${url}/settings/school`,{headers:{authorization:'Bearer master_admin'}});assert.equal(master.status,200);const exported=await fetch(`${url}/inventory/export?format=pdf&from=2026-07-01&to=2026-07-31`,{headers:{authorization:'Bearer head_librarian'}});assert.equal(exported.status,200);assert.match(exported.headers.get('content-disposition')??'',/report\.pdf/);});
});
