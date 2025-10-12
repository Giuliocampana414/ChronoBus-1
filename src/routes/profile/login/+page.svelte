<script>
  import { language } from '$lib/stores/languageStore'; 
  import { translations } from '$lib/i18n'; 
  import { successAlert, errorAlert } from '$lib/stores/alert';
  import { goto } from '$app/navigation';
  import { isAdmin } from '$lib/stores/admin';
  import { onMount } from 'svelte';
  import { GOOGLE_CLIENT_ID } from '$env/static/public';

  let email = $state('');
  let password = $state('');
  let isGoogleInitialized = $state(false);
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

  async function register() {
    try {
      const res = await fetch('/API/v2/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        email = '';
        password = '';
        localStorage.setItem('token', data.token);
        successAlert(data.message || translations[currentLang].registrationSuccess);
        goto('/dashboard');
      } else if (data.error && data.error.toLowerCase().includes('registrata')) {
        errorAlert(translations[currentLang].emailRegisteredError);
      } else {
        errorAlert(data.error || translations[currentLang].backendError);
      }
    } catch (e) {
      errorAlert(translations[currentLang].networkError);
    }
  }

  async function login() {
    try {
      const res = await fetch('/API/v2/session/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        successAlert(data.message || translations[currentLang].loginSuccess);
        isAdmin.set(data.isAdmin || false);
        localStorage.setItem('token', data.token);
        goto('/dashboard');
      } else {
        errorAlert(data.error || translations[currentLang].loginFailed);
      }
    } catch (err) {
      errorAlert(translations[currentLang].networkError);
    }
  }

  function isGoogleReady() {
    return typeof window !== 'undefined' && window.google?.accounts?.id;
  }

  onMount(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse
        });
        window.google.accounts.id.disableAutoSelect();
        isGoogleInitialized = true;
      }
    };
    document.head.appendChild(script);
  });

  async function handleGoogleCredentialResponse(response) {
    const idToken = response.credential;
    try {
      const res = await fetch('/API/v2/session/loginwithGoogle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        successAlert(data.message || translations[currentLang].googleAuthSuccess);
        isAdmin.set(data.isAdmin || false);
        goto('/dashboard');
      } else {
        errorAlert(data.error || translations[currentLang].googleAuthError);
      }
    } catch (err) {
      errorAlert(translations[currentLang].googleNetworkError);
    }
  }

  async function choice(event) {
    event.preventDefault();
    const buttonValue = event.submitter?.value;
    if (buttonValue == 'signin') {
      await login();
    } else if (buttonValue == 'signup') {
      await register();
    }
  }

  async function continuegoogle(event) {
    event.preventDefault(); // evita il reload della pagina
    if (window.google?.accounts?.id) {
      if (!isGoogleInitialized) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          ux_mode: 'popup'
        });
        isGoogleInitialized = true;
      }
      window.google.accounts.id.prompt(notification => {
        if (notification.isNotDisplayed()) {
          console.warn('Google Sign-In not displayed:', notification.getNotDisplayedReason());
          errorAlert(translations[currentLang].googleSignInNotDisplayed);
        }

        if (notification.isSkippedMoment()) {
          console.warn('Google Sign-In was skipped:', notification.getSkippedReason());
        }

        if (notification.isDismissedMoment()) {
          console.warn('Google Sign-In was dismissed');
        }
      });
    } else {
      errorAlert(translations[currentLang].googleSdkNotInitialized);
    }
  }
</script>

<div class="min-h-screen grid place-items-center">
  <div class="bg-white max-w-[340px] p-9 px-7 rounded-[10px] shadow-[0_2px_12px_rgba(60,80,120,0.12)]">
    <h2 class="text-center mb-8 text-[#1a274d] font-semibold tracking-[2px]">{translations[currentLang].authTitle}</h2>
    <form onsubmit={choice} class="flex flex-col gap-4">
      <div class="grid gap-4">
        <label for="username" class="mb-1 text-[#1a274d] text-[15px] font-medium">{translations[currentLang].emailLabel}</label>
        <input
          id="username"
          type="email"
          bind:value={email}
          required
          autocomplete="username"
          class="py-2.5 px-3 border border-[#1a274d] rounded-lg text-base outline-none transition-colors duration-200 text-black focus:border-black"
        />
        <label for="password" class="mb-1 text-[#1a274d] text-[15px] font-medium">{translations[currentLang].passwordLabel}</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          autocomplete="new-password"
          class="py-2.5 px-3 border border-[#1a274d] rounded-lg text-base outline-none transition-colors duration-200 text-black focus:border-black"
        />
      </div>
      <div class="flex gap-3 mt-4">
        <button type="submit" value="signin" class="flex-1 bg-[#1a274d] text-white font-semibold py-2 rounded-lg transition-colors hover:bg-[#273869]">
          {translations[currentLang].signin}
        </button>
        <button type="submit" value="signup" class="flex-1 bg-gray-200 text-[#1a274d] font-semibold py-2 rounded-lg border border-[#1a274d] transition-colors hover:bg-gray-300">
          {translations[currentLang].signup}
        </button>
      </div>
    </form>
    <form onsubmit={continuegoogle} class="flex flex-col gap-4">
      <div class="mt-4">
        <button
          type="submit"
          value="continuewithgoogle"
          name="intent"
          class="w-full flex items-center justify-center text-[#1a274d] gap-3 px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition text-sm font-medium"
          disabled={!isGoogleInitialized}
        >
          <img
            src="https://auth-cdn.oaistatic.com/assets/google-logo-NePEveMl.svg"
            width="18"
            height="18"
            alt="Google logo"
          />
          {translations[currentLang].googleContinue}
        </button>
      </div>
    </form>
  </div>
</div>
