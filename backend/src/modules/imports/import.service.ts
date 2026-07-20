import ExcelJS from 'exceljs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../common/errors/app-error.js';
import type { AppConfig } from '../../config/env.js';
import { createAdminSupabaseClient } from '../../infrastructure/supabase/supabase-admin.client.js';
import type { AuthContext } from '../auth/auth.types.js';

export type ImportKind = 'members' | 'books';
const memberHeaders = ['member_code','nis','nisn','full_name','gender','class','study_group','student_card_number','library_card_number','is_active'] as const;
const bookHeaders = ['inventory_code','title','category','author','publisher','publication_year','isbn','shelf','condition','replacement_cost','status'] as const;

export class ImportService {
  private readonly admin: SupabaseClient;
  constructor(config: AppConfig) { this.admin = createAdminSupabaseClient(config); }

  async template(kind: ImportKind): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet(kind === 'members' ? 'Members' : 'Books');
    const headers = kind === 'members' ? memberHeaders : bookHeaders; sheet.addRow([...headers]);
    sheet.addRow(kind === 'members' ? ['M-0001','12345','0012345678','Nama Siswa','male','Kelas 1','1A','KP-0001','KARTU-0001',true] : ['INV-0001','Judul Buku','Fiksi','Nama Pengarang','Penerbit Sekolah',2024,'9780000000001','A-01','good',50000,'available']);
    sheet.getRow(1).font = { bold: true }; sheet.views = [{ state:'frozen', ySplit:1 }]; sheet.columns.forEach((column)=>{column.width=22;});
    const buffer = await workbook.xlsx.writeBuffer(); return Buffer.from(buffer);
  }

  async run(context: AuthContext, kind: ImportKind, file: Express.Multer.File) {
    const rows = await readRows(file, kind); const { data: job, error: jobError } = await this.admin.from('import_jobs').insert({ import_type: kind, file_name: file.originalname, status:'processing', total_rows: rows.length, requested_by: context.user.id, started_at:new Date().toISOString() }).select().single();
    if (jobError || !job) throw new AppError(503,'IMPORT_JOB_FAILED','Pekerjaan import tidak dapat dibuat.');
    const duplicates = findFileDuplicates(rows, kind); let success=0; const errors: Record<string,unknown>[]=[];
    for (const row of rows) { const duplicate = duplicates.get(row.rowNumber); if (duplicate) { errors.push(importError(job.id,row,duplicate)); continue; }
      try { if (kind === 'members') await this.insertMember(context,row); else await this.insertBook(context,row); success += 1; }
      catch (error) { errors.push(importError(job.id,row,error instanceof AppError ? error.message : 'Data baris tidak dapat disimpan.')); }
    }
    if(errors.length) await this.admin.from('import_errors').insert(errors);
    const { data: updated, error } = await this.admin.from('import_jobs').update({ status: errors.length ? (success ? 'completed_with_errors':'failed') : 'completed', success_rows:success, failed_rows:errors.length, finished_at:new Date().toISOString(), summary:{ headers: kind === 'members' ? memberHeaders : bookHeaders } }).eq('id',job.id).select().single();
    if(error) throw new AppError(503,'IMPORT_FINALIZE_FAILED','Hasil import tersimpan tetapi ringkasan belum dapat diperbarui.'); return updated;
  }

  async list() { const {data,error}=await this.admin.from('import_jobs').select('*').order('created_at',{ascending:false}).limit(50); if(error) throw new AppError(503,'IMPORT_LIST_FAILED','Riwayat import belum dapat dimuat.'); return data??[]; }
  async errors(jobId:string) { const {data,error}=await this.admin.from('import_errors').select('row_number,raw_data,error_code,error_message').eq('import_job_id',jobId).order('row_number'); if(error) throw new AppError(503,'IMPORT_ERRORS_FAILED','Detail error import belum dapat dimuat.'); return data??[]; }
  async errorCsv(jobId:string) { const rows=await this.errors(jobId); const lines=['row_number,error_code,error_message,raw_data',...rows.map((row)=>[row.row_number,row.error_code,row.error_message,JSON.stringify(row.raw_data)].map(csvCell).join(','))]; return lines.join('\r\n'); }

  private async insertMember(context:AuthContext,row:ParsedRow) { const v=row.data; const required=['member_code','full_name','library_card_number']; requireValues(v,required); const isStudent=Boolean(v['nis']||v['nisn']||v['student_card_number']); let classId:null|string=null,groupId:null|string=null; if(isStudent){requireValues(v,['nis','nisn','class','study_group','student_card_number']); const {data:klass}=await this.admin.from('classes').select('id').ilike('name',String(v['class'])).eq('is_active',true).limit(1).maybeSingle(); if(!klass) throw new AppError(422,'IMPORT_CLASS_NOT_FOUND','Kelas tidak ditemukan.'); classId=klass.id; const {data:group}=await this.admin.from('study_groups').select('id').eq('class_id',classId).ilike('name',String(v['study_group'])).limit(1).maybeSingle(); if(!group) throw new AppError(422,'IMPORT_GROUP_NOT_FOUND','Rombongan belajar tidak ditemukan.'); groupId=group.id; }
    const {error}=await this.admin.from('members').insert({member_code:text(v['member_code']),nis:nullable(v['nis']),nisn:nullable(v['nisn']),full_name:text(v['full_name']),gender:enumValue(v['gender'],['male','female','unknown'],'unknown'),class_id:classId,study_group_id:groupId,student_card_number:nullable(v['student_card_number']),card_number:text(v['library_card_number']),is_student:isStudent,is_active:booleanValue(v['is_active']),created_by:context.user.id}); if(error) throw dbImportError(error.code); }
  private async insertBook(context:AuthContext,row:ParsedRow) { const v=row.data; requireValues(v,['inventory_code','title','category','author','publisher','shelf']); const normalized={...v,condition:enumValue(v['condition'],['new','good','fair','damaged','lost'],'good'),status:enumValue(v['status'],['available','reserved','loaned','damaged','lost','maintenance','inactive'],'available')}; const {error}=await this.admin.rpc('import_book_row',{p_row:normalized,p_created_by:context.user.id});if(error)throw dbImportError(error.code); }
}

