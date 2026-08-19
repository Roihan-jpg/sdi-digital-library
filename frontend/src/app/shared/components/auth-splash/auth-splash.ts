import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'sdi-auth-splash',
  imports: [NgOptimizedImage],
  templateUrl: './auth-splash.html',
  styleUrl: './auth-splash.css',
  host: {
    role: 'status',
    'aria-live': 'polite',
    'aria-label': 'Menyiapkan SDI Digital Library',
  },
})
export class AuthSplash {}
