import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, it } from 'node:test';
import express from 'express';
import type { Server } from 'node:http';
import { errorHandler } from '../../common/middleware/error-handler.js';
import { AppError } from '../../common/errors/app-error.js';
import type { AuthContext, AuthServicePort } from '../auth/auth.types.js';
import { createDigitalLibraryRouter, type DigitalLibraryServicePort } from './digital-library.routes.js';

const userId = '00000000-0000-4000-8000-000000000001';
function context(role: AuthContext['profile']['role']): AuthContext { return { accessToken: role, user: { id: userId, email: `${role}@example.test` }, profile: { id: userId, role, fullName: role, avatarPath: null, isActive: true }, member: null }; }
const auth: AuthServicePort = { async authenticate(token) { if (!['guest','member','librarian'].includes(token)) throw new AppError(401,'INVALID','Sesi tidak valid.'); return context(token as AuthContext['profile']['role']); }, async logout() {} };
let server: Server | undefined;
afterEach(() => server?.close());
function api(service: DigitalLibraryServicePort) { const app=express();app.use(express.json());app.use('/api/digital-library',createDigitalLibraryRouter(auth,service));app.use(errorHandler({ warn(){},error(){} } as never));server=app.listen(0);const port=(server.address() as AddressInfo).port;return `http://127.0.0.1:${port}/api/digital-library`; }
function service(): DigitalLibraryServicePort { return { async listPublic(){return{items:[],total:0}},async getPublic(){throw new AppError(404,'DIGITAL_COLLECTION_NOT_FOUND','Koleksi digital tidak ditemukan.')},async listManagement(){return[]},async create(_c,input){return{id:'created',title:input.title}},async update(){return{}},async remove(){},async access(c,_id,action){return{role:c.profile.role,action,url:'signed'}} }; }
describe('digital library HTTP access',()=>{
  it('keeps unpublished metadata unavailable and full access authenticated',async()=>{const base=api(service());const detail=await fetch(`${base}/belum-terbit`);assert.equal(detail.status,404);const anonymous=await fetch(`${base}/${userId}/access`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'view'})});assert.equal(anonymous.status,401);for(const role of ['guest','member']){const response=await fetch(`${base}/${userId}/access`,{method:'POST',headers:{authorization:`Bearer ${role}`,'content-type':'application/json'},body:JSON.stringify({action:'view'})});assert.equal(response.status,200);const payload = await response.json() as { data: { role: string } };assert.equal(payload.data.role,role);}});
  it('allows staff upload and rejects guest upload',async()=>{const base=api(service());const body=()=>{const value=new FormData();value.set('title','Modul Matematika');value.set('slug','modul-matematika');value.set('mediaType','module');value.set('isDownloadable','true');value.set('isPublished','false');value.set('file',new Blob(['%PDF'],{type:'application/pdf'}),'modul.pdf');return value;};const guest=await fetch(base,{method:'POST',headers:{authorization:'Bearer guest'},body:body()});assert.equal(guest.status,403);const staff=await fetch(base,{method:'POST',headers:{authorization:'Bearer librarian'},body:body()});assert.equal(staff.status,201);});
});
