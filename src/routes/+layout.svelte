<script>
  import { language } from '$lib/stores/languageStore'; 
  import { translations } from '$lib/i18n'; 
  import { page } from '$app/state';
  import { alert } from '$lib/stores/alert';
  import { isAdmin } from '$lib/stores/admin';
  import { onMount } from 'svelte';
  import '../app.css';
  import {
    TriangleAlert,
    LayoutDashboard,
    User,
    ChartLine,
    MailWarning,
    Bolt,
	  Calendar,
  } from '@lucide/svelte';

  let { children } = $props();
  let currentLang = $state('en'); // Imposta la lingua di default

  // Usa $effect per reattività con lo store 'language'
  $effect(() => {
    const unsubscribe = language.subscribe(lang => {
      currentLang = lang;
    });
    
    // Cleanup quando il componente viene distrutto
    return () => {
      unsubscribe();
    };
  });

  function decodeJwt(token) {
    try {
      const [, payloadBase64] = token.split('.');
      const payloadJson = atob(payloadBase64);
      return JSON.parse(payloadJson);
    } catch {
      return null;
    }
  }

  onMount(() => {
    const token = localStorage.getItem('token');
    isAdmin.set(token ? decodeJwt(token).isAdmin || false : false);
  });
</script>

{#if $alert}
  <div class="absolute bottom-16 z-10000 w-full p-2">
    <div role="alert" class="alert w-full {$alert.class}">
      <span>{$alert.text || translations[currentLang].alert_message}</span>
    </div>
  </div>
{/if}

<div class="relative" style="height: calc(100dvh - 4rem)">
  {@render children()}
</div>

<div class="dock dock-md">
  <a class:dock-active={page.url.pathname === '/dashboard'} href="/dashboard">
    <LayoutDashboard />
    <span class="dock-label">{translations[currentLang].dashboard}</span>
  </a>

  <a class:dock-active={page.url.pathname === '/profile'} href="/profile">
    <User />
    <span class="dock-label">{translations[currentLang].profile}</span>
  </a>

  <a class:dock-active={page.url.pathname === '/rush-hours'} href="/rush-hours">
    <ChartLine />
    <span class="dock-label">{translations[currentLang].rush_hours}</span>
  </a>

  <a class:dock-active={page.url.pathname === '/report'} href="/report">
    <MailWarning />
    <span class="dock-label">{translations[currentLang].report}</span>
  </a>
  
  <a class:dock-active={page.url.pathname === '/calendar'} href="/calendar">
    <Calendar />
    <span class="dock-label">{translations[currentLang].calendar}</span>
  </a>

  {#if $isAdmin}
    <a class:dock-active={page.url.pathname === '/admin'} href="/admin">
      <Bolt />
      <span class="dock-label">{translations[currentLang].admin}</span>
    </a>
  {/if}
</div>
