import assert from 'node:assert/strict';import test from 'node:test';import { memberInputSchema } from './member.schema.js';
const base={memberCode:'M-001',libraryCardNumber:'LIB-001',isStudent:true,fullName:'Siti Aminah',gender:'female' as const,isActive:true};
test('student identity fields are mandatory',()=>{const result=memberInputSchema.safeParse(base);assert.equal(result.success,false);if(!result.success)assert.deepEqual(new Set(result.error.issues.map((issue)=>issue.path[0])),new Set(['nis','nisn','studentCardNumber','classId','studyGroupId']));});
test('non-student does not require school identity',()=>{assert.equal(memberInputSchema.safeParse({...base,isStudent:false}).success,true);});
