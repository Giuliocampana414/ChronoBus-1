<script>
  import { goto } from '$app/navigation';
  import { isAdmin } from '$lib/stores/admin';
  import { successAlert, errorAlert } from '$lib/stores/alert';
  import { onMount } from 'svelte';
  import { language } from '$lib/stores/languageStore'; 
  import { translations } from '$lib/i18n'; 
  
  let token = $state();
  let isAuthenticated = $state(false);
  let currentLang = $state('en'); // Imposta la lingua di default
  
  onMount(() => {
    try {
      token = localStorage.getItem('token');
      isAuthenticated = !!token;
    } catch (e) {
      console.error('Errore nel recupero del token:', e);
    }
  });

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

  // Funzione per cambiare la lingua
  function changeLanguage(event) {
    const selectedLanguage = event.target.value;
    language.set(selectedLanguage);  
  }

  function gotologin() {
    goto('/profile/login');
  }

  function gotochangePsw() {
    if (token) {
      goto('/profile/changePsw');
    }
  }

  function gotopswrec() {
    if (!token) {
      goto('/profile/pswrec');
    }
  }

  function logout() {
    if (token) {
      successAlert(translations[currentLang].logout_success);  
      localStorage.removeItem('token');
      isAdmin.set(false);
      goto('/profile/login');
    } else {
      errorAlert(translations[currentLang].logout_failed);  
    }
  }

  // Funzione per eliminare account
  async function deleteAccount() {
    const conferma = confirm(translations[currentLang].delete_account_confirm);  
    if (!conferma) return;

    const token = localStorage.getItem('token');
    if (!token) {
      errorAlert(translations[currentLang].not_authenticated);  
      return;
    }

    try {
      const res = await fetch('/API/v2/users/delete', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        successAlert(data.message || translations[currentLang].account_deleted_success);  
        localStorage.removeItem('token');
        isAuthenticated = false;
        goto('/profile/login');
      } else {
        errorAlert(data.error || translations[currentLang].error_deleting_account);  
      }
    } catch (err) {
      console.error(err);
      errorAlert(translations[currentLang].network_error);  
    }
  }
</script>

<h2 class="p-2 text-2xl font-semibold text-white">{translations[currentLang].profile}</h2>

<div class="flex flex-col gap-2 p-2">
  <div class="flex gap-2">
    <button 
      onclick={gotologin}
      class="flex-1 bg-gray-200 text-[#1a274d] font-semibold py-2 rounded-lg border border-[#1a274d] transition-colors hover:bg-gray-300">
      {translations[currentLang].login} 
    </button>
    {#if token}
      <button
        onclick={logout}
        class="flex-1 bg-gray-200 text-[#1a274d] font-semibold py-2 rounded-lg border border-[#1a274d] transition-colors hover:bg-gray-300">
        {translations[currentLang].logout}  
      </button>
    {/if}
    {#if !token}
      <button
        onclick={gotopswrec}
        class="flex-1 bg-gray-200 text-[#1a274d] font-semibold py-2 rounded-lg border border-[#1a274d] transition-colors hover:bg-gray-300">
        {translations[currentLang].forgot_password}  
      </button>
    {/if}
  </div>
  {#if token}
    <button
      onclick={gotochangePsw}
      class="w-full bg-gray-200 text-[#1a274d] font-semibold py-2 rounded-lg border border-[#1a274d] transition-colors hover:bg-gray-300">
      {translations[currentLang].change_password}  
    </button>
  {/if}
  {#if isAuthenticated}
    <button
      onclick={deleteAccount}
      class="w-full bg-red-200 text-[#1a274d] font-semibold py-2 rounded-lg border border-[#1a274d] transition-colors hover:bg-black-300">
      {translations[currentLang].delete_account}  
    </button>
  {/if}
  <div class="language-dropdown">
    <label for="language-select" class="sr-only">{translations[currentLang].select_language}</label>
    <select id="language-select" onchange={changeLanguage} bind:value={$language} class="language-selector">
      <option value="en">{translations[currentLang].english}</option>
      <option value="it">{translations[currentLang].italian}</option>
    </select>
  </div>
</div>