interface ParsedRow { rowNumber:number; data:Record<string,unknown> }
async function readRows(file:Express.Multer.File,kind:ImportKind):Promise<ParsedRow[]>{const workbook=new ExcelJS.Workbook(); if(file.originalname.toLowerCase().endsWith('.csv')) await workbook.csv.read(bufferStream(file.buffer)); else await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer); const sheet=workbook.worksheets[0]; if(!sheet)throw new AppError(400,'IMPORT_EMPTY','File tidak memiliki worksheet.'); const expected=kind==='members'?memberHeaders:bookHeaders; const actual=(sheet.getRow(1).values as unknown[]).slice(1).map((v)=>text(v).toLowerCase()); const missing=expected.filter((h)=>!actual.includes(h)); if(missing.length)throw new AppError(400,'IMPORT_HEADERS_INVALID',`Header wajib tidak ditemukan: ${missing.join(', ')}.`); const rows:ParsedRow[]=[]; sheet.eachRow((row,rowNumber)=>{if(rowNumber===1)return;const data:Record<string,unknown>={}; expected.forEach((header)=>{const index=actual.indexOf(header);data[header]=cellValue(row.getCell(index+1).value);});if(Object.values(data).some((v)=>v!==null&&v!==''))rows.push({rowNumber,data});});return rows;}
function bufferStream(buffer:Buffer){const {Readable}=requireReadable();return Readable.from(buffer);}
function requireReadable():typeof import('node:stream'){return process.getBuiltinModule('node:stream') as typeof import('node:stream');}
function cellValue(value:ExcelJS.CellValue):unknown { if(value&&typeof value==='object'&&'text'in value)return value.text;if(value&&typeof value==='object'&&'result'in value)return value.result;return value??null; }
export function findFileDuplicates(rows:ParsedRow[],kind:ImportKind){const keys=kind==='members'?['member_code','nis','nisn','student_card_number','library_card_number']:['inventory_code'];const seen=new Map<string,number>();const result=new Map<number,string>();for(const row of rows)for(const key of keys){const value=nullable(row.data[key]);if(!value)continue;const normalized=`${key}:${value.toLowerCase()}`;if(seen.has(normalized))result.set(row.rowNumber,`${key} duplikat di dalam file (baris ${seen.get(normalized)}).`);else seen.set(normalized,row.rowNumber);}return result;}
function importError(jobId:string,row:ParsedRow,message:string){return{import_job_id:jobId,row_number:row.rowNumber,raw_data:row.data,error_code:'ROW_INVALID',error_message:message};}
function dbImportError(code?:string){return new AppError(code==='23505'?409:422,'IMPORT_ROW_FAILED',code==='23505'?'Data unik sudah digunakan pada database.':'Baris tidak dapat disimpan.');}
function requireValues(data:Record<string,unknown>,keys:string[]){const missing=keys.filter((key)=>!nullable(data[key]));if(missing.length)throw new AppError(422,'IMPORT_REQUIRED',`Kolom wajib kosong: ${missing.join(', ')}.`);}
function text(value:unknown){return String(value??'').trim();} function nullable(value:unknown){const v=text(value);return v||null;} function numberValue(value:unknown){const n=Number(value);return Number.isFinite(n)&&text(value)!==''?n:null;} function booleanValue(value:unknown){return ['true','1','ya','aktif'].includes(text(value).toLowerCase());} function enumValue<T extends string>(value:unknown,values:readonly T[],fallback:T){const v=text(value) as T;return values.includes(v)?v:fallback;} function csvCell(value:unknown){return `"${String(value??'').replaceAll('"','""')}"`;}
