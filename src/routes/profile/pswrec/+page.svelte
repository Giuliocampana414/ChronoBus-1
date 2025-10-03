<script>
  import { successAlert, errorAlert } from '$lib/stores/alert';
  import { goto } from '$app/navigation';
  import { isAdmin } from '$lib/stores/admin';
  import { language } from '$lib/stores/languageStore'; 
  import { translations } from '$lib/i18n'; 

  let email = $state('');
  
  let currentLang = $state('en'); // Imposta la lingua di default

  // Subscribe to language store
  $effect(() => {
    const unsubscribe = language.subscribe(lang => {
      currentLang = lang;
    });
    
    return () => {
      unsubscribe();
    };
  });

  // Funzione per il recupero password
  async function pswrec() {
    try {
      const res = await fetch('/API/v2/session/pswrec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (res.ok) {
        successAlert(data.message || translations[currentLang].password_reset_sent);
        isAdmin.set(data.isAdmin || false);
        goto('/profile/pswrec/modulepswrec');
      } else {
        errorAlert(data.error || translations[currentLang].password_reset_failed);
      }
    } catch (err) {
      errorAlert(translations[currentLang].network_error);
    }
  }	
</script>

<div class="min-h-screen grid place-items-center">
  <div class="bg-white max-w-[340px] p-9 px-7 rounded-[10px] shadow-[0_2px_12px_rgba(60,80,120,0.12)]">
    <h2 class="text-center mb-8 text-[#1a274d] font-semibold tracking-[2px]">
      {translations[currentLang].forgot_password}
    </h2>
    <form onsubmit={pswrec} class="flex flex-col gap-4">
      <div class="grid gap-4">
        <label for="username" class="mb-1 text-[#1a274d] text-[15px] font-medium">
          {translations[currentLang].email}
        </label>
        <input
          id="username"
          type="email"
          bind:value={email}
          required
          autocomplete="username"
          class="py-2.5 px-3 border border-[#1a274d] rounded-lg text-base outline-none transition-colors duration-200 text-black focus:border-black"
        />
      </div>
      <button
        type="submit"
        value="pswrec"
        class="mt-4 bg-[#1a274d] text-white font-semibold py-2 rounded-lg transition-colors hover:bg-[#273869]">
        {translations[currentLang].reset_password}
      </button>
    </form>
  </div>
</div>
