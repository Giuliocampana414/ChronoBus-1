import { writable } from 'svelte/store';

// Usa una variabile per salvare la lingua di default
let savedLanguage = 'en';

// Controlla se siamo nel browser prima di accedere a localStorage
if (typeof window !== 'undefined') {
  savedLanguage = localStorage.getItem('language') || 'en';
}

export const language = writable(savedLanguage);

// Iscriviti allo store e salva la lingua in localStorage (solo nel browser)
if (typeof window !== 'undefined') {
  language.subscribe((value) => {
    localStorage.setItem('language', value);
  });
}
