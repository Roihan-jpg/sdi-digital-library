import assert from 'node:assert/strict';import test from 'node:test';import { inventoryPayload } from './catalog.service.js';
test('barcode and QR payload is exactly inventory_code',()=>{assert.equal(inventoryPayload('INV-SDI/2026-001'),'INV-SDI/2026-001');});
