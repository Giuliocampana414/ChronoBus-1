<script>
  import { onMount } from 'svelte';
  import { successAlert, errorAlert } from '$lib/stores/alert';
  import { goto } from '$app/navigation';
  import { language } from '$lib/stores/languageStore';
  import { translations } from '$lib/i18n';
  import { page } from '$app/state';

    let currentLang = $state('en'); // Imposta la lingua di default
    let loading = $state(true);
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
        

  // Funzione che gestisce la conferma dell'email
  async function confirmEmail() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');  // Ottieni il token dalla query string

  if (!token) {
    return errorAlert('Token is missing.');
  }

  try {
    const res = await fetch(`/API/v2/session/confirm-email?token=${token}`, {
      method: 'GET',
    });
    const data = await res.json();

    if (res.ok) {
      // Se la conferma ha avuto successo, informa l'utente
      successAlert(data.message || translations[currentLang].emailConfirmed);
      // Reindirizza l'utente alla dashboard o alla pagina di login
      goto('/dashboard');
    } else {
      errorAlert(data.error || translations[currentLang].emailConfirmationFailed);
    }
  } catch (e) {
    errorAlert(translations[currentLang].networkError);
  }
}
  // Esegui la conferma al montaggio della pagina
  onMount(() => {
    confirmEmail();
  });
   
</script>
<div class="flex items-center justify-center h-full bg-gray-100">
  <div class="bg-white p-8 rounded shadow-md w-full max-w-md">
<a class:dock-active={page.url.pathname === '/validation-email'} href="/validation-email" aria-label="Validation Email"></a>
    <h2 class="text-center mb-8 text-[#1a274d] font-semibold tracking-[2px]">Email Confirmation</h2>
    {#if loading}
      <p class="text-center text-[#1a274d]">Processing your email confirmation...</p>
    {:else}
      <p class="text-center text-[#1a274d]">Your email has been successfully confirmed! You can now log in.</p>
    {/if}
  </div>
</div>
